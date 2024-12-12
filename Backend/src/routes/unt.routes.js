import express from 'express';
import UNTController from '../controllers/unt.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import UNTCalendarScraper from '../services/untCalendarScraper.js';

const router = express.Router();

// Public routes
router.get('/events', UNTController.getEvents);

// Development route to trigger scraper manually
router.post('/scrape', async (req, res) => {
  try {
    const events = await UNTCalendarScraper.scrapeEvents();
    res.json({
      success: true,
      message: 'Successfully scraped events',
      count: events.length
    });
  } catch (error) {
    console.error('Error triggering scraper:', error);
    res.status(500).json({
      success: false,
      message: 'Error scraping events'
    });
  }
});

// Protected routes (require authentication)
router.get('/events/subscribed', authenticate, UNTController.getSubscribedEvents);
router.post('/events/:eventId/subscribe', authenticate, UNTController.subscribeToEvent);
router.delete('/events/:eventId/unsubscribe', authenticate, UNTController.unsubscribeFromEvent);

export default router; 