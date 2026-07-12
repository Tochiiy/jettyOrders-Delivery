import axios from "axios";
import { AUTH_API as API, authHeaders } from "./api.js";

export const login = (email: string, password: string) =>
    axios.post(`${API}/api/auth/login`, { email, password });

export const loginWithGoogle = (code: string) =>
    axios.post(`${API}/api/auth/login`, { code });

export const register = (name: string, email: string, password: string) =>
    axios.post(`${API}/api/auth/register`, { name, email, password });

export const fetchMe = () =>
    axios.get(`${API}/api/auth/me`, { headers: authHeaders() });

export const addRole = (role: string) =>
    axios.put(`${API}/api/auth/add/role`, { role }, { headers: authHeaders() });

export const forgotPassword = (email: string) =>
    axios.post(`${API}/api/auth/forgot-password`, { email });

export const resetPassword = (token: string, email: string, newPassword: string) =>
    axios.post(`${API}/api/auth/reset-password`, { token, email, newPassword });
