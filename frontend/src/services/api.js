
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://supplywise-ai.onrender.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getHealth = async () => {
  const response = await api.get("/api/health");
  return response.data;
};

export const getSuppliers = async () => {
  const response = await api.get("/api/suppliers");
  return response.data;
};

export const getMatches = async (threshold = 55) => {
  const response = await api.get("/api/matches", {
    params: { threshold },
  });
  return response.data;
};

export const getOptimization = async (hotelName) => {
  const response = await api.get("/api/optimization", {
    params: { hotel_name: hotelName },
  });
  return response.data;
};

export default api;
