import { Link } from 'react-router-dom';
import type { Photo } from '../types';
import { getImageUrl } from '../services/api';
import './PhotoCard.css';

interface PhotoCardProps {
  photo: Photo;
}

export function PhotoCard({ photo }: PhotoCardProps) {
  return (
    <Link to={`/photo/${photo.id}`} className="photo-card">
      <div className="photo-card-image">
        <img src={getImageUrl(photo.filePath)} alt={photo.title} loading="lazy" />
        <div className="photo-card-overlay">
          <div className="photo-card-overlay-stats">
            <span>
              <svg className="star-icon" viewBox="0 0 24 24" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {photo.avgRating.toFixed(1)}
            </span>
            <span className="like-stat">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {photo.likeCount || 0}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {photo.commentCount || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="photo-card-content">
        <h3>{photo.title}</h3>
        <div className="photo-card-meta">
          <span className="photo-card-avatar">
            {photo.creator.displayName.charAt(0).toUpperCase()}
          </span>
          <span className="photo-card-creator">{photo.creator.displayName}</span>
        </div>
        {photo.location && (
          <div className="photo-card-location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {photo.location}
          </div>
        )}
        <div className="photo-card-footer">
          <span className="photo-card-stat rating">
            <svg viewBox="0 0 24 24" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            {photo.avgRating.toFixed(1)}
          </span>
          <span className="photo-card-stat likes">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {photo.likeCount || 0}
          </span>
          <span className="photo-card-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {photo.commentCount || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
