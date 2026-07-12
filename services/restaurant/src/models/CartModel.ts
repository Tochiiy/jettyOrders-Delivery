import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICartItem {
    menuItemId: Types.ObjectId;
    quantity: number;
    name?: string;
    price?: number;
    image?: string;
    category?: string;
    restaurantId?: Types.ObjectId;
    restaurantName?: string;
}

export interface ICart extends Document {
    userId: Types.ObjectId;
    items: ICartItem[];
    createdAt: Date;
    updatedAt: Date;
}

const cartItemSchema: Schema<ICartItem> = new Schema(
    {
        menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
        quantity: { type: Number, required: true, default: 1, min: 1 },
        name: { type: String },
        price: { type: Number },
        image: { type: String },
        category: { type: String },
        restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
        restaurantName: { type: String },
    },
    { _id: false }
);

const cartSchema: Schema<ICart> = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        items: { type: [cartItemSchema], default: [] },
    },
    {
        timestamps: true,
    }
);

const Cart = mongoose.model<ICart>("Cart", cartSchema);
export default Cart;
