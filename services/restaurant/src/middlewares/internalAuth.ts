import { Request, Response, NextFunction } from "express";

export const internalAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    next();
};
