import axios from "axios";
import { RESTAURANT_API as API, authHeaders } from "./api.js";

export const getNearbyRestaurants = (
  latitude: number,
  longitude: number,
  search?: string,
  radius = 5000,
  verifiedOnly?: boolean
) =>
  axios.get(`${API}/api/restaurant/nearby`, {
    params: { latitude, longitude, search, radius, verified: verifiedOnly || undefined },
  })

export const getAllRestaurants = (search?: string, verifiedOnly?: boolean) =>
    axios.get(`${API}/api/restaurant/all`, {
        params: { search, verified: verifiedOnly || undefined },
    });

export const getRestaurantById = (id: string, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return axios.get(`${API}/api/restaurant/${id}`, { headers });
};

export const getMyRestaurant = () =>
    axios.get(`${API}/api/restaurant/my`, { headers: authHeaders() });

export const createRestaurant = (formData: FormData) =>
    axios.post(`${API}/api/restaurant/new`, formData, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
    });

export const editRestaurant = (data: { name: string; description: string }) =>
    axios.put(`${API}/api/restaurant/edit`, data, { headers: authHeaders() });

export const toggleRestaurantStatus = (status: boolean) =>
    axios.put(`${API}/api/restaurant/status`, { status }, { headers: authHeaders() });

export const deleteRestaurant = () =>
    axios.delete(`${API}/api/restaurant/delete`, { headers: authHeaders() });
