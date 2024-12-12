import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import pool from '../database/pool.js';

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required fields'
        });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password
      });

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at
          },
          token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error.message === 'Email already exists') {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error creating user'
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email and password'
        });
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isValid = await User.verifyPassword(password, user.password_hash);
      if (!isValid) {
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

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar_url: user.avatar_url,
            created_at: user.created_at
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Error logging in'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            theme: user.theme || 'light',
            emailNotifications: user.emailNotifications !== false,
            eventReminders: user.eventReminders !== false,
            created_at: user.created_at
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
  }

  static async updateProfile(req, res) {
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
  }
}

export default AuthController;
