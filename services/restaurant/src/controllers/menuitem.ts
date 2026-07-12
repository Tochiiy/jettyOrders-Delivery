import { Response } from "express";
import TryCatch from "../middlewares/tryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import getBuffer from "../config/datauri.js";
import axios from "axios";

const addMenuItem = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const restaurant = await Restaurant.findOne({ ownerId: String(user._id) });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const { name, price, description, category } = req.body;
    if (!name || !price) {
        return res.status(400).json({ message: "Name and price are required" });
    }

    let image = "";

    const file = req.file;
    if (file) {
        const fileBuffer = getBuffer(file);
        if (fileBuffer.content) {
            const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`,
                { buffer: fileBuffer.content }
            );
            image = uploadResult.url;
        }
    }

    const menuItem = await MenuItem.create({
        name,
        price,
        description,
        category,
        image,
        restaurantId: restaurant._id,
    });

    res.status(201).json({ message: "Menu item added", menuItem });
});

const getMenuItems = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ message: "restaurantId query param is required" });

    const items = await MenuItem.find({ restaurantId: restaurantId as string }).sort({ createdAt: -1 });

    res.status(200).json({ menuItems: items });
});

const updateMenuItem = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { name, price, description, category, isAvailable } = req.body;

    const restaurant = await Restaurant.findOne({ ownerId: String(user._id) });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const fields: Record<string, unknown> = { name, price, description, category };
    if (isAvailable !== undefined) fields.isAvailable = isAvailable === "true" || isAvailable === true;

    const file = req.file;
    if (file) {
        const fileBuffer = getBuffer(file);
        if (fileBuffer.content) {
            const { data: uploadResult } = await axios.post(`${process.env.UTILS_SERVICE}/api/upload`,
                { buffer: fileBuffer.content }
            );
            fields.image = uploadResult.url;
        }
    }

    const updated = await MenuItem.findOneAndUpdate(
        { _id: id, restaurantId: restaurant._id },
        fields,
        { returnDocument: "after" }
    );

    if (!updated) return res.status(404).json({ message: "Menu item not found" });

    res.status(200).json({ message: "Menu item updated", menuItem: updated });
});

const toggleMenuItemAvailability = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    const restaurant = await Restaurant.findOne({ ownerId: String(user._id) });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const item = await MenuItem.findOne({ _id: id, restaurantId: restaurant._id });
    if (!item) return res.status(404).json({ message: "Menu item not found" });

    item.isAvailable = !item.isAvailable;
    await item.save();

    const status = item.isAvailable ? "available" : "unavailable";
    res.status(200).json({ message: `${item.name} is now ${status}`, menuItem: item });
});

const deleteMenuItem = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    const restaurant = await Restaurant.findOne({ ownerId: String(user._id) });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const deleted = await MenuItem.findOneAndDelete({ _id: id, restaurantId: restaurant._id });
    if (!deleted) return res.status(404).json({ message: "Menu item not found" });

    res.status(200).json({ message: "Menu item deleted" });
});

const getPublicMenuItems = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ message: "restaurantId is required" });

    const items = await MenuItem.find({ restaurantId, isAvailable: true }).sort({ category: 1, name: 1 });

    res.status(200).json({ menuItems: items });
});

const getAllAvailableItems = TryCatch(async (_req: AuthenticatedRequest, res: Response) => {
    const items = await MenuItem.find({ isAvailable: true })
        .populate("restaurantId", "name image address")
        .sort({ category: 1, name: 1 });

    res.status(200).json({ menuItems: items });
});

export { addMenuItem, getMenuItems, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability, getPublicMenuItems, getAllAvailableItems };
