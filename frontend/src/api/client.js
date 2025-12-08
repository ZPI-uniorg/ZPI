import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://zpi-uniorg-backend-fua0anh6hgb5facf.polandcentral-01.azurewebsites.net/api/",
  // "http://localhost:8000/api/",
  withCredentials: true,
});

export default apiClient;
