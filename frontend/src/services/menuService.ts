import axios from "axios";
import { RESTAURANT_API as API, authHeaders } from "./api.js";

export const getAllMenuItems = (restaurantId: string) =>
    axios.get(`${API}/api/menu-item/all`, {
        params: { restaurantId },
        headers: authHeaders(),
    });

export const getAllAvailableItems = () =>
    axios.get(`${API}/api/menu-item/all-available`);

export const getPublicMenuItems = (restaurantId: string) =>
    axios.get(`${API}/api/menu-item/public/${restaurantId}`);

export const createMenuItem = (formData: FormData) =>
    axios.post(`${API}/api/menu-item/new`, formData, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
    });

export const updateMenuItem = (id: string, formData: FormData) =>
    axios.put(`${API}/api/menu-item/${id}`, formData, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
    });

export const toggleMenuItemStatus = (id: string) =>
    axios.patch(`${API}/api/menu-item/${id}/status`, {}, { headers: authHeaders() });

export const deleteMenuItem = (id: string) =>
    axios.delete(`${API}/api/menu-item/${id}`, { headers: authHeaders() });
