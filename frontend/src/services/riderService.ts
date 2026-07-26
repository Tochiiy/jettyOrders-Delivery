import axios from "axios";
import { RIDER_API as API, authHeaders } from "./api.js";

export const getMyProfile = () =>
    axios.get(`${API}/api/rider/me`, { headers: authHeaders() });

export const registerRider = (formData: FormData) =>
    axios.post(`${API}/api/rider/register`, formData, {
        headers: authHeaders(),
    });

export const updateLocation = (latitude: number, longitude: number) =>
    axios.put(`${API}/api/rider/location`, { latitude, longitude }, { headers: authHeaders() });

export const toggleAvailability = (data: { isAvailable: boolean; latitude: number; longitude: number }) =>
    axios.patch(`${API}/api/rider/availability`, data, { headers: authHeaders() });

export const acceptOrder = (orderId: string) =>
    axios.post(`${API}/api/rider/accept-order/${orderId}`, {}, { headers: authHeaders() });

export const getActiveOrders = () =>
    axios.get(`${API}/api/rider/active-orders`, { headers: authHeaders() });

export const updateOrderStatus = (orderId: string, status: "pickedUp" | "delivered") =>
    axios.put(`${API}/api/rider/order-status`, { orderId, status }, { headers: authHeaders() });
