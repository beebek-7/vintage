import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import untRoutes from './routes/unt.routes.js';
import taskRoutes from './routes/task.routes.js';
import UNTCalendarScraper from './services/untCalendarScraper.js';
import NotificationScheduler from './services/notificationScheduler.js';

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: 'https://sweet-torrone-7e105f.netlify.app/', // Yo"""""""""""""""""""""""""""""""""""""""""""""u'll update this with your actual Netlify URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan('dev'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Syncd API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/unt', untRoutes);
app.use('/api/tasks', taskRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for origin: http://localhost:3000`);
  
  // Start background services
  UNTCalendarScraper.startScraping();
  NotificationScheduler.startNotificationProcessor();
  console.log('Background services started: Calendar Scraper and Notification Processor');
});

export default app;
