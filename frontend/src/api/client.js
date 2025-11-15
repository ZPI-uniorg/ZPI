import axios from "axios";

const LOCAL_URL = "http://localhost:8000/api/";
const REMOTE_URL =
  "https://zpi-uniorg-backend-fua0anh6hgb5facf.polandcentral-01.azurewebsites.net/api/";

// Decide backend URL based on current host (production static site vs local dev).
const baseURL =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith("azurestaticapps.net")
    ? REMOTE_URL
    : LOCAL_URL;

// If you rely purely on JWT Authorization headers, credentials (cookies) are unnecessary
// and can complicate CORS. Disable by default; enable only if a cookie-based flow is needed.
const apiClient = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 15000,
});

// Optional response interceptor to surface network/CORS issues clearly.
apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response == null) {
      // Network or CORS preflight failure; attach clearer message.
      error.message = "Network/CORS error: backend unreachable or blocked.";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
