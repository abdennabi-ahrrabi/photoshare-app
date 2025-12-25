import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get rating stats for a photo
router.get('/:photoId/ratings', async (req, res) => {
  try {
    const { photoId } = req.params;

    // Check if photo exists
    const photoCheck = await pool.query('SELECT id FROM photos WHERE id = $1', [photoId]);
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const result = await pool.query(
      `SELECT
        COALESCE(AVG(rating), 0) as average,
        COUNT(*) as count,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star
       FROM ratings
       WHERE photo_id = $1`,
      [photoId]
    );

    const stats = result.rows[0];

    res.json({
      average: parseFloat(stats.average) || 0,
      count: parseInt(stats.count) || 0,
      distribution: {
        1: parseInt(stats.one_star) || 0,
        2: parseInt(stats.two_star) || 0,
        3: parseInt(stats.three_star) || 0,
        4: parseInt(stats.four_star) || 0,
        5: parseInt(stats.five_star) || 0,
      },
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate a photo (authenticated users only)
router.post('/:photoId/ratings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Check if photo exists
    const photoCheck = await pool.query('SELECT id FROM photos WHERE id = $1', [photoId]);
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Upsert rating (insert or update)
    const result = await pool.query(
      `INSERT INTO ratings (photo_id, user_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (photo_id, user_id)
       DO UPDATE SET rating = $3, created_at = CURRENT_TIMESTAMP
       RETURNING id, rating, created_at`,
      [photoId, req.user!.id, rating]
    );

    const newRating = result.rows[0];

    // Get updated average
    const avgResult = await pool.query(
      'SELECT COALESCE(AVG(rating), 0) as average, COUNT(*) as count FROM ratings WHERE photo_id = $1',
      [photoId]
    );

    res.json({
      id: newRating.id,
      rating: newRating.rating,
      createdAt: newRating.created_at,
      photoStats: {
        average: parseFloat(avgResult.rows[0].average) || 0,
        count: parseInt(avgResult.rows[0].count) || 0,
      },
    });
  } catch (error) {
    console.error('Rate photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's rating for a photo
router.get('/:photoId/ratings/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;

    const result = await pool.query(
      'SELECT rating FROM ratings WHERE photo_id = $1 AND user_id = $2',
      [photoId, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.json({ rating: null });
    }

    res.json({ rating: result.rows[0].rating });
  } catch (error) {
    console.error('Get user rating error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
