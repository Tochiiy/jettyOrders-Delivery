import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getUserCollection } from "../util/collection.js";

export interface IUser {
  _id: string;
  name?: string;
  email?: string;
  role?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Please Login - No auth header",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        message: "Please Login - Token missing",
      });
      return;
    }

    const decodedValue = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload & { userId?: string };

    if (!decodedValue?.userId || !ObjectId.isValid(decodedValue.userId)) {
      res.status(401).json({
        message: "Invalid token",
      });
      return;
    }

    const user = await (await getUserCollection()).findOne({
      _id: new ObjectId(decodedValue.userId),
    });

    if (!user) {
      res.status(401).json({
        message: "Invalid token",
      });
      return;
    }

    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    res.status(401).json({
      message: "Please Login - Jwt error",
    });
  }
};

export const isAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Please Login",
      });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({
        message: "Access denied",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({
      message: "Please Login",
    });
  }
};
