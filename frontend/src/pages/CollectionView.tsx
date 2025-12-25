import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { CollectionDetail, Photo } from '../types';
import { collectionsApi, getImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { PhotoCard } from '../components/PhotoCard';
import './CollectionView.css';

export function CollectionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCollection();
    }
  }, [id]);

  const loadCollection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await collectionsApi.getById(id!);
      setCollection(data);
    } catch {
      setError('Failed to load collection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    if (!collection || removingPhotoId) return;

    setRemovingPhotoId(photoId);
    try {
      await collectionsApi.removePhoto(collection.id, photoId);
      setCollection({
        ...collection,
        photos: collection.photos.filter(p => p.id !== photoId),
        photoCount: collection.photoCount - 1,
      });
    } catch {
      setError('Failed to remove photo');
    } finally {
      setRemovingPhotoId(null);
    }
  };

  const handleDelete = async () => {
    if (!collection || !confirm('Are you sure you want to delete this collection? This cannot be undone.')) return;

    try {
      await collectionsApi.delete(collection.id);
      navigate('/collections');
    } catch {
      setError('Failed to delete collection');
    }
  };

  if (isLoading) {
    return (
      <div className="collection-view-page">
        <div className="collection-loading">
          <div className="spinner"></div>
          <p>Loading collection...</p>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="collection-view-page">
        <div className="collection-error">
          <h2>Oops!</h2>
          <p>{error || 'Collection not found'}</p>
          <Link to="/collections" className="btn btn-primary">Back to Collections</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-view-page">
      {/* Header */}
      <div className="collection-view-header">
        <Link to="/collections" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Collections
        </Link>

        <div className="collection-view-info">
          <div className="collection-view-title">
            <h1>{collection.name}</h1>
            <span className={`visibility-badge ${collection.isPublic ? 'public' : 'private'}`}>
              {collection.isPublic ? 'Public' : 'Private'}
            </span>
          </div>

          {collection.description && (
            <p className="collection-view-description">{collection.description}</p>
          )}

          <div className="collection-view-meta">
            <Link to={`/user/${collection.owner.id}`} className="owner-link">
              <span className="owner-avatar">
                {collection.owner.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="owner-name">{collection.owner.displayName}</span>
            </Link>
            <span className="meta-separator">-</span>
            <span className="photo-count">{collection.photoCount} photos</span>
          </div>
        </div>

        {collection.isOwner && (
          <div className="collection-view-actions">
            <button className="btn btn-secondary delete-collection-btn" onClick={handleDelete}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Photos Grid */}
      {collection.photos.length === 0 ? (
        <div className="collection-empty">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <h2>No photos yet</h2>
          <p>Start adding photos to this collection from the gallery</p>
          <Link to="/" className="btn btn-primary">Browse Gallery</Link>
        </div>
      ) : (
        <div className="collection-photos-grid">
          {collection.photos.map((photo) => (
            <div key={photo.id} className="collection-photo-wrapper">
              <PhotoCard photo={photo} />
              {collection.isOwner && (
                <button
                  className="remove-photo-btn"
                  onClick={() => handleRemovePhoto(photo.id)}
                  disabled={removingPhotoId === photo.id}
                  title="Remove from collection"
                >
                  {removingPhotoId === photo.id ? (
                    <div className="mini-spinner"></div>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
