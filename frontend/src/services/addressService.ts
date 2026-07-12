import axios from "axios";
import { RESTAURANT_API as API, authHeaders } from "./api.js";

export const addAddress = (data: { mobile: number; formattedAddress: string; latitude: number; longitude: number }) =>
    axios.post(`${API}/api/address/add`, data, { headers: authHeaders() });

export const getAddresses = () =>
    axios.get(`${API}/api/address/all`, { headers: authHeaders() });

export const updateAddress = (id: string, data: { mobile?: number; formattedAddress?: string; latitude?: number; longitude?: number }) =>
    axios.put(`${API}/api/address/${id}`, data, { headers: authHeaders() });

export const deleteAddress = (id: string) =>
    axios.delete(`${API}/api/address/${id}`, { headers: authHeaders() });
