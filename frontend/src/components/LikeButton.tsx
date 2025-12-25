import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { likesApi } from '../services/api';
import './LikeButton.css';

interface LikeButtonProps {
  photoId: string;
  initialLiked?: boolean;
  initialCount?: number;
  onLikeChange?: (liked: boolean, count: number) => void;
  showCount?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function LikeButton({
  photoId,
  initialLiked = false,
  initialCount = 0,
  onLikeChange,
  showCount = true,
  size = 'medium'
}: LikeButtonProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    try {
      if (liked) {
        const result = await likesApi.unlike(photoId);
        setLiked(false);
        setLikeCount(result.likeCount);
        onLikeChange?.(false, result.likeCount);
      } else {
        const result = await likesApi.like(photoId);
        setLiked(true);
        setLikeCount(result.likeCount);
        onLikeChange?.(true, result.likeCount);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  return (
    <button
      className={`like-button ${liked ? 'liked' : ''} ${isAnimating ? 'animating' : ''} size-${size}`}
      onClick={handleClick}
      disabled={!user}
      title={user ? (liked ? 'Unlike' : 'Like') : 'Login to like'}
    >
      <svg
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {showCount && <span className="like-count">{likeCount}</span>}
    </button>
  );
}
