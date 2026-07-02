import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('Sending request with token:', token ? 'Exists' : 'Missing');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Auth error detected, clearing storage');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // window.location.href = '/login'; // Optional: auto redirect
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
};

export const excavationService = {
  create: (data) => api.post('/excavations', data),
  getAll: () => api.get('/excavations'),
  getMy: () => api.get('/excavations/my'),
  checkCollision: (coords) => api.post('/excavations/check-collision', coords),
};

export const pipelineService = {
  getAll: () => api.get('/pipelines'),
};

export const patrolService = {
  getTasks: () => api.get('/patrol/tasks'),
  verify: (data) => api.post('/patrol/verify', data),
  getUsers: () => api.get('/patrol/users'),
  assign: (data) => api.post('/patrol/assign', data),
  syncTracks: (data) => api.post('/patrol/sync-tracks', data),
  getTracks: () => api.get('/patrol/tracks'),
  checkIn: (requestId) => api.post('/patrol/check-in', { requestId }),
  getVerifications: () => api.get('/patrol/verifications'),
  reportIncident: (data) => api.post('/patrol/report-incident', data),
  getMyVerifications: () => api.get('/patrol/my-verifications'),
};

export const imageryService = {
  getDetections: () => api.get('/imagery/detections'),
  triggerScan: (bounds) => api.post('/imagery/scan', bounds || {}),
};

export const cgdService = {
  getTelemetry: () => api.get('/cgd/telemetry'),
};

export default api;
