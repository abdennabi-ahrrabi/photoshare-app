import { pool } from './pool';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

export async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(schema);
    console.log('Database schema initialized successfully');

    // Seed creator accounts
    await seedCreators();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

async function seedCreators() {
  const creators = [
    { email: 'creator1@photoshare.com', password: 'creator123', displayName: 'Photo Creator 1' },
    { email: 'creator2@photoshare.com', password: 'creator123', displayName: 'Photo Creator 2' },
  ];

  for (const creator of creators) {
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [creator.email]);

    if (existingUser.rows.length === 0) {
      const passwordHash = await bcrypt.hash(creator.password, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, role, display_name) VALUES ($1, $2, $3, $4)',
        [creator.email, passwordHash, 'creator', creator.displayName]
      );
      console.log(`Seeded creator: ${creator.email}`);
    }
  }
}
