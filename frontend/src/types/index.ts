export interface User {
  id: string;
  email: string;
  role: 'creator' | 'consumer';
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  theme?: 'light' | 'dark';
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  photoCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Photo {
  id: string;
  title: string;
  caption: string | null;
  location: string | null;
  filePath: string;
  createdAt: string;
  creator: {
    id: string;
    displayName: string;
  };
  avgRating: number;
  ratingCount: number;
  commentCount?: number;
  likeCount?: number;
  tags?: string[];
  userRating?: number | null;
  userLiked?: boolean;
}

export interface PhotosResponse {
  photos: Photo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    role: 'creator' | 'consumer';
  };
}

export interface RatingStats {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface RatingResponse {
  id: string;
  rating: number;
  createdAt: string;
  photoStats: {
    average: number;
    count: number;
  };
}

export interface LikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'rating';
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  photo: {
    id: string;
    title: string;
    filePath: string;
  } | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  unreadCount: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  photoCount: number;
  coverPhoto: string | null;
}

export interface CollectionDetail extends Collection {
  owner: {
    id: string;
    displayName: string;
  };
  isOwner: boolean;
  photos: Photo[];
}

export interface FollowUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followedAt: string;
}

export interface AdminStats {
  stats: {
    totalUsers: number;
    totalPhotos: number;
    totalComments: number;
    pendingReports: number;
  };
  recentUsers: Array<{
    id: string;
    display_name: string;
    email: string;
    created_at: string;
  }>;
  recentPhotos: Array<{
    id: string;
    title: string;
    created_at: string;
    creator: string;
  }>;
}

export interface Report {
  id: string;
  type: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  reporterName: string;
  photoTitle?: string;
  photoPath?: string;
  reportedUserName?: string;
}
