import { CronJob } from 'cron';
import pool from '../config/db.js';
import EmailService from './emailService.js';

class NotificationScheduler {
  static async scheduleTaskReminder(taskId, userId, dueDate) {
    try {
      // Get user's reminder preference
      const prefResult = await pool.query(
        'SELECT reminder_hours FROM user_preferences WHERE user_id = $1',
        [userId]
      );
      
      const reminderHours = prefResult.rows[0]?.reminder_hours || 24;
      const reminderTime = new Date(dueDate);
      reminderTime.setHours(reminderTime.getHours() - reminderHours);

      // Schedule notification
      await pool.query(`
        INSERT INTO email_notifications (
          user_id, type, reference_id, scheduled_time
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, type, reference_id, scheduled_time) 
        DO NOTHING
      `, [userId, 'task_due', taskId, reminderTime]);
    } catch (error) {
      console.error('Error scheduling task reminder:', error);
    }
  }

  static async scheduleEventReminder(eventId, userId, eventDate) {
    try {
      // Get user's reminder preference
      const prefResult = await pool.query(
        'SELECT reminder_hours FROM user_preferences WHERE user_id = $1',
        [userId]
      );
      
      const reminderHours = prefResult.rows[0]?.reminder_hours || 24;
      const reminderTime = new Date(eventDate);
      reminderTime.setHours(reminderTime.getHours() - reminderHours);

      // Schedule notification
      await pool.query(`
        INSERT INTO email_notifications (
          user_id, type, reference_id, scheduled_time
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, type, reference_id, scheduled_time) 
        DO NOTHING
      `, [userId, 'event_reminder', eventId, reminderTime]);
    } catch (error) {
      console.error('Error scheduling event reminder:', error);
    }
  }

  static async scheduleDailyAgendas() {
    try {
      const users = await pool.query(`
        SELECT u.id, p.daily_agenda_time 
        FROM users u
        JOIN user_preferences p ON u.id = p.user_id
        WHERE p.email_notifications = true
      `);

      for (const user of users.rows) {
        const [hours, minutes] = user.daily_agenda_time.split(':');
        const scheduleTime = new Date();
        scheduleTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (scheduleTime < new Date()) {
          scheduleTime.setDate(scheduleTime.getDate() + 1);
        }

        await pool.query(`
          INSERT INTO email_notifications (
            user_id, type, scheduled_time
          ) VALUES ($1, $2, $3)
          ON CONFLICT (user_id, type, reference_id, scheduled_time) 
          DO NOTHING
        `, [user.id, 'daily_agenda', scheduleTime]);
      }
    } catch (error) {
      console.error('Error scheduling daily agendas:', error);
    }
  }

  // Start the notification processing job
  static startNotificationProcessor() {
    // Process notifications every minute
    new CronJob('* * * * *', async () => {
      try {
        // Get pending notifications that are due
        const result = await pool.query(`
          SELECT id, user_id, type, reference_id 
          FROM email_notifications 
          WHERE status = 'pending' 
          AND scheduled_time <= CURRENT_TIMESTAMP
        `);

        for (const notification of result.rows) {
          switch (notification.type) {
            case 'task_due':
              await EmailService.sendTaskDueReminder(
                notification.user_id,
                notification.reference_id
              );
              break;
            case 'event_reminder':
              await EmailService.sendEventReminder(
                notification.user_id,
                notification.reference_id
              );
              break;
            case 'daily_agenda':
              await EmailService.sendDailyAgenda(notification.user_id);
              break;
          }
        }
      } catch (error) {
        console.error('Error processing notifications:', error);
      }
    }, null, true);

    // Schedule next day's daily agendas every day at midnight
    new CronJob('0 0 * * *', async () => {
      await this.scheduleDailyAgendas();
    }, null, true);
  }
}

export default NotificationScheduler; 