import React, { useState } from 'react';
import { Plus, Calendar, CheckCircle2, Circle, Star, Trash2, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import AddTaskForm from './AddTaskForm';

const API_BASE_URL = 'http://localhost:3001/api';

const TaskManager = () => {
  // Hooks must be at the top level
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (user?.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }
    return headers;
  };

  // All mutations must be defined before any conditional returns
  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskData)
      });
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setShowAddTask(false);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }) => {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setEditingTask(null);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    },
    onError: (error) => {
      setErrorMessage(error.message);
    }
  });

  // Query must be defined before any conditional returns
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      try {
        if (!user?.token) {
          throw new Error('No authentication token');
        }

        const response = await fetch(`${API_BASE_URL}/tasks`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          }
        });

        // Log the response for debugging
        console.log('Response status:', response.status);
        const text = await response.text();
        console.log('Response text:', text);

        // Try to parse as JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse response as JSON:', e);
          throw new Error('Invalid response from server');
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch tasks');
        }

        if (!data.success) {
          throw new Error(data.message || 'API returned unsuccessful response');
        }

        return data.data || [];
      } catch (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
    },
    enabled: !!user?.token,
    retry: false,
    onError: (error) => {
      console.error('Query error:', error);
    }
  });

  const handleCreateTask = (taskData) => {
    createTaskMutation.mutate(taskData);
  };

  const handleUpdateTask = (taskId, data) => {
    updateTaskMutation.mutate({ taskId, data });
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const toggleTaskStatus = (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    handleUpdateTask(task.id, { ...task, status: newStatus });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-orange-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'todo':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (activeFilter === 'all') return true;
    return task.status === activeFilter;
  });

  // Render functions
  const renderLoginMessage = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-dark-lighter rounded-xl shadow-soft p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-dark-light mb-4">Please Log In</h2>
      <p className="text-gray-600 dark:text-dark-muted">You need to be logged in to manage tasks.</p>
    </div>
  );

  const renderError = () => (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
      <p className="font-bold">Error loading tasks</p>
      <p className="text-sm">{error.message}</p>
      <button
        onClick={() => queryClient.invalidateQueries(['tasks'])}
        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
      >
        Try Again
      </button>
    </div>
  );

  // Main render logic
  if (!user) {
    return renderLoginMessage();
  }

  if (error) {
    return renderError();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-lighter rounded-xl shadow-soft p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-light">Task Manager</h1>
            <p className="text-gray-500 dark:text-dark-muted">Manage your tasks and stay organized</p>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Task
          </button>
        </div>

        {/* Task Filters */}
        <div className="flex space-x-4 mt-6">
          {['all', 'todo', 'in-progress', 'completed'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                activeFilter === filter
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-card'
              }`}
            >
              {filter.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          <p className="font-bold">Error</p>
          <p className="text-sm">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage('')}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      )}

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-white dark:bg-dark-lighter rounded-xl shadow-soft p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-3">
                <button 
                  onClick={() => toggleTaskStatus(task)}
                  className="mt-1"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 dark:text-dark-muted" />
                  )}
                </button>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-dark-light">{task.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">{task.description}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setEditingTask(task)}
                  className="text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-light"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-400 dark:text-dark-muted hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-dark-muted" />
                <span className="text-gray-600 dark:text-dark-muted">
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              </div>
              <Star className={`w-5 h-5 ${getPriorityColor(task.priority)}`} />
            </div>

            {task.tags && task.tags.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t dark:border-dark">
              <div className="flex justify-between items-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    task.status === 'completed' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                      : task.status === 'in-progress'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
                  }`}
                >
                  {task.status.replace('-', ' ')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Task Modal */}
      {(showAddTask || editingTask) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AddTaskForm
            onSubmit={editingTask ? 
              (data) => handleUpdateTask(editingTask.id, data) : 
              handleCreateTask}
            onClose={() => {
              setShowAddTask(false);
              setEditingTask(null);
            }}
            initialData={editingTask}
          />
        </div>
      )}
    </div>
  );
};

export default TaskManager;