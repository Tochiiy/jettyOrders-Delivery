import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User.js";

export interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}

export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ success: false, message: "Unauthorized", error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
            return;
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ success: false, message: "Unauthorized", error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload & { userId: string };

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            res.status(401).json({ success: false, message: "Unauthorized", error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
            return;
        }

        req.user = user;
        next();
    } catch {
        res.status(401).json({ success: false, message: "Unauthorized", error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    }
}


export const isSeller = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== "seller") {
        res.status(403).json({ success: false, message: "Unauthorized. Seller access required", error: { code: "SELLER_ACCESS_REQUIRED", message: "Unauthorized. Seller access required" } });
        return;
    }
    next();
};

export const isCustomer = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== "customer") {
        res.status(403).json({ success: false, message: "Unauthorized. Customer access required", error: { code: "CUSTOMER_ACCESS_REQUIRED", message: "Unauthorized. Customer access required" } });
        return;
    }
    next();
};
