import axios from 'axios';
import Cookies from 'js-cookie';
import axiosRetry from 'axios-retry';
import { toast } from 'react-toastify';


export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5236').replace(/\/$/, '');
export const API_URL = `${BACKEND_URL}/api`;
export const publicAssetUrl = (value) => {
  if (!value || value.startsWith('blob:') || value.startsWith('data:') || /^https?:\/\//i.test(value)) return value;
  return `${BACKEND_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

export const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.detail) return data.detail;
  if (data?.title) return data.title;
  if (data?.message) return data.message;
  const validationMessages = data?.errors && Object.values(data.errors).flat().filter(Boolean);
  if (validationMessages?.length) return validationMessages.join(' ');
  return error?.message || fallback;
};

// Create the Axios instance
const api = axios.create({
  baseURL: API_URL, 
});

// --- LAYER 1: RETRY LOGIC (The "Blip") ---
// Automatically retry 3 times if the network fails
axiosRetry(api, { 
    retries: 3, 
    retryDelay: (retryCount) => {
        console.log(`Network retry attempt: ${retryCount}`);
        return retryCount * 1000; 
    },
    retryCondition: (error) => {       
        return ['get', 'head', 'options'].includes(error.config?.method?.toLowerCase()) && (axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED');
    }
});

// --- REQUEST INTERCEPTOR (Auth Token) ---
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- LAYER 2: GLOBAL ERROR HANDLING (The "Outage") ---
// This catches errors globally before they reach your components
api.interceptors.response.use(
  (response) => response, // If success, just return data
  (error) => {
    
    // Check if it is a Network Error (Internet Down / Server Down)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      
      // ✅ PREVENT DUPLICATE TOASTS
      // If 5 requests fail at once, this ensures only ONE toast appears.
      if (!toast.isActive('network-error-toast')) {
         toast.error("Unable to connect to server. Please check your internet.", {
             toastId: 'network-error-toast', // Unique ID prevents duplicates
             autoClose: 5000
         });
      }
      
      console.error("CRITICAL: Network Connection Lost");
    } 
    
    // Optional: Handle 401 Session Expired globally
    else if (error.response?.status === 401) {
       // You can force logout here if you want
       // window.location.href = '/login';
    }

    // Reject the promise so the specific component can still handle loading states
    return Promise.reject(error);
  }
);

export default api;

export const openAuthenticatedFile = async (apiPath) => {
  if (!apiPath.startsWith('/') || apiPath.startsWith('//')) throw new Error('Invalid private file path.');
  const response = await api.get(apiPath.replace(/^\/api\//, '/'), { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'receipt';
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

