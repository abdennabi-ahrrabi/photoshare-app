import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Like a photo
router.post('/:photoId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const userId = req.user!.id;

    // Check if photo exists
    const photoCheck = await pool.query('SELECT id, creator_id FROM photos WHERE id = $1', [photoId]);
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Check if already liked
    const existingLike = await pool.query(
      'SELECT id FROM likes WHERE photo_id = $1 AND user_id = $2',
      [photoId, userId]
    );

    if (existingLike.rows.length > 0) {
      return res.status(400).json({ error: 'Already liked' });
    }

    // Add like
    await pool.query(
      'INSERT INTO likes (photo_id, user_id) VALUES ($1, $2)',
      [photoId, userId]
    );

    // Create notification for photo owner (if not liking own photo)
    const photoOwnerId = photoCheck.rows[0].creator_id;
    if (photoOwnerId !== userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, actor_id, photo_id, message)
         VALUES ($1, 'like', $2, $3, 'liked your photo')`,
        [photoOwnerId, userId, photoId]
      );
    }

    // Get updated like count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE photo_id = $1',
      [photoId]
    );

    res.json({
      liked: true,
      likeCount: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Like photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlike a photo
router.delete('/:photoId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const userId = req.user!.id;

    await pool.query(
      'DELETE FROM likes WHERE photo_id = $1 AND user_id = $2',
      [photoId, userId]
    );

    // Get updated like count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE photo_id = $1',
      [photoId]
    );

    res.json({
      liked: false,
      likeCount: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Unlike photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user liked a photo
router.get('/:photoId/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const userId = req.user!.id;

    const likeResult = await pool.query(
      'SELECT id FROM likes WHERE photo_id = $1 AND user_id = $2',
      [photoId, userId]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE photo_id = $1',
      [photoId]
    );

    res.json({
      liked: likeResult.rows.length > 0,
      likeCount: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get like status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
