import mongoose, { Schema, Document } from "mongoose";

interface IOrder extends Document {
    userId: string;
    restaurantId: string;
    restaurantName: string;
    riderId?: string | null;
    riderPhone: number | null;
    riderName: string | null;
    riderImage: string | null;
    distance: number;
    riderAmount: number;
    items: {
        name: string;
        menuItemId: string;
        price: number;
        quantity: number;
    }[];

    subtotal: number;
    deliveryFee: number;
    platformFee: number;
    totalAmount: number;

    addressId: string;

    deliveryAddress: {
        formattedAddress: string;
        mobile: number;
        latitude: number;
        longitude: number;
    };

    status:
        | "placed"
        | "accepted"
        | "preparing"
        | "ready_for_rider"
        | "rider_assigned"
        | "pickedUp"
        | "canceled"
        | "delivered";

    paymentMethod: "stripe";
    paymentStatus: "paid" | "unpaid";

    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const orderSchema: Schema<IOrder> = new Schema(
    {
        userId: { type: String, required: true },
        restaurantId: { type: String, required: true },
        restaurantName: { type: String, required: true },
        riderId: { type: String, default: null },
        riderPhone: { type: Number, default: null },
        riderName: { type: String, default: null },
        riderImage: { type: String, default: null },
        distance: { type: Number, required: true },
        riderAmount: { type: Number, required: true },
        items: {
            type: [{
                name: { type: String, required: true },
                menuItemId: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true },
            }],
            required: true,
        },
        subtotal: { type: Number, required: true },
        deliveryFee: { type: Number, required: true },
        platformFee: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
        addressId: { type: String, required: true },
        deliveryAddress: {
            formattedAddress: { type: String, required: true },
            mobile: { type: Number, required: true },
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true },
        },
        status: {
            type: String,
            enum: [
                "placed",
                "accepted",
                "preparing",
                "ready_for_rider",
                "rider_assigned",
                "pickedUp",
                "canceled",
                "delivered",
            ],
            default: "placed",
        },
        paymentMethod: { type: String, enum: ["stripe"], default: "stripe" },
        paymentStatus: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
        expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
    },
    { timestamps: true }
)


orderSchema.index({ userId: 1, paymentStatus: 1 });
orderSchema.index({ restaurantId: 1, paymentStatus: 1, createdAt: -1 });
orderSchema.index({ riderId: 1, status: 1 });
orderSchema.index({ status: 1, expiresAt: 1 });

const Order = mongoose.model<IOrder>("Order", orderSchema);
export default Order;