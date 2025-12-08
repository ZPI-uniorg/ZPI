import axios from "axios";

const apiClient = axios.create({
  baseURL: `https://${import.meta.env.VITE_BACKEND_URL}/api/`,
  // baseURL: "http://localhost:8000/api/",
  withCredentials: true,
});

export default apiClient;
