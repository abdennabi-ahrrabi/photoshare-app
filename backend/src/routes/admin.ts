import { Router, Response } from 'express';
import { pool } from '../db/pool';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware to check admin status
const requireAdmin = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [users, photos, comments, reports] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM photos'),
      pool.query('SELECT COUNT(*) FROM comments'),
      pool.query("SELECT COUNT(*) FROM reports WHERE status = 'pending'"),
    ]);

    const recentUsers = await pool.query(
      `SELECT id, display_name, email, created_at
       FROM users ORDER BY created_at DESC LIMIT 5`
    );

    const recentPhotos = await pool.query(
      `SELECT p.id, p.title, p.created_at, u.display_name as creator
       FROM photos p JOIN users u ON p.creator_id = u.id
       ORDER BY p.created_at DESC LIMIT 5`
    );

    res.json({
      stats: {
        totalUsers: parseInt(users.rows[0].count),
        totalPhotos: parseInt(photos.rows[0].count),
        totalComments: parseInt(comments.rows[0].count),
        pendingReports: parseInt(reports.rows[0].count),
      },
      recentUsers: recentUsers.rows,
      recentPhotos: recentPhotos.rows,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const usersResult = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.role, u.is_admin, u.created_at,
              (SELECT COUNT(*) FROM photos WHERE creator_id = u.id) as photo_count
       FROM users u
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM users');

    res.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin)
router.patch('/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, isAdmin } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (role) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (isAdmin !== undefined) {
      updates.push(`is_admin = $${paramIndex++}`);
      values.push(isAdmin);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reports
router.get('/reports', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string || 'pending';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const reportsResult = await pool.query(
      `SELECT r.*,
              reporter.display_name as reporter_name,
              p.title as photo_title, p.file_path as photo_path,
              reported_user.display_name as reported_user_name
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       LEFT JOIN photos p ON r.photo_id = p.id
       LEFT JOIN users reported_user ON r.user_id = reported_user.id
       WHERE r.status = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM reports WHERE status = $1',
      [status]
    );

    res.json({
      reports: reportsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update report status
router.patch('/reports/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await pool.query(
      'UPDATE reports SET status = $1 WHERE id = $2',
      [status, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete photo (admin)
router.delete('/photos/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM photos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
