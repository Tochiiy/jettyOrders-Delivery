import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    image: string;
    role: string | null;
    password?: string;
    resetToken?: string | null;
    resetTokenExpiry?: Date | null;
}


const userSchema: Schema<IUser> = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    image: {
        type: String,
        default: ""
    },
    password: {
        type: String,
        required: false,
    },
    resetToken: {
        type: String,
        required: false,
        default: null,
    },
    resetTokenExpiry: {
        type: Date,
        required: false,
        default: null,
    },
    role: {
        type: String,
        default: null,
    },
}

,
{
    timestamps: true
}

);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
