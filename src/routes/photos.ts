import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadToBlob, deleteFromBlob, getBlobUrl } from '../services/blobService';
import { getFromCache, setInCache, clearPhotoCache } from '../services/redisService';

const router = Router();

// Get all photos (paginated)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;

    // Check cache first
    const cacheKey = `photos:list:page:${page}:limit:${limit}`;
    const cached = await getFromCache<{ photos: unknown[]; pagination: unknown }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

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
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM photos');
    const total = parseInt(countResult.rows[0].count);

    const response = {
      photos: photosResult.rows.map(formatPhoto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the response for 60 seconds
    await setInCache(cacheKey, response, 60);

    res.json(response);
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search photos
router.get('/search', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { q, location, tag } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (q) {
      whereClause += ` AND (p.title ILIKE $${paramIndex} OR p.caption ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }

    if (location) {
      whereClause += ` AND p.location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (tag) {
      whereClause += ` AND EXISTS (SELECT 1 FROM photo_tags pt WHERE pt.photo_id = p.id AND pt.person_name ILIKE $${paramIndex})`;
      params.push(`%${tag}%`);
      paramIndex++;
    }

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
       ${whereClause}
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT p.id) FROM photos p ${whereClause}`,
      params
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
    console.error('Search photos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single photo
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check cache first (only for non-authenticated requests since user-specific data varies)
    const cacheKey = `photos:single:${id}`;
    if (!req.user) {
      const cached = await getFromCache<unknown>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    const photoResult = await pool.query(
      `SELECT p.id, p.title, p.caption, p.location, p.file_path, p.created_at,
              u.id as creator_id, u.display_name as creator_name,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as rating_count,
              COUNT(DISTINCT l.id) as like_count
       FROM photos p
       JOIN users u ON p.creator_id = u.id
       LEFT JOIN ratings r ON p.id = r.photo_id
       LEFT JOIN likes l ON p.id = l.photo_id
       WHERE p.id = $1
       GROUP BY p.id, u.id`,
      [id]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Get tags
    const tagsResult = await pool.query(
      'SELECT person_name FROM photo_tags WHERE photo_id = $1',
      [id]
    );

    // Get user's rating and like status if authenticated
    let userRating = null;
    let userLiked = false;
    if (req.user) {
      const ratingResult = await pool.query(
        'SELECT rating FROM ratings WHERE photo_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (ratingResult.rows.length > 0) {
        userRating = ratingResult.rows[0].rating;
      }

      const likeResult = await pool.query(
        'SELECT id FROM likes WHERE photo_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      userLiked = likeResult.rows.length > 0;
    }

    const photo = formatPhoto(photoResult.rows[0]);
    const tags = tagsResult.rows.map((t: { person_name: string }) => t.person_name);

    const response = {
      ...photo,
      tags,
      userRating,
      userLiked,
    };

    // Cache the response for 60 seconds (only base data, user-specific cached separately)
    if (!req.user) {
      await setInCache(cacheKey, response, 60);
    }

    res.json(response);
  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload photo (any authenticated user)
router.post(
  '/',
  authenticateToken,
  upload.single('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      const { title, caption, location, tags } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Upload to Azure Blob Storage
      const { blobName, url } = await uploadToBlob(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'originals'
      );

      // Insert photo with blob URL
      const photoResult = await pool.query(
        'INSERT INTO photos (creator_id, title, caption, location, file_path) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [req.user!.id, title, caption || null, location || null, blobName]
      );

      const photoId = photoResult.rows[0].id;

      // Insert tags if provided
      if (tags) {
        const tagList = typeof tags === 'string' ? JSON.parse(tags) : tags;
        for (const tag of tagList) {
          await pool.query(
            'INSERT INTO photo_tags (photo_id, person_name) VALUES ($1, $2)',
            [photoId, tag]
          );
        }
      }

      // Clear photo list cache since new photo was added
      await clearPhotoCache();

      res.status(201).json({
        id: photoId,
        url,
        message: 'Photo uploaded successfully',
      });
    } catch (error) {
      console.error('Upload photo error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete photo (own photos only)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check ownership
    const photoResult = await pool.query(
      'SELECT file_path, creator_id FROM photos WHERE id = $1',
      [id]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (photoResult.rows[0].creator_id !== req.user!.id) {
      return res.status(403).json({ error: 'You can only delete your own photos' });
    }

    // Delete from Azure Blob Storage
    await deleteFromBlob(photoResult.rows[0].file_path, 'originals');

    // Delete from database (cascades to tags, comments, ratings)
    await pool.query('DELETE FROM photos WHERE id = $1', [id]);

    // Clear photo cache since photo was deleted
    await clearPhotoCache();

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function formatPhoto(row: Record<string, unknown>) {
  // Convert blob name to full URL
  const filePath = row.file_path as string;
  const imageUrl = filePath.startsWith('http') 
    ? filePath 
    : getBlobUrl('originals', filePath);

  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    location: row.location,
    filePath: imageUrl,
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