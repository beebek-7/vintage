import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { useAuth } from './AuthContext';

const API_BASE_URL = 'http://localhost:3001/api';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get auth headers
  const getAuthHeaders = () => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': user?.token ? `Bearer ${user.token}` : ''
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      if (!user?.token) return [];
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      return data.success ? data.data : [];
    },
    enabled: !!user?.token
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskData)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
    }
  });

  const addTask = (taskData) => {
    return addTaskMutation.mutate(taskData);
  };

  const getTasksByDate = (date) => {
    if (!isValid(date)) return [];
    const formattedDate = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => {
      if (!task.due_date) return false;
      try {
        const taskDate = parseISO(task.due_date);
        return isValid(taskDate) && format(taskDate, 'yyyy-MM-dd') === formattedDate;
      } catch (e) {
        return false;
      }
    });
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      addTask,
      getTasksByDate,
      isLoading: addTaskMutation.isLoading
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
