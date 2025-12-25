import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Follow a user
router.post('/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = req.user!.id;

    if (userId === followerId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, userId]
    );

    if (existingFollow.rows.length > 0) {
      return res.status(400).json({ error: 'Already following' });
    }

    // Add follow
    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, userId]
    );

    // Create notification
    await pool.query(
      `INSERT INTO notifications (user_id, type, actor_id, message)
       VALUES ($1, 'follow', $2, 'started following you')`,
      [userId, followerId]
    );

    // Get updated counts
    const followerCount = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [userId]
    );

    res.json({
      following: true,
      followerCount: parseInt(followerCount.rows[0].count),
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfollow a user
router.delete('/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = req.user!.id;

    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, userId]
    );

    // Get updated counts
    const followerCount = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [userId]
    );

    res.json({
      following: false,
      followerCount: parseInt(followerCount.rows[0].count),
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get followers
router.get('/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const followersResult = await pool.query(
      `SELECT u.id, u.display_name, u.avatar_url, f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE following_id = $1',
      [userId]
    );

    res.json({
      users: followersResult.rows.map(row => ({
        id: row.id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        followedAt: row.followed_at,
      })),
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get following
router.get('/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const followingResult = await pool.query(
      `SELECT u.id, u.display_name, u.avatar_url, f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE follower_id = $1',
      [userId]
    );

    res.json({
      users: followingResult.rows.map(row => ({
        id: row.id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        followedAt: row.followed_at,
      })),
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
