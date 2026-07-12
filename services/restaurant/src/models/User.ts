import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    image: string;
    role: string | null;
    restaurantId?: string;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    role: { type: String, default: null },
    restaurantId: { type: String, default: null },
}, { timestamps: true });

const User = mongoose.model<IUser>("User", userSchema);
export default User;
