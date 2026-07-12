import { Response } from "express";
import axios from "axios";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import TryCatch from "../middlewares/tryCatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import oauth2Client from "../config/googleConfig.js";
import crypto from "crypto";

const loginUser = TryCatch(async (req, res) => {
    const { code, email, password } = req.body;

    // OAuth login (existing behavior)
    if (code) {
        const googleResponse = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(googleResponse.tokens);

        const userResponse = await axios.get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleResponse.tokens.access_token}`,
        );

        const { email: gEmail, name, picture } = userResponse.data;

        let user = await User.findOne({ email: gEmail });

        if (!user) {
            user = await User.create({
                name,
                email: gEmail,
                image: picture,
            });
        }

        const token = jwt.sign(
            { userId: user._id, restaurantId: user.restaurantId },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "login user successfully",
            token,
            user,
        });
        return;
    }

    // Email/password login
    if (email && password) {
        const user = await User.findOne({ email });
        if (!user || !user.password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const bcrypt = (await import('bcryptjs')).default;
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { userId: user._id, restaurantId: user.restaurantId },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        res.status(200).json({ message: "login user successfully", token, user });
        return;
    }

    res.status(400).json({ message: "Invalid login request" });
});


const allowedRoles = ["customer", "rider", "seller"] as const;
type Role = (typeof allowedRoles)[number];


const addUserRole = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
if(!req.user?._id) {
    return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { role } = req.body as { role: Role };

    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { role },
        { returnDocument: "after" }
    );
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign(
        { userId: user._id, restaurantId: user.restaurantId },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
    );

    res.status(200).json({ message: "Role added successfully", token, user });
});



const myProfile = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
});


const registerUser = TryCatch(async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const bcrypt = (await import('bcryptjs')).default;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, image: "" });

    const token = jwt.sign({ userId: user._id, restaurantId: user.restaurantId }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
    res.status(201).json({ message: "User registered", token, user });
});

const forgotPassword = TryCatch(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: "If that email exists, a reset link was sent" });

    const token = crypto.randomBytes(20).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    // Send email if SMTP configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <tr>
            <td style="padding:40px 32px 32px;text-align:center">
              <div style="font-size:28px;font-weight:800;color:#1e293b;letter-spacing:-0.5px">Jetty<span style="color:#E23744">Orders</span></div>
              <div style="width:48px;height:4px;background-color:#E23744;border-radius:2px;margin:20px auto"></div>
              <h1 style="font-size:20px;font-weight:700;color:#1e293b;margin:0 0 8px">Reset your password</h1>
              <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px">We received a request to reset your password. Click the button below to set a new one. This link expires in 1 hour.</p>
              <a href="${resetUrl}" style="display:inline-block;background-color:#E23744;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:999px;box-shadow:0 2px 6px rgba(226,55,68,0.3)">Reset Password</a>
              <p style="font-size:13px;color:#94a3b8;margin:24px 0 0;line-height:1.5">If you didn't request this, you can safely ignore this email.<br>Your password won't change until you click the link.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #f1f5f9">
              <p style="font-size:12px;color:#94a3b8;margin:0">JettyOrders Delivery — Your go-to for local favorites</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        await transporter.sendMail({
            to: email,
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            subject: "Reset your JettyOrders password",
            html: emailHtml,
        });

        return res.status(200).json({ message: "Reset link sent if the email exists" });
    }

    // No SMTP configured — return token in response for dev/testing
    return res.status(200).json({ message: "Reset token generated (no SMTP configured)", token });
});

const resetPassword = TryCatch(async (req, res) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email, resetToken: token });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }

    const bcrypt = (await import('bcryptjs')).default;
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
});



export { loginUser, addUserRole, myProfile, registerUser, forgotPassword, resetPassword };
