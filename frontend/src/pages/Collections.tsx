import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Collection } from '../types';
import { collectionsApi, getImageUrl } from '../services/api';
import './Collections.css';

export function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const data = await collectionsApi.getAll();
      setCollections(data.collections);
    } catch {
      setError('Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await collectionsApi.create(newName.trim(), newDescription.trim() || undefined, isPublic);
      setNewName('');
      setNewDescription('');
      setIsPublic(true);
      setShowCreateModal(false);
      loadCollections();
    } catch {
      setError('Failed to create collection');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      await collectionsApi.delete(id);
      setCollections(collections.filter(c => c.id !== id));
    } catch {
      setError('Failed to delete collection');
    }
  };

  if (isLoading) {
    return (
      <div className="collections-page">
        <div className="collections-loading">
          <div className="spinner"></div>
          <p>Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="collections-page">
      <div className="collections-header">
        <div className="collections-title">
          <h1>My Collections</h1>
          <p>Organize your favorite photos into collections</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Collection
        </button>
      </div>

      {error && <div className="collections-error">{error}</div>}

      {collections.length === 0 ? (
        <div className="collections-empty">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
          </div>
          <h2>No collections yet</h2>
          <p>Create your first collection to start organizing photos</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Collection
          </button>
        </div>
      ) : (
        <div className="collections-grid">
          {collections.map((collection) => (
            <div key={collection.id} className="collection-card">
              <Link to={`/collection/${collection.id}`} className="collection-cover">
                {collection.coverPhoto ? (
                  <img src={getImageUrl(collection.coverPhoto)} alt={collection.name} />
                ) : (
                  <div className="collection-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                )}
                <div className="collection-overlay">
                  <span className="photo-count">{collection.photoCount} photos</span>
                </div>
              </Link>
              <div className="collection-info">
                <div className="collection-details">
                  <Link to={`/collection/${collection.id}`} className="collection-name">
                    {collection.name}
                  </Link>
                  {collection.description && (
                    <p className="collection-description">{collection.description}</p>
                  )}
                  <div className="collection-meta">
                    <span className={`visibility-badge ${collection.isPublic ? 'public' : 'private'}`}>
                      {collection.isPublic ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                          Public
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          Private
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(collection.id)}
                  title="Delete collection"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Collection</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Awesome Collection"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description (optional)</label>
                <textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What's this collection about?"
                  rows={3}
                />
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Make this collection public
                </label>
                <p className="checkbox-help">Public collections can be viewed by anyone</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating || !newName.trim()}>
                  {isCreating ? 'Creating...' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
