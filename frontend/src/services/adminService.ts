import axios from "axios";
import { ADMIN_API as API, authHeaders } from "./api.js";

export const getPendingRestaurants = () =>
    axios.get(`${API}/api/admin/restaurant/pending`, { headers: authHeaders() });

export const getPendingRiders = () =>
    axios.get(`${API}/api/admin/rider/pending`, { headers: authHeaders() });

export const verifyRestaurant = (id: string) =>
    axios.patch(`${API}/api/admin/verify/restaurant/${id}`, {}, { headers: authHeaders() });

export const verifyRider = (id: string) =>
    axios.patch(`${API}/api/admin/verify/rider/${id}`, {}, { headers: authHeaders() });
