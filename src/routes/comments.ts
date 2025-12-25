import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get comments for a photo
router.get('/:photoId/comments', async (req, res) => {
  try {
    const { photoId } = req.params;

    // Check if photo exists
    const photoCheck = await pool.query('SELECT id FROM photos WHERE id = $1', [photoId]);
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const result = await pool.query(
      `SELECT c.id, c.content, c.created_at,
              u.id as user_id, u.display_name, u.role
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.photo_id = $1
       ORDER BY c.created_at DESC`,
      [photoId]
    );

    const comments = result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        displayName: row.display_name,
        role: row.role,
      },
    }));

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add comment (authenticated users only)
router.post('/:photoId/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if photo exists
    const photoCheck = await pool.query('SELECT id FROM photos WHERE id = $1', [photoId]);
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const result = await pool.query(
      'INSERT INTO comments (photo_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, content, created_at',
      [photoId, req.user!.id, content.trim()]
    );

    const comment = result.rows[0];

    res.status(201).json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      user: {
        id: req.user!.id,
        displayName: req.user!.displayName,
        role: req.user!.role,
      },
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment (own comments only)
router.delete('/:photoId/comments/:commentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;

    // Check ownership
    const result = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (result.rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
