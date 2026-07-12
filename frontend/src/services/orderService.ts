import axios from "axios";
import { RESTAURANT_API as API, authHeaders } from "./api.js";

export const createOrder = (data: { paymentMethod: string; addressId: string }) =>
    axios.post(`${API}/api/order/create`, data, { headers: authHeaders() });

export const getMyOrders = () =>
    axios.get(`${API}/api/order/my-orders`, { headers: authHeaders() });

export const getRestaurantOrders = (restaurantId: string) =>
    axios.get(`${API}/api/order/restaurant/${restaurantId}`, { headers: authHeaders() });

export const updateOrderStatus = (orderId: string, status: string) =>
    axios.put(`${API}/api/order/${orderId}/status`, { status }, { headers: authHeaders() });

export const getOrderById = (orderId: string) =>
    axios.get(`${API}/api/order/${orderId}`, { headers: authHeaders() });
