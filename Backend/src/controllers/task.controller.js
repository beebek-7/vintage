import pool from '../config/db.js';
import NotificationScheduler from '../services/notificationScheduler.js';

class TaskController {
  // Get all tasks for a user
  static async getTasks(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await pool.query(`
        SELECT 
          t.*,
          ARRAY_AGG(DISTINCT tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags
        FROM tasks t
        LEFT JOIN task_tags tt ON t.id = tt.task_id
        WHERE t.user_id = $1
        GROUP BY t.id
        ORDER BY t.due_date ASC NULLS LAST
      `, [req.userId]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching tasks'
      });
    }
  }

  // Create a new task
  static async createTask(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { title, description, due_date, priority, status, tags } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }

      // Start a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert task
        const taskResult = await client.query(`
          INSERT INTO tasks (user_id, title, description, due_date, priority, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [req.userId, title, description, due_date, priority || 'medium', status || 'todo']);

        const taskId = taskResult.rows[0].id;

        // Insert tags if provided
        if (tags && tags.length > 0) {
          const tagQuery = `
            INSERT INTO task_tags (task_id, tag_name)
            VALUES ${tags.map((_, i) => `($1, $${i + 2})`).join(', ')}
          `;
          await client.query(tagQuery, [taskId, ...tags]);
        }

        await client.query('COMMIT');

        // Schedule notification if due date is set
        if (due_date) {
          await NotificationScheduler.scheduleTaskReminder(taskId, req.userId, due_date);
        }

        // Fetch the complete task with tags
        const result = await client.query(`
          SELECT 
            t.*,
            ARRAY_AGG(DISTINCT tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags
          FROM tasks t
          LEFT JOIN task_tags tt ON t.id = tt.task_id
          WHERE t.id = $1
          GROUP BY t.id
        `, [taskId]);

        res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error creating task'
      });
    }
  }

  // Update a task
  static async updateTask(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { taskId } = req.params;
      const { title, description, due_date, priority, status, tags } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }

      // Start a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Verify task ownership
        const taskCheck = await client.query(
          'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
          [taskId, req.userId]
        );

        if (taskCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Task not found or unauthorized'
          });
        }

        // Update task
        await client.query(`
          UPDATE tasks 
          SET title = $1, description = $2, due_date = $3, priority = $4, status = $5, updated_at = CURRENT_TIMESTAMP
          WHERE id = $6 AND user_id = $7
        `, [title, description, due_date, priority || 'medium', status || 'todo', taskId, req.userId]);

        // Update tags
        if (tags) {
          // Remove existing tags
          await client.query('DELETE FROM task_tags WHERE task_id = $1', [taskId]);

          // Insert new tags
          if (tags.length > 0) {
            const tagQuery = `
              INSERT INTO task_tags (task_id, tag_name)
              VALUES ${tags.map((_, i) => `($1, $${i + 2})`).join(', ')}
            `;
            await client.query(tagQuery, [taskId, ...tags]);
          }
        }

        await client.query('COMMIT');

        // Schedule notification if due date is set or updated
        if (due_date) {
          await NotificationScheduler.scheduleTaskReminder(taskId, req.userId, due_date);
        }

        // Fetch updated task with tags
        const result = await client.query(`
          SELECT 
            t.*,
            ARRAY_AGG(DISTINCT tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags
          FROM tasks t
          LEFT JOIN task_tags tt ON t.id = tt.task_id
          WHERE t.id = $1
          GROUP BY t.id
        `, [taskId]);

        res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating task'
      });
    }
  }

  // Delete a task
  static async deleteTask(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { taskId } = req.params;

      // Verify and delete task (cascade will handle task_tags)
      const result = await pool.query(
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
        [taskId, req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or unauthorized'
        });
      }

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting task'
      });
    }
  }
}

export default TaskController;
