import mongoose, { Schema, Document } from "mongoose";

export interface IRestaurant extends Document {
    name: string;
    description?: string;
    image: string;
    address: string;
    ownerId: string;
    phone: number;
    isVerified: boolean;
    autoLocation: {
        type: "Point";
        coordinates: [number, number];
        formattedAddress: string;
    };
    isOpen: boolean;
    createdAt: Date;
}

const restaurantSchema: Schema<IRestaurant> = new mongoose.Schema({
    name: { type: String, required: true ,trim: true},
    description: { type: String },
    image: { type: String, required: true },
    address: { type: String, required: true },
    ownerId: { type: String, required: true },
    phone: { type: Number, required: true },
    isVerified: { type: Boolean, default: false },
    autoLocation: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true },
        formattedAddress: { type: String },
    },
    isOpen: { type: Boolean, default: true },
}, { timestamps: true });

restaurantSchema.index({ autoLocation: "2dsphere" });

const Restaurant = mongoose.model<IRestaurant>("Restaurant", restaurantSchema);
export default Restaurant;
