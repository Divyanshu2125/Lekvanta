import { create } from 'zustand';
import { api } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  alternatePhone?: string;
  profilePhoto?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface Business {
  id: string;
  name: string;
  logoUrl?: string;
  ownerName?: string;
  panNumber?: string;
  website?: string;
  role?: string;
  gstin?: string;
  type?: string;
  phone?: string;
  email?: string;
  state?: string;
  city?: string;
  address?: string;
  pincode?: string;
  financialYear?: string;
  invoicePrefix?: string;
  purchasePrefix?: string;
}

export interface SignupData {
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  businessType: string;
  state: string;
  address: string;
  gstin?: string;
  financialYear: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  currentBusiness: Business | null;
  businesses: Business[];
  isBackendConnected: boolean;
  isLoading: boolean;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  descopeLogin: (sessionToken: string, descopeUser?: any) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  setCurrentBusiness: (business: Business) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const storedToken = typeof window !== 'undefined' ? localStorage.getItem('lekvanta_token') : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedToken,
  user: null,
  currentBusiness: null,
  businesses: [],
  isBackendConnected: false,
  isLoading: !!storedToken,

  initAuth: async () => {
    set({ isLoading: true });
    try {
      // 1. Health check
      const health = await api.get('/health');
      const isConnected = !!health.success && health.data?.database === 'connected';
      set({ isBackendConnected: isConnected });

      const token = localStorage.getItem('lekvanta_token');
      if (!token) {
        set({ token: null, user: null, currentBusiness: null, businesses: [], isLoading: false });
        return;
      }

      // 2. Validate current session with backend
      const meRes = await api.get('/auth/me');
      if (meRes.success && meRes.data) {
        const businesses: Business[] = meRes.data.businesses || [];
        const savedBusinessId = localStorage.getItem('lekvanta_active_business');
        const activeBusiness =
          businesses.find((b) => b.id === savedBusinessId) || businesses[0] || null;

        set({
          token,
          user: {
            id: meRes.data.id,
            name: meRes.data.name,
            email: meRes.data.email,
            phone: meRes.data.phone,
            alternatePhone: meRes.data.alternatePhone,
            profilePhoto: meRes.data.profilePhoto,
            dob: meRes.data.dob,
            address: meRes.data.address,
            city: meRes.data.city,
            state: meRes.data.state,
            pincode: meRes.data.pincode,
          },
          businesses,
          currentBusiness: activeBusiness,
          isLoading: false,
        });
      } else {
        // Invalid or expired token
        localStorage.removeItem('lekvanta_token');
        localStorage.removeItem('lekvanta_active_business');
        set({ token: null, user: null, currentBusiness: null, businesses: [], isLoading: false });
      }
    } catch {
      // Network/backend unreachable — don't wipe the token, just stop loading
      // so the user can retry or see the login screen
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    // Clear any previous business selection to prevent cross-account leak
    localStorage.removeItem('lekvanta_active_business');
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      const { token, user, businesses } = res.data;
      localStorage.setItem('lekvanta_token', token);
      const activeBusiness = businesses[0] || null;
      if (activeBusiness) {
        localStorage.setItem('lekvanta_active_business', activeBusiness.id);
      }

      set({
        token,
        user,
        businesses,
        currentBusiness: activeBusiness,
        isLoading: false,
      });
      return { success: true };
    }
    set({ isLoading: false });
    return { success: false, error: res.error || 'Invalid email or password' };
  },

  descopeLogin: async (sessionToken: string, descopeUser?: any) => {
    set({ isLoading: true });
    try {
      // Clear any prior active business to ensure clean separation
      localStorage.removeItem('lekvanta_active_business');

      const res = await api.post('/auth/descope-sync', {
        sessionToken,
        user: descopeUser,
      });

      if (res.success && res.data) {
        const { token, user, businesses } = res.data;
        localStorage.setItem('lekvanta_token', token);

        // Always use the authorized businesses returned for this authenticated user
        const activeBusiness = businesses[0] || null;
        if (activeBusiness) {
          localStorage.setItem('lekvanta_active_business', activeBusiness.id);
        }

        set({
          token,
          user,
          businesses,
          currentBusiness: activeBusiness,
          isLoading: false,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: res.error || 'Failed to synchronize Descope session' };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, error: err.message || 'Descope sync failed' };
    }
  },

  signup: async (data: SignupData) => {
    set({ isLoading: true });
    const res = await api.post('/auth/register', data);
    if (res.success && res.data) {
      const { token, user, business } = res.data;
      localStorage.setItem('lekvanta_token', token);
      localStorage.setItem('lekvanta_active_business', business.id);

      set({
        token,
        user,
        businesses: [business],
        currentBusiness: business,
        isLoading: false,
      });
      return { success: true };
    }
    set({ isLoading: false });
    return { success: false, error: res.error || 'Failed to create account and business' };
  },

  setCurrentBusiness: (business: Business) => {
    localStorage.setItem('lekvanta_active_business', business.id);
    set({ currentBusiness: business });
  },

  setUser: (user: User) => {
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('lekvanta_token');
    localStorage.removeItem('lekvanta_active_business');
    try {
      sessionStorage.clear();
    } catch {}
    set({ token: null, user: null, currentBusiness: null, businesses: [], isLoading: false });
  },
}));
