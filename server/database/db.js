import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// REMOVED: intelligence-service.js - using Claude CLI only

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, 'auth.db');
const INTELLIGENCE_DB_PATH = path.join(__dirname, 'intelligence.db');
const INIT_SQL_PATH = path.join(__dirname, 'init.sql');

// Create database connections
const db = new Database(DB_PATH);
console.log('🔗 Connected to authentication database');

// Initialize database with schema
const initializeDatabase = async () => {
  try {
    // Initialize auth database
    const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf8');
    db.exec(initSQL);
    console.log('✅ Authentication database initialized successfully');

    // Initialize intelligence database
    const intelligenceDb = new Database(INTELLIGENCE_DB_PATH);
    intelligenceDb.run('PRAGMA journal_mode = WAL');
    intelligenceDb.run('PRAGMA foreign_keys = ON');
    intelligenceDb.exec(initSQL); // This includes both auth and intelligence schema
    intelligenceDb.close();
    
    // REMOVED: Custom intelligence service - using Claude CLI only
    console.log('✅ Database initialized successfully');
    
  } catch (error) {
    console.error('❌ Error initializing databases:', error.message);
    throw error;
  }
};

// User database operations
const userDb = {
  // Check if any users exist
  hasUsers: () => {
    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
      return row.count > 0;
    } catch (err) {
      throw err;
    }
  },

  // Create a new user
  createUser: (username, passwordHash) => {
    try {
      const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
      const result = stmt.run(username, passwordHash);
      return { id: result.lastInsertRowid, username };
    } catch (err) {
      throw err;
    }
  },

  // Get user by username
  getUserByUsername: (username) => {
    try {
      const row = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
      return row;
    } catch (err) {
      throw err;
    }
  },

  // Update last login time
  updateLastLogin: (userId) => {
    try {
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    } catch (err) {
      throw err;
    }
  },

  // Get user by ID
  getUserById: (userId) => {
    try {
      const row = db.prepare('SELECT id, username, created_at, last_login FROM users WHERE id = ? AND is_active = 1').get(userId);
      return row;
    } catch (err) {
      throw err;
    }
  }
};

export {
  db,
  initializeDatabase,
  userDb
  // REMOVED: intelligenceService - using Claude CLI only
};