import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Photo } from '../../types';
import { photosApi } from '../../services/api';
import { PhotoCard } from '../../components/PhotoCard';
import { useDebounce } from '../../hooks/useDebounce';
import './Gallery.css';

export function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPhotos, setTotalPhotos] = useState(0);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') || '');

  // Debounce search inputs for real-time search
  const debouncedQuery = useDebounce(searchQuery, 300);
  const debouncedLocation = useDebounce(locationFilter, 300);
  const debouncedTag = useDebounce(tagFilter, 300);

  const loadPhotos = useCallback(async (showSearchIndicator = false) => {
    if (showSearchIndicator) {
      setIsSearching(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      let result;
      if (debouncedQuery || debouncedLocation || debouncedTag) {
        result = await photosApi.search({
          q: debouncedQuery || undefined,
          location: debouncedLocation || undefined,
          tag: debouncedTag || undefined,
          page
        });
      } else {
        result = await photosApi.getAll(page);
      }

      setPhotos(result.photos);
      setTotalPages(result.pagination.totalPages);
      setTotalPhotos(result.pagination.total);
    } catch {
      setError('Failed to load photos');
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [debouncedQuery, debouncedLocation, debouncedTag, page]);

  // Real-time search effect
  useEffect(() => {
    setPage(1);
    loadPhotos(true);

    // Update URL params silently
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (debouncedLocation) params.set('location', debouncedLocation);
    if (debouncedTag) params.set('tag', debouncedTag);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, debouncedLocation, debouncedTag]);

  // Page change effect
  useEffect(() => {
    loadPhotos();
  }, [page]);

  // Auto-refresh gallery every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadPhotos(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadPhotos]);

  const clearFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setTagFilter('');
    setPage(1);
  };

  const hasFilters = debouncedQuery || debouncedLocation || debouncedTag;

  return (
    <div className="gallery-page">
      <section className="gallery-hero">
        <h1>Discover Amazing Photos</h1>
        <p>Explore beautiful moments captured by our community of photographers</p>

        <div className="search-section">
          <div className="search-form">
            <div className="search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && (
                <div className="search-spinner"></div>
              )}
            </div>
            <div className="search-filters">
              <input
                type="text"
                placeholder="Location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
              <input
                type="text"
                placeholder="Tagged"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              />
            </div>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="clear-btn">
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="gallery-content">
        {error && <div className="gallery-error">{error}</div>}

        <div className="gallery-header">
          <h2>{hasFilters ? 'Search Results' : 'Latest Photos'}</h2>
          <div className="gallery-header-right">
            {isSearching && <span className="live-indicator">Searching...</span>}
            {!isLoading && <span className="results-count">{totalPhotos} photos</span>}
          </div>
        </div>

        {isLoading ? (
          <div className="gallery-loading">
            <div className="spinner"></div>
            <span>Loading photos...</span>
          </div>
        ) : photos.length === 0 ? (
          <div className="gallery-empty">
            <svg className="gallery-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <h3>{hasFilters ? 'No photos found' : 'No photos yet'}</h3>
            <p>{hasFilters ? 'Try adjusting your search filters' : 'Check back later for new uploads!'}</p>
          </div>
        ) : (
          <>
            <div className="photo-grid">
              {photos.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => setPage(page - 1)} disabled={page === 1}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Previous
                </button>
                <div className="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`page-number ${pageNum === page ? 'active' : ''}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                  Next
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
