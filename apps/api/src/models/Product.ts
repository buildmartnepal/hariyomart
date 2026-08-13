import mongoose from 'mongoose';
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
    origin: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [85.324, 27.7172] },
    },
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
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
