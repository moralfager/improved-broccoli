import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      
      setAuth: (user, token) => {
        localStorage.setItem('accessToken', token);
        set({ user, accessToken: token });
      },
      
      clearAuth: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null });
      },
      
      isAuthenticated: () => {
        return !!get().accessToken;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

