import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `SELECT u.id, u.display_name, u.bio, u.avatar_url, u.created_at,
              (SELECT COUNT(*) FROM photos WHERE creator_id = u.id) as photo_count,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count
       FROM users u WHERE u.id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if current user follows this user
    let isFollowing = false;
    if (req.user && req.user.id !== id) {
      const followCheck = await pool.query(
        'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
        [req.user.id, id]
      );
      isFollowing = followCheck.rows.length > 0;
    }

    res.json({
      id: user.id,
      displayName: user.display_name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      photoCount: parseInt(user.photo_count),
      followerCount: parseInt(user.follower_count),
      followingCount: parseInt(user.following_count),
      isFollowing,
      isOwnProfile: req.user?.id === id,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's photos
router.get('/:id/photos', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;

    const photosResult = await pool.query(
      `SELECT p.id, p.title, p.caption, p.location, p.file_path, p.created_at,
              u.id as creator_id, u.display_name as creator_name,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as rating_count,
              COUNT(DISTINCT c.id) as comment_count,
              COUNT(DISTINCT l.id) as like_count
       FROM photos p
       JOIN users u ON p.creator_id = u.id
       LEFT JOIN ratings r ON p.id = r.photo_id
       LEFT JOIN comments c ON p.id = c.photo_id
       LEFT JOIN likes l ON p.id = l.photo_id
       WHERE p.creator_id = $1
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM photos WHERE creator_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      photos: photosResult.rows.map(formatPhoto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get user photos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update own profile
router.patch('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { displayName, bio, theme } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (displayName) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(displayName);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(bio);
    }
    if (theme) {
      updates.push(`theme = $${paramIndex++}`);
      values.push(theme);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(userId);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's liked photos
router.get('/:id/likes', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;

    const photosResult = await pool.query(
      `SELECT p.id, p.title, p.caption, p.location, p.file_path, p.created_at,
              u.id as creator_id, u.display_name as creator_name,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as rating_count,
              COUNT(DISTINCT c.id) as comment_count,
              COUNT(DISTINCT l2.id) as like_count
       FROM likes l
       JOIN photos p ON l.photo_id = p.id
       JOIN users u ON p.creator_id = u.id
       LEFT JOIN ratings r ON p.id = r.photo_id
       LEFT JOIN comments c ON p.id = c.photo_id
       LEFT JOIN likes l2 ON p.id = l2.photo_id
       WHERE l.user_id = $1
       GROUP BY p.id, u.id, l.created_at
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE user_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      photos: photosResult.rows.map(formatPhoto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get user likes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function formatPhoto(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    location: row.location,
    filePath: row.file_path,
    createdAt: row.created_at,
    creator: {
      id: row.creator_id,
      displayName: row.creator_name,
    },
    avgRating: parseFloat(row.avg_rating as string) || 0,
    ratingCount: parseInt(row.rating_count as string) || 0,
    commentCount: parseInt(row.comment_count as string) || 0,
    likeCount: parseInt(row.like_count as string) || 0,
  };
}

export default router;
