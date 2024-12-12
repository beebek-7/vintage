import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { format, parseISO, parse } from 'date-fns';

const AddTaskForm = ({ onSubmit, onClose, initialData }) => {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    due_time: '16:00',
    priority: 'medium',
    status: 'todo',
    tags: []
  });

  const [newTag, setNewTag] = useState('');

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setTaskData({
        title: initialData.title || '',
        description: initialData.description || '',
        due_date: initialData.due_date ? format(new Date(initialData.due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        due_time: initialData.due_date ? format(new Date(initialData.due_date), 'HH:mm') : '12:00',
        priority: initialData.priority || 'medium',
        status: initialData.status || 'todo',
        tags: initialData.tags || []
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Create a local datetime string without forcing UTC
    const dateTime = `${taskData.due_date}T${taskData.due_time}:00`;
    
    const formattedData = {
      ...taskData,
      due_date: new Date(dateTime).toISOString()
    };
    onSubmit(formattedData);
  };

  // Handle adding tags
  const handleAddTag = () => {
    if (newTag.trim() && !taskData.tags.includes(newTag.trim())) {
      setTaskData({
        ...taskData,
        tags: [...taskData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  // Handle removing tags
  const handleRemoveTag = (tagToRemove) => {
    setTaskData({
      ...taskData,
      tags: taskData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  return (
    <div className="bg-white dark:bg-dark-lighter rounded-xl shadow-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-dark-light">
          {initialData ? 'Edit Task' : 'Add New Task'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-light"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-light mb-1">
            Title
          </label>
          <input
            type="text"
            value={taskData.title}
            onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark rounded-lg text-gray-900 dark:text-dark-light focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-light mb-1">
            Description
          </label>
          <textarea
            value={taskData.description}
            onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark rounded-lg text-gray-900 dark:text-dark-light focus:ring-2 focus:ring-primary-500"
            rows="3"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-light">
            Due Date & Time
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={taskData.due_date}
              onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
              className="flex-1 px-3 py-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark rounded-lg text-gray-900 dark:text-dark-light focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="time"
              value={taskData.due_time}
              onChange={(e) => setTaskData({ ...taskData, due_time: e.target.value })}
              className="w-32 px-3 py-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark rounded-lg text-gray-900 dark:text-dark-light focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-light mb-1">
            Priority
          </label>
          <select
            value={taskData.priority}
            onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark rounded-lg text-gray-900 dark:text-dark-light focus:ring-2 focus:ring-primary-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-light mb-1">
            Status
          </label>
          <select
            value={taskData.status}
            onChange={(e) => setTaskData({ ...taskData, status: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark rounded-lg text-gray-900 dark:text-dark-light focus:ring-2 focus:ring-primary-500"
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-light">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {taskData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 inline-flex items-center"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add a tag"
              className="flex-1 px-3 py-2 bg-white dark:bg-dark-input border border-gray-300 dark:border-dark rounded-lg text-gray-900 dark:text-dark-light focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-dark-light hover:bg-gray-100 dark:hover:bg-dark-card rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600"
          >
            {initialData ? 'Update Task' : 'Add Task'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTaskForm;
