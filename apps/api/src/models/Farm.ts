import mongoose from 'mongoose';
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
export const Farm = mongoose.models.Farm || mongoose.model('Farm', farmSchema);
