import axios from "axios";
import { AI_API as API } from "./api.js";

export const suggestDish = (data: { restaurantName: string; menuItems: string[]; userContext?: string }) =>
    axios.post(`${API}/api/ai/suggest-dish`, data);

export const suggestRestaurants = (data: { restaurants: { name: string; cuisine?: string }[]; preferences?: string }) =>
    axios.post(`${API}/api/ai/suggest-restaurants`, data);

export const generateReview = (data: { restaurantName: string; items: string[]; feedback?: string }) =>
    axios.post(`${API}/api/ai/generate-review`, data);
