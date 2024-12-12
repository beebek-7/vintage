import React from 'react';
import { Calendar, CheckCircle2, Circle, MoreHorizontal, Star, Edit2, Trash2 } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';

const TaskCard = ({ task, onEdit }) => {
  const { toggleTaskStatus, deleteTask } = useTasks();
  const [showActions, setShowActions] = React.useState(false);

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

  return (
    <div className="bg-white rounded-xl shadow-soft p-6 hover:shadow-lg transition-all group">
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <button 
            onClick={() => toggleTaskStatus(task.id)}
            className="mt-1 transition-colors"
          >
            {task.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
          <div>
            <h3 className={`font-semibold text-gray-800 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
              {task.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          </div>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowActions(!showActions)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-100">
              <button
                onClick={() => {
                  onEdit(task);
                  setShowActions(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Task
              </button>
              <button
                onClick={() => {
                  deleteTask(task.id);
                  setShowActions(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{task.dueDate}</span>
        </div>
        <Star className={`w-5 h-5 ${getPriorityColor(task.priority)}`} />
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap gap-2">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-full bg-primary-50 text-primary-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between items-center">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
              task.status
            )}`}
          >
            {task.status.replace('-', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;