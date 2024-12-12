import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import pool from '../config/db.js';
import { google } from 'googleapis';
const OAuth2 = google.auth.OAuth2;

// Create OAuth2 client
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Create reusable transporter
const createTransporter = async () => {
  try {
    const accessToken = await oauth2Client.getAccessToken();
    
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken.token
      }
    });
  } catch (error) {
    console.error('Error creating transporter:', error);
    throw error;
  }
};

class EmailService {
  static async sendTaskDueReminder(userId, taskId) {
    try {
      const transporter = await createTransporter();
      
      // Get user and task details
      const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      const taskResult = await pool.query('SELECT title, due_date FROM tasks WHERE id = $1', [taskId]);
      
      if (userResult.rows.length === 0 || taskResult.rows.length === 0) return;
      
      const user = userResult.rows[0];
      const task = taskResult.rows[0];
      
      // Send email
      await transporter.sendMail({
        from: `"Syncd App" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `Task Due Soon: ${task.title}`,
        html: `
          <h2>Task Reminder</h2>
          <p>Hi ${user.name},</p>
          <p>Your task "${task.title}" is due on ${format(new Date(task.due_date), 'MMMM d, yyyy h:mm a')}.</p>
          <p>Log in to Syncd to view more details or update the task status.</p>
        `
      });

      // Update notification status
      await pool.query(
        'UPDATE email_notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND reference_id = $3 AND type = $4',
        ['sent', userId, taskId, 'task_due']
      );
    } catch (error) {
      console.error('Error sending task reminder:', error);
      throw error; // Re-throw to handle it in the notification processor
    }
  }

  static async sendEventReminder(userId, eventId) {
    try {
      // Get user and event details
      const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      const eventResult = await pool.query('SELECT title, event_date, location FROM unt_events WHERE id = $1', [eventId]);
      
      if (userResult.rows.length === 0 || eventResult.rows.length === 0) return;
      
      const user = userResult.rows[0];
      const event = eventResult.rows[0];
      
      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Upcoming Event: ${event.title}`,
        html: `
          <h2>Event Reminder</h2>
          <p>Hi ${user.name},</p>
          <p>You have an upcoming event:</p>
          <p><strong>${event.title}</strong></p>
          <p>Date: ${format(new Date(event.event_date), 'MMMM d, yyyy h:mm a')}</p>
          ${event.location ? `<p>Location: ${event.location}</p>` : ''}
          <p>Log in to Syncd to view more details.</p>
        `
      });

      // Update notification status
      await pool.query(
        'UPDATE email_notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND reference_id = $3 AND type = $4',
        ['sent', userId, eventId, 'event_reminder']
      );
    } catch (error) {
      console.error('Error sending event reminder:', error);
    }
  }

  static async sendDailyAgenda(userId) {
    try {
      // Get user details
      const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) return;
      const user = userResult.rows[0];

      // Get today's tasks and events
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasksResult = await pool.query(`
        SELECT title, due_date, status, priority 
        FROM tasks 
        WHERE user_id = $1 
        AND due_date BETWEEN $2 AND $3
        ORDER BY due_date ASC
      `, [userId, today, tomorrow]);

      const eventsResult = await pool.query(`
        SELECT e.title, e.event_date, e.location
        FROM unt_events e
        JOIN user_event_subscriptions s ON e.id = s.event_id
        WHERE s.user_id = $1
        AND e.event_date BETWEEN $2 AND $3
        ORDER BY e.event_date ASC
      `, [userId, today, tomorrow]);

      // Generate HTML for tasks and events
      const tasksHtml = tasksResult.rows.map(task => `
        <li>
          ${format(new Date(task.due_date), 'h:mm a')} - 
          ${task.title} 
          (${task.priority} priority, ${task.status})
        </li>
      `).join('');

      const eventsHtml = eventsResult.rows.map(event => `
        <li>
          ${format(new Date(event.event_date), 'h:mm a')} - 
          ${event.title}
          ${event.location ? `@ ${event.location}` : ''}
        </li>
      `).join('');

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Your Daily Agenda for ${format(today, 'MMMM d, yyyy')}`,
        html: `
          <h2>Daily Agenda</h2>
          <p>Hi ${user.name},</p>
          
          <h3>Tasks Due Today</h3>
          ${tasksHtml ? `<ul>${tasksHtml}</ul>` : '<p>No tasks due today</p>'}
          
          <h3>Today's Events</h3>
          ${eventsHtml ? `<ul>${eventsHtml}</ul>` : '<p>No events scheduled today</p>'}
          
          <p>Log in to Syncd to manage your schedule.</p>
        `
      });

      // Update notification status
      await pool.query(
        'UPDATE email_notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND type = $3 AND scheduled_time::date = CURRENT_DATE',
        ['sent', userId, 'daily_agenda']
      );
    } catch (error) {
      console.error('Error sending daily agenda:', error);
    }
  }
}

export default EmailService; 