import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user's collections
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const collectionsResult = await pool.query(
      `SELECT c.id, c.name, c.description, c.is_public, c.created_at,
              COUNT(cp.id) as photo_count,
              (SELECT p.file_path FROM collection_photos cp2
               JOIN photos p ON cp2.photo_id = p.id
               WHERE cp2.collection_id = c.id
               ORDER BY cp2.added_at DESC LIMIT 1) as cover_photo
       FROM collections c
       LEFT JOIN collection_photos cp ON c.id = cp.collection_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({
      collections: collectionsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        isPublic: row.is_public,
        createdAt: row.created_at,
        photoCount: parseInt(row.photo_count),
        coverPhoto: row.cover_photo,
      })),
    });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create collection
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, description, isPublic = true } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(
      'INSERT INTO collections (user_id, name, description, is_public) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, name, description || null, isPublic]
    );

    res.status(201).json({
      id: result.rows[0].id,
      message: 'Collection created',
    });
  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get collection details
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const collectionResult = await pool.query(
      `SELECT c.*, u.display_name as owner_name
       FROM collections c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (collectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const collection = collectionResult.rows[0];

    // Check access
    if (!collection.is_public && collection.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Collection is private' });
    }

    // Get photos
    const photosResult = await pool.query(
      `SELECT p.id, p.title, p.file_path, p.created_at,
              u.id as creator_id, u.display_name as creator_name,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT l.id) as like_count
       FROM collection_photos cp
       JOIN photos p ON cp.photo_id = p.id
       JOIN users u ON p.creator_id = u.id
       LEFT JOIN ratings r ON p.id = r.photo_id
       LEFT JOIN likes l ON p.id = l.photo_id
       WHERE cp.collection_id = $1
       GROUP BY p.id, u.id, cp.added_at
       ORDER BY cp.added_at DESC`,
      [id]
    );

    res.json({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isPublic: collection.is_public,
      createdAt: collection.created_at,
      owner: {
        id: collection.user_id,
        displayName: collection.owner_name,
      },
      isOwner: req.user?.id === collection.user_id,
      photos: photosResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        filePath: row.file_path,
        createdAt: row.created_at,
        creator: {
          id: row.creator_id,
          displayName: row.creator_name,
        },
        avgRating: parseFloat(row.avg_rating) || 0,
        likeCount: parseInt(row.like_count) || 0,
      })),
    });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add photo to collection
router.post('/:id/photos', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { photoId } = req.body;
    const userId = req.user!.id;

    // Check ownership
    const collectionCheck = await pool.query(
      'SELECT user_id FROM collections WHERE id = $1',
      [id]
    );

    if (collectionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collectionCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not your collection' });
    }

    // Check if photo exists
    const photoCheck = await pool.query('SELECT id FROM photos WHERE id = $1', [photoId]);
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Add to collection (ignore if already exists)
    await pool.query(
      'INSERT INTO collection_photos (collection_id, photo_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, photoId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Add to collection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove photo from collection
router.delete('/:id/photos/:photoId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, photoId } = req.params;
    const userId = req.user!.id;

    // Check ownership
    const collectionCheck = await pool.query(
      'SELECT user_id FROM collections WHERE id = $1',
      [id]
    );

    if (collectionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collectionCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not your collection' });
    }

    await pool.query(
      'DELETE FROM collection_photos WHERE collection_id = $1 AND photo_id = $2',
      [id, photoId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Remove from collection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete collection
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await pool.query(
      'DELETE FROM collections WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found or not yours' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
