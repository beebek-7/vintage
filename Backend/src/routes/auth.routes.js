import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Register route
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);

    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, hashedPassword]
    );

    // Generate token
    const token = jwt.sign(
      { id: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      data: {
        user: result.rows[0],
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Return user data without password
    const { password_hash, ...userData } = user;

    res.json({
      success: true,
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

// Get profile route
router.get('/profile', authenticate, async (req, res) => {
  try {
    // Get user data
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user preferences
    const prefsResult = await pool.query(
      'SELECT theme, email_notifications, reminder_hours, daily_agenda_time FROM user_preferences WHERE user_id = $1',
      [req.userId]
    );

    const user = result.rows[0];
    const prefs = prefsResult.rows[0] || {};

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          theme: prefs.theme || 'light',
          emailNotifications: prefs.email_notifications !== false,
          reminderHours: prefs.reminder_hours || 24,
          dailyAgendaTime: prefs.daily_agenda_time || '08:00:00'
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// Update profile route
router.put('/profile', authenticate, async (req, res) => {
  try {
    const updates = {
      theme: req.body.theme,
      emailNotifications: req.body.emailNotifications,
      eventReminders: req.body.eventReminders,
      reminderHours: req.body.reminderHours,
      dailyAgendaTime: req.body.dailyAgendaTime
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user preferences
      await client.query(`
        INSERT INTO user_preferences (
          user_id, theme, email_notifications, reminder_hours, daily_agenda_time
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) 
        DO UPDATE SET
          theme = EXCLUDED.theme,
          email_notifications = EXCLUDED.email_notifications,
          reminder_hours = EXCLUDED.reminder_hours,
          daily_agenda_time = EXCLUDED.daily_agenda_time,
          updated_at = CURRENT_TIMESTAMP
      `, [
        req.userId,
        updates.theme || 'light',
        updates.emailNotifications !== false,
        updates.reminderHours || 24,
        updates.dailyAgendaTime || '08:00:00'
      ]);

      // Update user record
      const userResult = await client.query(`
        UPDATE users 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name, email, created_at, updated_at
      `, [req.userId]);

      await client.query('COMMIT');

      // Get updated preferences
      const prefsResult = await client.query(`
        SELECT theme, email_notifications, reminder_hours, daily_agenda_time
        FROM user_preferences
        WHERE user_id = $1
      `, [req.userId]);

      const user = userResult.rows[0];
      const prefs = prefsResult.rows[0];

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            theme: prefs.theme || 'light',
            emailNotifications: prefs.email_notifications,
            reminderHours: prefs.reminder_hours,
            dailyAgendaTime: prefs.daily_agenda_time,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

export default router;
