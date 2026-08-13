import mongoose from 'mongoose';

const geoPoint = {
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], default: [85.324, 27.7172] },
};
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    province: String,
    district: String,
    municipality: String,
    ward: String,
    street: String,
    phone: String,
    geo: { lat: Number, lng: Number },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['customer', 'farmer', 'vendor', 'delivery', 'province_admin', 'admin'],
      default: 'customer',
      index: true,
    },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    province: String,
    district: String,
    municipality: String,
    ward: String,
    geo: geoPoint,
    addresses: [addressSchema],
    wishlist: { type: [String], default: [] },
    rewardPoints: { type: Number, default: 0, min: 0 },
    walletBalance: { type: Number, default: 0, min: 0 },
    language: { type: String, enum: ['en', 'ne'], default: 'en' },
    marketingOptIn: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
);
userSchema.index({ geo: '2dsphere' });

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ownerName: String,
    phone: String,
    type: {
      type: String,
      enum: ['farmer', 'cooperative', 'producer', 'collection_hub', 'vendor'],
      default: 'farmer',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'suspended'],
      default: 'pending',
      index: true,
    },
    plan: {
      type: String,
      enum: ['starter', 'grow', 'cooperative', 'enterprise'],
      default: 'starter',
    },
    branding: { logo: String, cover: String, accent: String },
    location: {
      province: String,
      district: String,
      municipality: String,
      ward: String,
      address: String,
      geo: geoPoint,
    },
    delivery: {
      radiusKm: { type: Number, default: 35, min: 0, max: 1000 },
      pickup: { type: Boolean, default: true },
      localDelivery: { type: Boolean, default: true },
      nationwide: { type: Boolean, default: false },
    },
    specialties: [String],
    commissionRate: { type: Number, default: 6, min: 0, max: 100 },
    payoutStatus: {
      type: String,
      enum: ['not_configured', 'pending', 'verified'],
      default: 'not_configured',
    },
    verifiedAt: Date,
  },
  { timestamps: true },
);
tenantSchema.index({ 'location.geo': '2dsphere' });

const farmSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    story: String,
    productionTypes: [String],
    certifications: [
      {
        name: String,
        issuer: String,
        validUntil: Date,
        documentUrl: String,
        verified: { type: Boolean, default: false },
      },
    ],
    location: {
      province: String,
      district: String,
      municipality: String,
      ward: String,
      address: String,
      geo: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },
    serviceRadiusKm: { type: Number, default: 35 },
    pickup: { type: Boolean, default: true },
    sameDay: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
farmSchema.index({ 'location.geo': '2dsphere' });
farmSchema.index({ tenantId: 1, verificationStatus: 1 });

const tierSchema = new mongoose.Schema(
  { minQty: Number, price: Number, label: String },
  { _id: false },
);
const productSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', index: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, index: true },
    province: { type: String, index: true },
    district: String,
    municipality: String,
    origin: geoPoint,
    unit: String,
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    minimumOrder: { type: Number, default: 1, min: 0 },
    priceTiers: [tierSchema],
    organic: Boolean,
    grade: String,
    harvestDate: Date,
    bestBefore: Date,
    harvestWindow: String,
    uniqueStory: String,
    shortDescription: String,
    description: String,
    images: [String],
    image: String,
    saleChannels: {
      retail: { type: Boolean, default: true },
      wholesale: { type: Boolean, default: false },
      subscription: { type: Boolean, default: false },
    },
    deliveryRadiusKm: { type: Number, default: 35 },
    pickupAvailable: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'active', 'paused', 'sold_out', 'rejected'],
      default: 'active',
      index: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
productSchema.index({
  name: 'text',
  shortDescription: 'text',
  description: 'text',
  uniqueStory: 'text',
});
productSchema.index({ origin: '2dsphere' });
productSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
productSchema.index({ status: 1, isActive: 1, updatedAt: -1 });

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
    checkoutKey: { type: String, sparse: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestCustomer: { name: String, phone: String, email: String },
    lines: [lineSchema],
    fulfillments: [fulfillmentSchema],
    subtotal: Number,
    deliveryFee: Number,
    total: Number,
    paymentMethod: { type: String, enum: ['cod', 'esewa', 'khalti', 'fonepay', 'card'] },
    paymentStatus: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
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

const auditSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    action: { type: String, required: true, index: true },
    entityType: String,
    entityId: String,
    ip: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditSchema.index({ tenantId: 1, createdAt: -1 });
const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    provider: { type: String, enum: ['cod', 'esewa', 'khalti', 'fonepay', 'card'], index: true },
    amount: Number,
    currency: { type: String, default: 'NPR' },
    status: {
      type: String,
      enum: ['created', 'requires_action', 'authorized', 'paid', 'failed', 'refunded'],
      default: 'created',
    },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    providerReference: String,
    providerPayload: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);
export const Farm = mongoose.models.Farm || mongoose.model('Farm', farmSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditSchema);
export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
