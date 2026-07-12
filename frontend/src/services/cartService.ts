import axios from "axios";
import { RESTAURANT_API as API, authHeaders } from "./api.js";

export const fetchCart = () =>
    axios.get(`${API}/api/cart/all`, { headers: authHeaders() });

export const addCartItem = (menuItemId: string, quantity: number) =>
    axios.post(`${API}/api/cart/add`, { menuItemId, quantity }, { headers: authHeaders() });

export const updateCartItem = (menuItemId: string, quantity: number) =>
    axios.put(`${API}/api/cart/${menuItemId}`, { quantity }, { headers: authHeaders() });

export const removeCartItem = (menuItemId: string) =>
    axios.delete(`${API}/api/cart/${menuItemId}`, { headers: authHeaders() });

export const clearCart = () =>
    axios.delete(`${API}/api/cart/clear`, { headers: authHeaders() });
