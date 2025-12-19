import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (data: { username: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
};

// Users API
export const usersApi = {
  getMe: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  updateName: async (name: string) => {
    const response = await api.put('/users/name', { name });
    return response.data;
  },

  updateEmail: async (email: string) => {
    const response = await api.put('/users/email', { email });
    return response.data;
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/users/password', { currentPassword, newPassword });
    return response.data;
  },

  updateTelegram: async (telegram: string) => {
    const response = await api.put('/users/telegram', { telegram });
    return response.data;
  },
};

// Calendar API
export const calendarApi = {
  getDays: async (page = 1, limit = 20) => {
    const response = await api.get(`/calendar?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getDaysByDateRange: async (startDate: string, endDate: string) => {
    const response = await api.get(`/calendar?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },
  
  getDay: async (date: string) => {
    const response = await api.get(`/calendar/${date}`);
    return response.data;
  },
  
  createOrUpdateDay: async (data: {
    date: string;
    title?: string;
    mood?: string;
    note?: string;
  }) => {
    const response = await api.post('/calendar', data);
    return response.data;
  },
  
  addItem: async (date: string, data: {
    type: 'plan' | 'note' | 'gift' | 'place';
    text: string;
    time?: string;
  }) => {
    const response = await api.post(`/calendar/${date}/items`, data);
    return response.data;
  },
  
  deleteItem: async (itemId: number) => {
    const response = await api.delete(`/calendar/items/${itemId}`);
    return response.data;
  },

  deleteDay: async (date: string) => {
    const response = await api.delete(`/calendar/${date}`);
    return response.data;
  },
};

// Media API
export const mediaApi = {
  upload: async (file: File, date: string, order?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('date', date);
    if (order !== undefined) {
      formData.append('order', order.toString());
    }
    
    const response = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  delete: async (photoId: number) => {
    const response = await api.delete(`/media/${photoId}`);
    return response.data;
  },
  
  getUrl: (path: string) => {
    return `${API_URL}/${path}`;
  },
};

// Periods API
export const periodsApi = {
  getAll: async () => {
    const response = await api.get('/periods');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/periods/${id}`);
    return response.data;
  },
  
  create: async (data: {
    name: string;
    startDate: string;
    endDate?: string;
    color: string;
    order?: number;
  }) => {
    const response = await api.post('/periods', data);
    return response.data;
  },
  
  update: async (id: number, data: {
    name?: string;
    startDate?: string;
    endDate?: string;
    color?: string;
    order?: number;
  }) => {
    const response = await api.put(`/periods/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/periods/${id}`);
    return response.data;
  },
};

// Plans API
export const plansApi = {
  getAll: async (filters?: { upcoming?: boolean; past?: boolean; type?: string }) => {
    const params = new URLSearchParams();
    if (filters?.upcoming) params.append('upcoming', 'true');
    if (filters?.past) params.append('past', 'true');
    if (filters?.type) params.append('type', filters.type);
    const response = await api.get(`/plans?${params.toString()}`);
    return response.data;
  },
  
  getToday: async () => {
    const response = await api.get('/plans/today');
    return response.data;
  },
  
  getUpcoming: async (days = 5) => {
    const response = await api.get(`/plans/upcoming?days=${days}`);
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/plans/${id}`);
    return response.data;
  },
  
  create: async (data: {
    date: string;
    time?: string;
    title: string;
    description?: string;
    type: string;
    location?: string;
    repeat?: string;
    reminder?: boolean;
  }) => {
    const response = await api.post('/plans', data);
    return response.data;
  },
  
  update: async (id: number, data: any) => {
    const response = await api.put(`/plans/${id}`, data);
    return response.data;
  },
  
  complete: async (id: number) => {
    const response = await api.patch(`/plans/${id}/complete`);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/plans/${id}`);
    return response.data;
  },
};

// Important Dates API
export const importantDatesApi = {
  getAll: async () => {
    const response = await api.get('/important-dates');
    return response.data;
  },
  
  getUpcoming: async (limit = 5) => {
    const response = await api.get(`/important-dates/upcoming?limit=${limit}`);
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await api.get(`/important-dates/${id}`);
    return response.data;
  },
  
  create: async (data: {
    date: string;
    title: string;
    description?: string;
    category: string;
    isAnnual?: boolean;
  }) => {
    const response = await api.post('/important-dates', data);
    return response.data;
  },
  
  update: async (id: number, data: any) => {
    const response = await api.put(`/important-dates/${id}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/important-dates/${id}`);
    return response.data;
  },
};

// Letters API
export const lettersApi = {
  getAll: async () => {
    const response = await api.get('/letters');
    return response.data;
  },
  
  create: async (data: { text: string }) => {
    const response = await api.post('/letters', data);
    return response.data;
  },
  
  markAsRead: async (id: number) => {
    const response = await api.patch(`/letters/${id}/read`);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/letters/${id}`);
    return response.data;
  },
};

// Music API
export const musicApi = {
  create: async (data: { title: string; artist?: string; url?: string }) => {
    const response = await api.post('/music', data);
    return response.data;
  },
  
  getPlaylist: async () => {
    const response = await api.get('/music/playlist');
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/music/${id}`);
    return response.data;
  },
};

// Surprises API
export const surprisesApi = {
  create: async (data: { revealDate: string; title: string; description?: string }) => {
    const response = await api.post('/surprises', data);
    return response.data;
  },
  
  getAvailable: async () => {
    const response = await api.get('/surprises/available');
    return response.data;
  },
  
  checkForDate: async (date: string) => {
    const response = await api.get(`/surprises/check/${date}`);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/surprises/${id}`);
    return response.data;
  },
};

// Habits API
export const habitsApi = {
  getAll: async () => {
    const response = await api.get('/habits');
    return response.data;
  },
  
  create: async (data: { name: string; frequency: string }) => {
    const response = await api.post('/habits', data);
    return response.data;
  },
  
  update: async (id: number, data: any) => {
    const response = await api.put(`/habits/${id}`, data);
    return response.data;
  },
  
  markCompleted: async (id: number) => {
    const response = await api.patch(`/habits/${id}/complete`);
    return response.data;
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/habits/${id}`);
    return response.data;
  },
};
