import axios from 'axios';

// Create a generic Axios instance
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    // We must check if window is defined because Next.js does SSR
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle global errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Service-specific API endpoints
export const authAPI = {
  // Using absolute URLs to connect to the specific microservice ports locally
  // On Day 9, we will change these base URLs to point to the AWS API Gateway
  baseURL: '/api/v1/auth',
  
  register: async (userData) => {
    const response = await api.post(`${authAPI.baseURL}/register`, userData);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post(`${authAPI.baseURL}/login`, credentials);
    return response.data;
  }
};

export const flightAPI = {
  baseURL: '/api/v1/flights',
  
  searchFlights: async (params) => {
    // params can include: departureAirport, arrivalAirport, date, minPrice, maxPrice
    const response = await api.get(`${flightAPI.baseURL}/search`, { params });
    return response.data;
  },
  
  getFlights: async () => {
    const response = await api.get(`${flightAPI.baseURL}`);
    return response.data;
  },
  
  getFlight: async (id) => {
    const response = await api.get(`${flightAPI.baseURL}/${id}`);
    return response.data;
  },
  
  getSeats: async (id) => {
    const response = await api.get(`${flightAPI.baseURL}/${id}/seats`);
    return response.data;
  },

  createFlight: async (flightData) => {
    const response = await api.post(`${flightAPI.baseURL}`, flightData);
    return response.data;
  },

  updateFlight: async (id, flightData) => {
    const response = await api.put(`${flightAPI.baseURL}/${id}`, flightData);
    return response.data;
  },

  deleteFlight: async (id) => {
    const response = await api.delete(`${flightAPI.baseURL}/${id}`);
    return response.data;
  }
};

export const bookingAPI = {
  baseURL: '/api/v1/bookings',
  
  createBooking: async (bookingData) => {
    // bookingData requires: flightId, seatId, price, paymentToken
    const response = await api.post(`${bookingAPI.baseURL}`, bookingData);
    return response.data;
  },

  getUserBookings: async (userId) => {
    const response = await api.get(`${bookingAPI.baseURL}/user/${userId}`);
    return response.data;
  },

  cancelBooking: async (bookingId) => {
    const response = await api.put(`${bookingAPI.baseURL}/${bookingId}/cancel`);
    return response.data;
  }
};

export const baggageAPI = {
  baseURL: '/api/v1/baggage',
  
  getBaggageByBooking: async (bookingId) => {
    const response = await api.get(`${baggageAPI.baseURL}/booking/${bookingId}`);
    return response.data;
  },
  
  getBaggageById: async (baggageId) => {
    const response = await api.get(`${baggageAPI.baseURL}/${baggageId}`);
    return response.data;
  },

  registerBaggage: async (baggageData) => {
    const response = await api.post(`${baggageAPI.baseURL}`, baggageData);
    return response.data;
  }
};

export const userAPI = {
  baseURL: '/api/v1/users',

  downloadData: async () => {
    const response = await api.get(`${userAPI.baseURL}/me/data`);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete(`${userAPI.baseURL}/me`);
    return response.data;
  }
};

export default api;
