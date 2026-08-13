import mongoose from 'mongoose';

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
    geo: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [85.324, 27.7172] },
    },
    addresses: [addressSchema],
    wishlist: { type: [String], default: [] },
    rewardPoints: { type: Number, default: 0, min: 0 },
    walletBalance: { type: Number, default: 0, min: 0 },
    language: { type: String, enum: ['en', 'ne'], default: 'en' },
    marketingOptIn: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);
userSchema.index({ geo: '2dsphere' });
export const User = mongoose.models.User || mongoose.model('User', userSchema);
