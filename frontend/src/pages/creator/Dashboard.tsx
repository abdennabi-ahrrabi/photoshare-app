import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Photo } from '../../types';
import { photosApi, getImageUrl } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

export function CreatorDashboard() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMyPhotos();
  }, []);

  const loadMyPhotos = async () => {
    setIsLoading(true);
    try {
      // For now, load all photos and filter client-side
      // In production, you'd want a dedicated endpoint
      const result = await photosApi.getAll(1, 100);
      const myPhotos = result.photos.filter((p) => p.creator.id === user?.id);
      setPhotos(myPhotos);
    } catch {
      setError('Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await photosApi.delete(photoId);
      setPhotos(photos.filter((p) => p.id !== photoId));
    } catch {
      alert('Failed to delete photo');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>My Photos</h1>
        <Link to="/upload" className="upload-btn">Upload New Photo</Link>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      {isLoading ? (
        <div className="dashboard-loading">Loading your photos...</div>
      ) : photos.length === 0 ? (
        <div className="dashboard-empty">
          <p>You haven't uploaded any photos yet.</p>
          <Link to="/upload">Upload your first photo</Link>
        </div>
      ) : (
        <div className="photos-table">
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Title</th>
                <th>Location</th>
                <th>Rating</th>
                <th>Comments</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {photos.map((photo) => (
                <tr key={photo.id}>
                  <td>
                    <img
                      src={getImageUrl(photo.filePath)}
                      alt={photo.title}
                      className="photo-thumbnail"
                    />
                  </td>
                  <td>
                    <Link to={`/photo/${photo.id}`}>{photo.title}</Link>
                  </td>
                  <td>{photo.location || '-'}</td>
                  <td>
                    {photo.avgRating.toFixed(1)} ({photo.ratingCount})
                  </td>
                  <td>{photo.commentCount || 0}</td>
                  <td>{formatDate(photo.createdAt)}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
