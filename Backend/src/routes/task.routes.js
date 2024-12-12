import express from 'express';
import TaskController from '../controllers/task.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All task routes require authentication
router.use(authenticate);

// Task routes
router.get('/', TaskController.getTasks);
router.post('/', TaskController.createTask);
router.put('/:taskId', TaskController.updateTask);
router.delete('/:taskId', TaskController.deleteTask);

export default router; 