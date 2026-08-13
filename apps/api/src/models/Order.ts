import mongoose from 'mongoose';
const lineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm' },
    name: String,
    quantity: { type: Number, min: 0.01 },
    unit: String,
    unitPrice: Number,
    lineTotal: Number,
  },
  { _id: false },
);
const fulfillmentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm' },
    lines: [lineSchema],
    subtotal: Number,
    deliveryFee: Number,
    total: Number,
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'picking',
        'packed',
        'out_for_delivery',
        'ready_for_pickup',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
    },
    fulfillmentMethod: {
      type: String,
      enum: ['local_delivery', 'pickup', 'intercity'],
      default: 'local_delivery',
    },
    payoutStatus: {
      type: String,
      enum: ['not_due', 'pending', 'paid', 'held'],
      default: 'not_due',
    },
    commissionAmount: { type: Number, default: 0 },
    farmerNet: { type: Number, default: 0 },
    sellerOrigin: { lat: Number, lng: Number },
    distanceKm: Number,
    timeline: [{ status: String, at: Date, note: String }],
  },
  { _id: true },
);
const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestCustomer: { name: String, phone: String, email: String },
    lines: [lineSchema],
    fulfillments: [fulfillmentSchema],
    subtotal: Number,
    deliveryFee: Number,
    total: Number,
    paymentMethod: { type: String, enum: ['cod', 'esewa', 'khalti', 'fonepay', 'card'] },
    paymentStatus: { type: String, default: 'pending' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'partially_fulfilled', 'fulfilled', 'cancelled', 'returned'],
      default: 'pending',
    },
    deliveryAddress: {
      province: String,
      district: String,
      municipality: String,
      ward: String,
      street: String,
      phone: String,
      lat: Number,
      lng: Number,
    },
    timeline: [{ status: String, at: Date, note: String }],
  },
  { timestamps: true },
);
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ 'fulfillments.tenantId': 1, createdAt: -1 });
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
