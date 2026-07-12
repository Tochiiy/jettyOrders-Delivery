import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
    name: string;
    description?: string;
    price: number;
    image?: string;
    category?: string;
    restaurantId: mongoose.Types.ObjectId;
    isAvailable: boolean;
    createdAt: Date;
}

const menuItemSchema: Schema<IMenuItem> = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String },
    category: { type: String, trim: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    isAvailable: { type: Boolean, default: true },
}, { timestamps: true });

const MenuItem = mongoose.model<IMenuItem>("MenuItem", menuItemSchema);
export default MenuItem;
