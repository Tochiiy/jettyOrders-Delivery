import axios from "axios";
import { UTILS_API as API, authHeaders } from "./api.js";

export const createPaymentIntent = (data: { orderId: string; amount: number }) =>
    axios.post(`${API}/api/payment/create-payment-intent`, data, { headers: authHeaders() });

export const confirmPayment = (data: { paymentIntentId: string; orderId: string }) =>
    axios.post(`${API}/api/payment/confirm`, data, { headers: authHeaders() });
