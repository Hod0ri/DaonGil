import axios from 'axios';

const isProduction = process.env.NODE_ENV === 'production';
const API_URL = process.env.REACT_APP_API_URL !== undefined ? process.env.REACT_APP_API_URL : (isProduction ? '' : 'http://localhost:8000');
const API_KEY = process.env.REACT_APP_API_KEY || '';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  },
});

// Add a request interceptor to inject the Authorization header dynamically
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
