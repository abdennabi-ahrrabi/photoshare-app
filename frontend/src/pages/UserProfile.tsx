import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { UserProfile as UserProfileType, Photo } from '../types';
import { usersApi, followsApi, getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { PhotoCard } from '../components/PhotoCard';
import './UserProfile.css';

export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeTab, setActiveTab] = useState<'photos' | 'liked'>('photos');
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (id) {
      loadProfile();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadPhotos();
    }
  }, [id, activeTab]);

  const loadProfile = async () => {
    try {
      const data = await usersApi.getProfile(id!);
      setProfile(data);
      setIsFollowing(data.isFollowing);
      setFollowerCount(data.followerCount);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      if (activeTab === 'photos') {
        const data = await usersApi.getPhotos(id!);
        setPhotos(data.photos);
      } else {
        const data = await usersApi.getLikedPhotos(id!);
        setPhotos(data.photos);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profile) return;

    try {
      if (isFollowing) {
        const result = await followsApi.unfollow(profile.id);
        setIsFollowing(false);
        setFollowerCount(result.followerCount);
      } else {
        const result = await followsApi.follow(profile.id);
        setIsFollowing(true);
        setFollowerCount(result.followerCount);
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  if (isLoading) {
    return <div className="profile-loading">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="profile-error">
        <p>User not found</p>
        <Link to="/">Back to gallery</Link>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName} />
          ) : (
            <span>{profile.displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="profile-info">
          <h1>{profile.displayName}</h1>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}

          <div className="profile-stats">
            <div className="stat">
              <span className="stat-value">{profile.photoCount}</span>
              <span className="stat-label">Photos</span>
            </div>
            <div className="stat">
              <span className="stat-value">{followerCount}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat">
              <span className="stat-value">{profile.followingCount}</span>
              <span className="stat-label">Following</span>
            </div>
          </div>

          {currentUser && !profile.isOwnProfile && (
            <button
              className={`follow-button ${isFollowing ? 'following' : ''}`}
              onClick={handleFollow}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {profile.isOwnProfile && (
            <Link to="/settings" className="edit-profile-button">
              Edit Profile
            </Link>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Photos
        </button>
        <button
          className={`tab ${activeTab === 'liked' ? 'active' : ''}`}
          onClick={() => setActiveTab('liked')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Liked
        </button>
      </div>

      <div className="profile-photos">
        {photos.length === 0 ? (
          <div className="no-photos">
            <p>{activeTab === 'photos' ? 'No photos yet' : 'No liked photos yet'}</p>
          </div>
        ) : (
          <div className="photo-grid">
            {photos.map(photo => (
              <PhotoCard key={photo.id} photo={photo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
