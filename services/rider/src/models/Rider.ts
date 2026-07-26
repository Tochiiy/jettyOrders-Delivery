import mongoose, { Schema, Document } from "mongoose";

export interface IRider extends Document {
    userId: string;
    phone: string;
    image: string;
    driversLicenseNumber: string;
    isAvailable: boolean;
    isVerified: boolean;
    totalDeliveries: number;
    lastActiveAt?: Date;
    currentLocation?: {
        type: "Point";
        coordinates: [number, number];
    };
}

const riderSchema: Schema<IRider> = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    driversLicenseNumber: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    isAvailable: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    totalDeliveries: { type: Number, default: 0 },
    lastActiveAt: { type: Date },
    currentLocation: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [0, 0] },
    },
}, { timestamps: true });

riderSchema.index({ currentLocation: "2dsphere" });
riderSchema.index({ isAvailable: 1, isVerified: 1, currentLocation: "2dsphere" });

const Rider = mongoose.model<IRider>("Rider", riderSchema);
export default Rider;
