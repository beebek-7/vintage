import pool from '../config/db.js';

class UNTController {
  // Get all UNT events
  static async getEvents(req, res) {
    try {
      const userId = req.userId; // Get current user ID if available
      const result = await pool.query(`
        SELECT 
          e.*,
          COUNT(DISTINCT s.user_id) as attendees,
          ARRAY_AGG(DISTINCT t.tag_name) as tags,
          EXISTS(
            SELECT 1 FROM user_event_subscriptions 
            WHERE user_id = $1 AND event_id = e.id
          ) as is_subscribed
        FROM unt_events e
        LEFT JOIN user_event_subscriptions s ON e.id = s.event_id
        LEFT JOIN event_tags t ON e.id = t.event_id
        WHERE e.event_date >= CURRENT_DATE
        GROUP BY e.id
        ORDER BY e.event_date ASC
      `, [userId || null]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching UNT events:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching events'
      });
    }
  }

  // Subscribe to an event
  static async subscribeToEvent(req, res) {
    const { eventId } = req.params;
    const userId = req.userId;

    try {
      // Check if subscription already exists
      const existingSubscription = await pool.query(
        'SELECT id FROM user_event_subscriptions WHERE user_id = $1 AND event_id = $2',
        [userId, eventId]
      );

      if (existingSubscription.rows.length > 0) {
        return res.json({
          success: true,
          message: 'Already subscribed to event'
        });
      }

      // If not subscribed, create new subscription
      await pool.query(
        'INSERT INTO user_event_subscriptions (user_id, event_id) VALUES ($1, $2)',
        [userId, eventId]
      );

      res.json({
        success: true,
        message: 'Successfully subscribed to event'
      });
    } catch (error) {
      console.error('Error subscribing to event:', error);
      res.status(500).json({
        success: false,
        message: 'Error subscribing to event'
      });
    }
  }

  // Unsubscribe from an event
  static async unsubscribeFromEvent(req, res) {
    const { eventId } = req.params;
    const userId = req.userId; // Changed from req.user.id

    try {
      await pool.query(
        'DELETE FROM user_event_subscriptions WHERE user_id = $1 AND event_id = $2',
        [userId, eventId]
      );

      res.json({
        success: true,
        message: 'Successfully unsubscribed from event'
      });
    } catch (error) {
      console.error('Error unsubscribing from event:', error);
      res.status(500).json({
        success: false,
        message: 'Error unsubscribing from event'
      });
    }
  }

  // Get user's subscribed events
  static async getSubscribedEvents(req, res) {
    const userId = req.userId; // Changed from req.user.id

    try {
      const result = await pool.query(`
        SELECT e.*
        FROM unt_events e
        JOIN user_event_subscriptions s ON e.id = s.event_id
        WHERE s.user_id = $1
        ORDER BY e.event_date ASC
      `, [userId]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching subscribed events:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching subscribed events'
      });
    }
  }
}

export default UNTController;
