import { Response } from "express";
import TryCatch from "../middlewares/tryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import Address from "../models/Address.js";

const addAddress = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { mobile, formattedAddress, latitude, longitude } = req.body;
    if (!mobile || !formattedAddress || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: "Mobile, formattedAddress, latitude, and longitude are required" });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({ message: "Latitude and longitude must be valid numbers" });
    }

    const address = await Address.create({
        userId: user._id.toString(),
        mobile,
        formattedAddress,
        location: { type: "Point", coordinates: [lng, lat] },
    });

    res.status(201).json({ message: "Address added successfully", address });
});

const getAddresses = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const addresses = await Address.find({ userId: user._id.toString() }).sort({ createdAt: -1 });
    res.status(200).json({ addresses });
});

const updateAddress = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { mobile, formattedAddress, latitude, longitude } = req.body;

    const address = await Address.findOne({ _id: id, userId: user._id.toString() });
    if (!address) return res.status(404).json({ message: "Address not found" });

    if (mobile !== undefined) address.mobile = mobile;
    if (formattedAddress !== undefined) address.formattedAddress = formattedAddress;
    if (latitude !== undefined && longitude !== undefined) {
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return res.status(400).json({ message: "Latitude and longitude must be valid numbers" });
        }
        address.location = { type: "Point", coordinates: [lng, lat] };
    }

    await address.save();
    res.status(200).json({ message: "Address updated successfully", address });
});

const deleteAddress = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const address = await Address.findOneAndDelete({ _id: id, userId: user._id.toString() });
    if (!address) return res.status(404).json({ message: "Address not found" });

    res.status(200).json({ message: "Address deleted successfully" });
});

export { addAddress, getAddresses, updateAddress, deleteAddress };
