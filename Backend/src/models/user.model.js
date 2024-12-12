import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

class User {
  static async create({ name, email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `;

    try {
      const { rows } = await pool.query(query, [name, email, hashedPassword]);
      return rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation error code
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = `
      SELECT *
      FROM users
      WHERE email = $1
    `;

    const { rows } = await pool.query(query, [email]);
    return rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, name, email, avatar_url, created_at
      FROM users
      WHERE id = $1
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async verifyPassword(providedPassword, hashedPassword) {
    return bcrypt.compare(providedPassword, hashedPassword);
  }

  static async updateProfile(userId, updates) {
    const allowedUpdates = ['name', 'avatar_url'];
    const updateFields = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key) && updates[key] !== undefined);
    
    if (updateFields.length === 0) return null;

    const setClause = updateFields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(', ');
    const values = updateFields.map(field => updates[field]);

    const query = `
      UPDATE users
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, avatar_url, created_at, updated_at
    `;

    const { rows } = await pool.query(query, [userId, ...values]);
    return rows[0];
  }
}

export default User;