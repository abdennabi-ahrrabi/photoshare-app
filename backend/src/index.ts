import * as appInsights from 'applicationinsights';

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .start();
  console.log('Application Insights initialized');
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/init';

import authRoutes from './routes/auth';
import photosRoutes from './routes/photos';
import commentsRoutes from './routes/comments';
import ratingsRoutes from './routes/ratings';
import likesRoutes from './routes/likes';
import usersRoutes from './routes/users';
import followsRoutes from './routes/follows';
import notificationsRoutes from './routes/notifications';
import collectionsRoutes from './routes/collections';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/photos', commentsRoutes);
app.use('/api/photos', ratingsRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await initializeDatabase();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
