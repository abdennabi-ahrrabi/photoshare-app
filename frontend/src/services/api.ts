import axios from 'axios';
import type {
  AuthResponse, Photo, PhotosResponse, Comment, RatingStats, RatingResponse, User,
  LikeResponse, UserProfile, Notification, NotificationsResponse,
  Collection, CollectionDetail, FollowUser, AdminStats, Report
} from '../types';

// Use environment variable or fallback to Azure backend
const API_URL = import.meta.env.VITE_API_URL || 'http://4.165.86.186/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  register: async (email: string, password: string, displayName: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/register', { email, password, displayName });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

// Photos
export const photosApi = {
  getAll: async (page = 1, limit = 12): Promise<PhotosResponse> => {
    const { data } = await api.get('/photos', { params: { page, limit } });
    return data;
  },

  search: async (params: { q?: string; location?: string; tag?: string; page?: number; limit?: number }): Promise<PhotosResponse> => {
    const { data } = await api.get('/photos/search', { params });
    return data;
  },

  getById: async (id: string): Promise<Photo> => {
    const { data } = await api.get(`/photos/${id}`);
    return data;
  },

  upload: async (formData: FormData): Promise<{ id: string; message: string }> => {
    const { data } = await api.post('/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/photos/${id}`);
  },

  getTrending: async (page = 1, limit = 12): Promise<PhotosResponse> => {
    const { data } = await api.get('/photos/trending', { params: { page, limit } });
    return data;
  },
};

// Comments
export const commentsApi = {
  getForPhoto: async (photoId: string): Promise<Comment[]> => {
    const { data } = await api.get(`/photos/${photoId}/comments`);
    return data;
  },

  add: async (photoId: string, content: string): Promise<Comment> => {
    const { data } = await api.post(`/photos/${photoId}/comments`, { content });
    return data;
  },

  delete: async (photoId: string, commentId: string): Promise<void> => {
    await api.delete(`/photos/${photoId}/comments/${commentId}`);
  },
};

// Ratings
export const ratingsApi = {
  getForPhoto: async (photoId: string): Promise<RatingStats> => {
    const { data } = await api.get(`/photos/${photoId}/ratings`);
    return data;
  },

  rate: async (photoId: string, rating: number): Promise<RatingResponse> => {
    const { data } = await api.post(`/photos/${photoId}/ratings`, { rating });
    return data;
  },

  getMyRating: async (photoId: string): Promise<{ rating: number | null }> => {
    const { data } = await api.get(`/photos/${photoId}/ratings/me`);
    return data;
  },
};

// Likes
export const likesApi = {
  like: async (photoId: string): Promise<LikeResponse> => {
    const { data } = await api.post(`/likes/${photoId}`);
    return data;
  },

  unlike: async (photoId: string): Promise<LikeResponse> => {
    const { data } = await api.delete(`/likes/${photoId}`);
    return data;
  },

  getStatus: async (photoId: string): Promise<LikeResponse> => {
    const { data } = await api.get(`/likes/${photoId}/status`);
    return data;
  },
};

// Users
export const usersApi = {
  getProfile: async (id: string): Promise<UserProfile> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  getPhotos: async (id: string, page = 1, limit = 12): Promise<PhotosResponse> => {
    const { data } = await api.get(`/users/${id}/photos`, { params: { page, limit } });
    return data;
  },

  updateProfile: async (updates: { displayName?: string; bio?: string; theme?: string }): Promise<void> => {
    await api.patch('/users/me', updates);
  },

  getLikedPhotos: async (id: string, page = 1, limit = 12): Promise<PhotosResponse> => {
    const { data } = await api.get(`/users/${id}/likes`, { params: { page, limit } });
    return data;
  },
};

// Follows
export const followsApi = {
  follow: async (userId: string): Promise<{ following: boolean; followerCount: number }> => {
    const { data } = await api.post(`/follows/${userId}`);
    return data;
  },

  unfollow: async (userId: string): Promise<{ following: boolean; followerCount: number }> => {
    const { data } = await api.delete(`/follows/${userId}`);
    return data;
  },

  getFollowers: async (userId: string, page = 1, limit = 20): Promise<{ users: FollowUser[]; total: number }> => {
    const { data } = await api.get(`/follows/${userId}/followers`, { params: { page, limit } });
    return data;
  },

  getFollowing: async (userId: string, page = 1, limit = 20): Promise<{ users: FollowUser[]; total: number }> => {
    const { data } = await api.get(`/follows/${userId}/following`, { params: { page, limit } });
    return data;
  },
};

// Notifications
export const notificationsApi = {
  getAll: async (page = 1, limit = 20): Promise<NotificationsResponse> => {
    const { data } = await api.get('/notifications', { params: { page, limit } });
    return data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const { data } = await api.get('/notifications/unread-count');
    return data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};

// Collections
export const collectionsApi = {
  getAll: async (): Promise<{ collections: Collection[] }> => {
    const { data } = await api.get('/collections');
    return data;
  },

  create: async (name: string, description?: string, isPublic = true): Promise<{ id: string }> => {
    const { data } = await api.post('/collections', { name, description, isPublic });
    return data;
  },

  getById: async (id: string): Promise<CollectionDetail> => {
    const { data } = await api.get(`/collections/${id}`);
    return data;
  },

  addPhoto: async (collectionId: string, photoId: string): Promise<void> => {
    await api.post(`/collections/${collectionId}/photos`, { photoId });
  },

  removePhoto: async (collectionId: string, photoId: string): Promise<void> => {
    await api.delete(`/collections/${collectionId}/photos/${photoId}`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/collections/${id}`);
  },
};

// Admin
export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const { data } = await api.get('/admin/stats');
    return data;
  },

  getUsers: async (page = 1, limit = 20): Promise<{ users: User[]; pagination: { page: number; limit: number; total: number } }> => {
    const { data } = await api.get('/admin/users', { params: { page, limit } });
    return data;
  },

  updateUser: async (id: string, updates: { role?: string; isAdmin?: boolean }): Promise<void> => {
    await api.patch(`/admin/users/${id}`, updates);
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  getReports: async (status = 'pending', page = 1, limit = 20): Promise<{ reports: Report[]; pagination: { page: number; limit: number; total: number } }> => {
    const { data } = await api.get('/admin/reports', { params: { status, page, limit } });
    return data;
  },

  updateReport: async (id: string, status: string): Promise<void> => {
    await api.patch(`/admin/reports/${id}`, { status });
  },

  deletePhoto: async (id: string): Promise<void> => {
    await api.delete(`/admin/photos/${id}`);
  },
};

// Image URL helper - now images are served from Azure Blob Storage
// The filePath from the API already contains the full Azure Blob URL
export const getImageUrl = (filePath: string): string => {
  // If it's already a full URL (Azure Blob), return as-is
  if (filePath.startsWith('http')) {
    return filePath;
  }
  // Fallback for old local paths
  return `https://photoshare9703.blob.core.windows.net/originals/${filePath}`;
};