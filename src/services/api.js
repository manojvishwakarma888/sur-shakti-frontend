import axios from 'axios';
import Cookies from 'js-cookie';
import axiosRetry from 'axios-retry';
import { toast } from 'react-toastify';


// Create the Axios instance
const api = axios.create({
  baseURL: 'http://localhost:5236/api', 
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
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
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