import { Request, Response } from "express";
import TryCatch from "../middlewares/tryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import Rider from "../models/Rider.js";
import getBuffer from "../config/datauri.js";
import axios from "axios";

const registerRider = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if(user.role !== "rider") {
        res.status(400).json({ message: "Only riders can register" });
        return;
    }

 
    const { phone, driversLicenseNumber, latitude, longitude } = req.body;
    if (!phone || !driversLicenseNumber || latitude == null || longitude == null) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const existing = await Rider.findOne({ userId: String(user._id) }).lean();
    if (existing) {
        res.status(400).json({ message: "Rider profile already exists" });
        return;
    }

    const file = req.file;
    if (!file) {
        res.status(400).json({ message: "Image is required" });
        return;
    }

    const fileBuffer = getBuffer(file);
    if (!fileBuffer.content) {
        res.status(500).json({ message: "Error uploading image" });
        return;
    }

    const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`, {
        buffer: fileBuffer.content,
    });

    const rider = await Rider.create({
        userId: String(user._id),
        phone,
        driversLicenseNumber,
        image: uploadResult.url,
        currentLocation: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
        },
        isAvailable: false,
        isVerified: false,
    });

    res.status(201).json({
        message: "Rider profile created",
        rider: {
            _id: rider._id,
            userId: rider.userId,
            phone: rider.phone,
            image: rider.image,
            isAvailable: rider.isAvailable,
            isVerified: rider.isVerified,
            currentLocation: rider.currentLocation,
        },
    });
});

const getMyProfile = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const rider = await Rider.findOne({ userId: String(user._id) }).lean();
    if (!rider) {
        res.status(404).json({ message: "Rider profile not found" });
        return;
    }

    res.json({
        rider: {
            _id: rider._id,
            userId: rider.userId,
            phone: rider.phone,
            image: rider.image,
            isAvailable: rider.isAvailable,
            isVerified: rider.isVerified,
            totalDeliveries: rider.totalDeliveries,
            lastActiveAt: rider.lastActiveAt,
            currentLocation: rider.currentLocation,
            createdAt: rider.createdAt,
        },
    });
});

const updateLocation = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
        res.status(400).json({ message: "Latitude and longitude are required" });
        return;
    }

    const rider = await Rider.findOneAndUpdate(
        { userId: String(user._id) },
        {
            currentLocation: {
                type: "Point",
                coordinates: [Number(longitude), Number(latitude)],
            },
        },
        { returnDocument: "after" }
    );

    if (!rider) {
        res.status(404).json({ message: "Rider profile not found" });
        return;
    }

    // don't leak sensitive fields
    const { driversLicenseNumber, ...safe } = rider;
    res.json({ message: "Location updated", rider: safe });
});

const toggleAvailability = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const { isAvailable, latitude, longitude } = req.body;
    if (isAvailable === undefined || latitude == null || longitude == null) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }
    if (typeof isAvailable !== "boolean") {
        res.status(400).json({ message: "isAvailable must be a boolean" });
        return;
    }

    const rider = await Rider.findOne({ userId: String(user._id) });
    if (!rider) {
        res.status(404).json({ message: "Rider profile not found" });
        return;
    }

    if (isAvailable && !rider.isVerified) {
        res.status(400).json({ message: "You must be verified to be available" });
        return;
    }

    rider.isAvailable = isAvailable;
    rider.currentLocation = {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
    };
    await rider.save();

    const { driversLicenseNumber, ...safe } = rider.toObject ? rider.toObject() : rider;
    res.json({ message: rider.isAvailable ? "You are now online" : "You are now offline", rider: safe });
});

const acceptOrder = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ message: "Order ID is required" });

    const rider = await Rider.findOneAndUpdate(
        { userId: String(user._id), isAvailable: true, isVerified: true },
        { $set: { isAvailable: false } },
        { returnDocument: "after" }
    );
    if (!rider) return res.status(404).json({ message: "Rider not found or not available" });

    try {
        const { data } = await axios.put(`${process.env.RESTAURANT_SERVICE}/api/order/internal/assign-rider`, {
            orderId,
            riderId: String(user._id),
            riderName: user.name,
            riderImage: user.image,
            riderPhone: rider.phone,
        }, {
            headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
        });

        res.status(200).json({ message: "Order accepted", order: data.order });
    } catch (err: any) {
        await Rider.findOneAndUpdate(
            { userId: String(user._id) },
            { $set: { isAvailable: true } }
        );
        const message = err?.response?.data?.message || "Failed to accept order";
        res.status(400).json({ message });
    }
})

const getActiveOrders = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    try {
        const { data } = await axios.post(`${process.env.RESTAURANT_SERVICE}/api/order/internal/current/rider`, {
            riderId: String(user._id),
        }, {
            headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
        });

        res.status(200).json({ orders: data.orders });
    } catch (err: any) {
        const message = err?.response?.data?.message || "Failed to fetch active orders";
        res.status(400).json({ message });
    }
})

const updateOrderStatus = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { orderId, status } = req.body;
    if (!orderId || !status) return res.status(400).json({ message: "Order ID and status are required" });

    try {
        const { data } = await axios.put(`${process.env.RESTAURANT_SERVICE}/api/order/internal/rider/status`, {
            orderId,
            status,
        }, {
            headers: { "x-internal-key": process.env.INTERNAL_SERVICE_KEY },
        });

        res.status(200).json({ message: data.message, order: data.order });
    } catch (err: any) {
        const message = err?.response?.data?.message || "Failed to update order status";
        res.status(400).json({ message });
    }
})

const internalUpdateLocation = TryCatch(async (req: Request, res: Response) => {
  const { userId, latitude, longitude } = req.body;
  if (!userId || latitude === undefined || longitude === undefined) {
    res.status(400).json({ message: "userId, latitude, and longitude are required" });
    return;
  }

  const rider = await Rider.findOneAndUpdate(
    { userId },
    {
      currentLocation: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      },
    },
    { returnDocument: "after" }
  );

  if (!rider) {
    res.status(404).json({ message: "Rider not found" });
    return;
  }

  const { driversLicenseNumber, ...safe } = rider;
  res.json({ message: "Location updated", rider: safe });
});

export { registerRider, getMyProfile, updateLocation, toggleAvailability, acceptOrder, getActiveOrders, updateOrderStatus, internalUpdateLocation };
