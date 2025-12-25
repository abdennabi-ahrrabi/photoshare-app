import { useState, useEffect, useRef, useCallback } from 'react';
import type { Comment } from '../types';
import { commentsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Comments.css';

interface CommentsProps {
  photoId: string;
}

export function Comments({ photoId }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set());
  const commentsListRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const data = await commentsApi.getForPhoto(photoId);

      if (!silent) {
        setComments(data);
      } else {
        const currentIds = new Set(comments.map(c => c.id));
        const newIds = data.filter(c => !currentIds.has(c.id)).map(c => c.id);

        if (newIds.length > 0) {
          setNewCommentIds(prev => new Set([...prev, ...newIds]));
          setTimeout(() => {
            setNewCommentIds(prev => {
              const next = new Set(prev);
              newIds.forEach(id => next.delete(id));
              return next;
            });
          }, 3000);
        }
        setComments(data);
      }
    } catch {
      if (!silent) {
        setError('Failed to load comments');
      }
    } finally {
      setIsLoading(false);
    }
  }, [photoId, comments]);

  useEffect(() => {
    loadComments();
  }, [photoId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadComments(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const comment = await commentsApi.add(photoId, newComment.trim());

      setNewCommentIds(prev => new Set([...prev, comment.id]));
      setComments([comment, ...comments]);
      setNewComment('');

      if (commentsListRef.current) {
        commentsListRef.current.scrollTop = 0;
      }

      setTimeout(() => {
        setNewCommentIds(prev => {
          const next = new Set(prev);
          next.delete(comment.id);
          return next;
        });
      }, 3000);
    } catch {
      setError('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await commentsApi.delete(photoId, commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch {
      setError('Failed to delete comment');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="comments-loading">Loading comments...</div>;
  }

  return (
    <div className="comments-section">
      {/* Fixed header and form */}
      <div className="comments-fixed">
        <h3>Comments <span className="count">({comments.length})</span></h3>

        {error && <div className="comments-error">{error}</div>}

        {user ? (
          <form onSubmit={handleSubmit} className="comment-form">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={1}
            />
            <button type="submit" disabled={isSubmitting || !newComment.trim()}>
              {isSubmitting ? '...' : 'Post'}
            </button>
          </form>
        ) : (
          <p className="login-prompt">Login to comment</p>
        )}
      </div>

      {/* Scrollable comments list */}
      <div className="comments-scroll" ref={commentsListRef}>
        <div className="comments-list">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment ${newCommentIds.has(comment.id) ? 'new-comment' : ''}`}
            >
              <div className="comment-header">
                <div className="comment-author-info">
                  <span className="comment-avatar">
                    {comment.user.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="comment-author">
                    {comment.user.displayName}
                    {comment.user.role === 'creator' && <span className="creator-badge">Creator</span>}
                  </span>
                </div>
                <span className="comment-date">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="comment-content">{comment.content}</p>
              {user?.id === comment.user.id && (
                <button className="delete-comment" onClick={() => handleDelete(comment.id)}>
                  Delete
                </button>
              )}
            </div>
          ))}

          {comments.length === 0 && (
            <p className="no-comments">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </div>
    </div>
  );
}
