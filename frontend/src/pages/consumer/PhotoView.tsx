import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Photo } from '../../types';
import { photosApi, ratingsApi, likesApi, getImageUrl } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Rating } from '../../components/Rating';
import { Comments } from '../../components/Comments';
import { LikeButton } from '../../components/LikeButton';
import { Lightbox } from '../../components/Lightbox';
import './PhotoView.css';

export function PhotoView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadPhoto();
    }
  }, [id]);

  const loadPhoto = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await photosApi.getById(id!);
      setPhoto(data);
    } catch {
      setError('Failed to load photo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!user || !photo) return;

    try {
      const result = await ratingsApi.rate(photo.id, rating);
      setPhoto({
        ...photo,
        avgRating: result.photoStats.average,
        ratingCount: result.photoStats.count,
        userRating: rating,
      });
    } catch {
      alert('Failed to submit rating');
    }
  };

  const handleLikeChange = (liked: boolean, count: number) => {
    if (photo) {
      setPhoto({
        ...photo,
        userLiked: liked,
        likeCount: count,
      });
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: photo?.title,
          text: `Check out this photo: ${photo?.title}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="photo-view-loading">Loading...</div>;
  }

  if (error || !photo) {
    return (
      <div className="photo-view-error">
        <p>{error || 'Photo not found'}</p>
        <Link to="/">Back to gallery</Link>
      </div>
    );
  }

  const hasExtras = photo.location || (photo.tags && photo.tags.length > 0);

  return (
    <div className="photo-view-page">
      <Link to="/" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </Link>

      <div className="photo-view-content">
        <div className="photo-view-image" onClick={() => setIsLightboxOpen(true)}>
          <img src={getImageUrl(photo.filePath)} alt={photo.title} />
          <div className="photo-zoom-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            Click to zoom
          </div>
        </div>

        <div className="photo-view-details">
          {/* Compact info row */}
          <div className="photo-info">
            <h1>{photo.title}</h1>
            <div className="photo-meta">
              <Link to={`/user/${photo.creator.id}`} className="photo-meta-author">
                <span className="photo-meta-avatar">
                  {photo.creator.displayName.charAt(0).toUpperCase()}
                </span>
                <span className="photo-creator">{photo.creator.displayName}</span>
              </Link>
              <span className="photo-date">{formatDate(photo.createdAt)}</span>
            </div>

            {photo.caption && <p className="photo-caption">{photo.caption}</p>}

            {hasExtras && (
              <div className="photo-extras">
                {photo.location && (
                  <span className="photo-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {photo.location}
                  </span>
                )}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="photo-tags">
                    <strong>@</strong>
                    {photo.tags.map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions row */}
          <div className="photo-actions">
            <LikeButton
              photoId={photo.id}
              initialLiked={photo.userLiked}
              initialCount={photo.likeCount || 0}
              onLikeChange={handleLikeChange}
              size="large"
            />
            <button className="share-button" onClick={handleShare}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </button>
          </div>

          {/* Compact rating row */}
          <div className="photo-rating">
            <Rating
              value={photo.avgRating}
              count={photo.ratingCount}
              userRating={photo.userRating}
              onRate={handleRate}
              readonly={!user}
            />
            {!user && <span className="login-to-rate">Login to rate</span>}
          </div>

          {/* Comments section - takes remaining space */}
          <div className="comments-wrapper">
            <Comments photoId={photo.id} />
          </div>
        </div>
      </div>

      <Lightbox
        src={getImageUrl(photo.filePath)}
        alt={photo.title}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}
