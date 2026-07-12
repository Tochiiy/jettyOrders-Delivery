import { Response } from "express";
import TryCatch from "../middlewares/tryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";
import User from "../models/User.js";
import getBuffer from "../config/datauri.js";
import axios from "axios";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string
const signToken = (userId: string, restaurantId: string | null) =>
  jwt.sign({ userId, restaurantId }, JWT_SECRET, { expiresIn: "7d" })

const addRestaurant = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ success: false, message: "Unauthorized", error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    }

    const existingRestuarant = await Restaurant.findOne({
        ownerId: String(user._id)
    });
    if (existingRestuarant) {
        return res.status(400).json({ success: false, message: "User already has a restaurant", error: { code: "RESTAURANT_EXISTS", message: "User already has a restaurant" } });
    }

    const { name, description, latitude, longitude, formattedAddress, phone } = req.body
    if (!name || !latitude || !longitude) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: "Image is required" });
    }

    const fileBuffer = getBuffer(file);

    if (!fileBuffer.content) {
        return res.status(500).json({ success: false, message: "Error uploading image", error: { code: "UPLOAD_FAILED", message: "Error uploading image" } });
    }
  
    const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`,
        {
            buffer: fileBuffer.content,
        }
    );

    const newRestaurant = await Restaurant.create({
        name,
        description,
        phone,
        image: uploadResult.url,
        ownerId: String(user._id),
        address: formattedAddress,
        autoLocation: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
            formattedAddress
        },

        isVerified: false
    });

    await User.findByIdAndUpdate(user._id, { restaurantId: String(newRestaurant._id) });

    const token = signToken(String(user._id), String(newRestaurant._id))

    return res.status(201).json({
        success: true,
        message: "Restaurant added successfully",
        restaurant: newRestaurant,
        token,
    })
})

const fetchMyRestaurant = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Please login", error: { code: "UNAUTHORIZED", message: "Please login" } });
    }

    const restaurant = await Restaurant.findOne({
        ownerId: String(req.user._id)
    });

    if (!restaurant) {
        return res.status(404).json({ success: false, message: "No restaurant found", error: { code: "NO_RESTAURANT", message: "No restaurant found" } });
    }

    const authHeader = req.headers.authorization
    const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null
    const tokenPayload = rawToken ? jwt.decode(rawToken) as any : null

    if (!tokenPayload?.restaurantId) {
        const newToken = jwt.sign(
            {
                userId: req.user._id,
                name: req.user.name,
                email: req.user.email,
                image: req.user.image,
                role: req.user.role,
                restaurantId: restaurant._id,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        return res.status(200).json({ success: true, message: "Restaurant fetched", restaurant, token: newToken });
    }

    return res.status(200).json({ success: true, message: "Restaurant fetched", restaurant });
})



const toggleRestaurantStatus = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized", error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const { status } = req.body;
    const restaurant = await Restaurant.findOne({ ownerId: String(user._id) });
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found", error: { code: "RESTAURANT_NOT_FOUND", message: "Restaurant not found" } });

    restaurant.isOpen = status;
    await restaurant.save();

    res.status(200).json({ success: true, message: "Status updated", restaurant });
});

const editRestaurant = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized", error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const { name, description } = req.body;
    const restaurant = await Restaurant.findOneAndUpdate(
        { ownerId: String(user._id) },
        { name, description },
        { returnDocument: "after" }
    );
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found", error: { code: "RESTAURANT_NOT_FOUND", message: "Restaurant not found" } });

    res.status(200).json({ success: true, message: "Restaurant updated", restaurant });
});

const getNearbyRestaurant = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { latitude, longitude, radius = 5000, search, verified } = req.query;
    if (!latitude || !longitude) return res.status(400).json({ success: false, message: "Latitude and longitude are required", error: { code: "INVALID_LOCATION", message: "Latitude and longitude are required" } });

    const query: any = {};
    if (verified === "true") query.isVerified = true;

    if (search && typeof search === "string") {
        query.name = {
            $regex: search,
            $options: "i"
        };
    }

    const restaurants = await Restaurant.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [Number(longitude), Number(latitude)]
                },
                distanceField: "distance",
                maxDistance: Number(radius),
                query,
                spherical: true
            }
        },
        {
            $sort: {
                isOpen: -1,
                distance: 1
            }
        }
    ]);

    res.status(200).json({ success: true, message: "Restaurants found", count: restaurants.length, restaurants });
});

const getAllRestaurants = TryCatch(async (_req: AuthenticatedRequest, res: Response) => {
    const { search, verified } = _req.query;

    const query: any = {};
    if (verified === "true") query.isVerified = true;

    if (search && typeof search === "string") {
        query.name = {
            $regex: search,
            $options: "i"
        };
    }

    const restaurants = await Restaurant.find(query).sort({ isOpen: -1, createdAt: -1 });

    res.status(200).json({ success: true, message: "Restaurants fetched", count: restaurants.length, restaurants });
});

const fetchSingleRestuarant = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found", error: { code: "RESTAURANT_NOT_FOUND", message: "Restaurant not found" } });
    res.status(200).json({ success: true, message: "Restaurant fetched", restaurant });
})

const deleteRestaurant = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized", error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

    const restaurant = await Restaurant.findOne({ ownerId: String(user._id) });
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found", error: { code: "RESTAURANT_NOT_FOUND", message: "Restaurant not found" } });

    await MenuItem.deleteMany({ restaurantId: restaurant._id });
    await Restaurant.findByIdAndDelete(restaurant._id);
    await User.findByIdAndUpdate(user._id, { restaurantId: null });

    const token = jwt.sign(
        {
            userId: user._id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            restaurantId: null,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
    );

    res.status(200).json({ success: true, message: "Restaurant deleted successfully", token });
})

export { addRestaurant, fetchMyRestaurant, toggleRestaurantStatus, editRestaurant, getNearbyRestaurant, getAllRestaurants, fetchSingleRestuarant, deleteRestaurant }