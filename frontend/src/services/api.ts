const envUrl = (key: string, fallback: string) => {
  const raw = import.meta.env[key] as string | undefined
  return raw?.startsWith("http") ? raw : fallback
}

export const AUTH_API = envUrl("VITE_API_URL", "http://localhost:5000")
export const RESTAURANT_API = envUrl("VITE_RESTAURANT_API", "http://localhost:5001")
export const UTILS_API = envUrl("VITE_UTILS_API", "http://localhost:5002")
export const AI_API = envUrl("VITE_AI_API", "http://localhost:5003")
export const REALTIME_API = envUrl("VITE_REALTIME_API", "http://localhost:5005")

export const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
