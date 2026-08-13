import mongoose from 'mongoose';
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
      geo: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [85.324, 27.7172] },
      },
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
export const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', tenantSchema);
