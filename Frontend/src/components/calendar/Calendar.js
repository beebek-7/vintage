import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, addMonths, subMonths, getDay, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Sun, Moon, CheckCircle2 } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import AddTaskForm from '../tasks/AddTaskForm';
import DayViewModal from './DayViewModal';

const API_BASE_URL = 'http://localhost:3001/api';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [showDayView, setShowDayView] = useState(false);
  const { tasks, addTask, getTasksByDate } = useTasks();
  const { user } = useAuth();

  // Fetch subscribed UNT events
  const { data: subscribedEvents = [] } = useQuery({
    queryKey: ['subscribedEvents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch(`${API_BASE_URL}/unt/events/subscribed`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      return data.success ? data.data : [];
    },
    enabled: !!user
  });

  const getEventsByDate = (date) => {
    return subscribedEvents.filter(event => {
      try {
        return isSameDay(parseISO(event.event_date), date);
      } catch (e) {
        return false;
      }
    });
  };

  const handleAddTask = (taskData) => {
    addTask({
      ...taskData,
      date: selectedDate
    });
    setShowAddTask(false);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setShowDayView(true);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const emptyDays = Array.from({ length: startDay }, (_, i) => i);

  const formatTaskDate = (date) => {
    try {
      return format(parseISO(date), 'MMM d');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-8">
      {/* Calendar Header with Gradient */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-soft p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-3xl font-bold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex space-x-2 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 rounded-md hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 rounded-md hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <button 
            onClick={() => setShowAddTask(true)}
            className="flex items-center bg-white dark:bg-dark-card text-primary-700 dark:text-primary-400 px-4 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-dark-lighter transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Task
          </button>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sun className="w-5 h-5" />
            <span className="text-sm">{format(new Date(), 'EEEE, MMMM d')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Moon className="w-5 h-5" />
            <span className="text-sm">{tasks.length} Total Tasks</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-dark-lighter rounded-xl shadow-soft overflow-hidden">
        <div className="grid grid-cols-7">
          {/* Day Headers */}
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="py-4 text-center text-sm font-semibold text-gray-600 dark:text-dark-muted border-b border-gray-100 dark:border-dark"
            >
              {day}
            </div>
          ))}

          {/* Empty days */}
          {emptyDays.map((index) => (
            <div
              key={`empty-${index}`}
              className="min-h-[120px] bg-gray-50/50 dark:bg-dark p-2"
            />
          ))}

          {/* Calendar Days with Tasks and Events */}
          {monthDays.map((day) => {
            const dayTasks = getTasksByDate(day);
            const dayEvents = getEventsByDate(day);
            const totalItems = dayTasks.length + dayEvents.length;

            return (
              <div
                key={day.toString()}
                className={`
                  min-h-[120px] p-2 border-b border-r border-gray-100 dark:border-dark transition-colors
                  ${!isSameMonth(day, currentDate) ? 'bg-gray-50/50 dark:bg-dark text-gray-400 dark:text-dark-muted' : 'bg-white dark:bg-dark-lighter'}
                  ${isToday(day) ? 'bg-primary-50/50 dark:bg-primary-900/20' : ''}
                  hover:bg-gray-50 dark:hover:bg-dark-card cursor-pointer
                `}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full text-sm
                      ${isToday(day) ? 'bg-primary-600 text-white' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  {totalItems > 0 && (
                    <span className="text-xs font-medium text-gray-500 dark:text-dark-muted">
                      {totalItems} items
                    </span>
                  )}
                </div>
                
                {/* Tasks and Events for the day */}
                <div className="mt-2 space-y-1">
                  {/* UNT Events */}
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={`event-${event.id}`}
                      className="bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-medium"
                    >
                      <div className="flex items-center">
                        <span className="truncate">{event.title}</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Tasks */}
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={`task-${task.id}`}
                      className={`
                        px-2 py-1 rounded-lg text-xs font-medium
                        ${task.priority === 'high' ? 'bg-accent-pink dark:bg-pink-700 text-white' : ''}
                        ${task.priority === 'medium' ? 'bg-accent-orange dark:bg-orange-700 text-white' : ''}
                        ${task.priority === 'low' ? 'bg-accent-green dark:bg-green-700 text-white' : ''}
                      `}
                    >
                      <div className="flex items-center">
                        {task.status === 'completed' && (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        )}
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  ))}
                  
                  {totalItems > 4 && (
                    <div className="text-xs text-gray-500 dark:text-dark-muted text-center">
                      +{totalItems - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Overview Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-lighter p-6 rounded-xl shadow-soft">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-light mb-4">Today's Tasks</h3>
          <div className="space-y-3">
            {getTasksByDate(new Date()).map((task) => (
              <div
                key={task.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
              >
                <div className={`w-3 h-3 rounded-full ${
                  task.priority === 'high' ? 'bg-accent-pink dark:bg-pink-700' :
                  task.priority === 'medium' ? 'bg-accent-orange dark:bg-orange-700' : 'bg-accent-green dark:bg-green-700'
                }`} />
                <div>
                  <p className="font-medium text-gray-800 dark:text-dark-light">{task.title}</p>
                  <p className="text-sm text-gray-500 dark:text-dark-muted">Due {formatTaskDate(task.due_date)}</p>
                </div>
              </div>
            ))}
            {getTasksByDate(new Date()).length === 0 && (
              <p className="text-gray-500 dark:text-dark-muted text-sm">No tasks for today</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-accent-purple to-accent-pink p-6 rounded-xl shadow-soft text-white">
          <h3 className="text-lg font-semibold mb-4">Upcoming Tasks</h3>
          <div className="space-y-3">
            {tasks.filter(task => !task.status || task.status !== 'completed')
              .slice(0, 2)
              .map(task => (
                <div key={task.id} className="bg-white/10 p-3 rounded-lg">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm opacity-80">Due {formatTaskDate(task.due_date)}</p>
                </div>
              ))}
            {tasks.length === 0 && (
              <p className="opacity-80">No upcoming tasks</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-accent-orange to-accent-green p-6 rounded-xl shadow-soft text-white">
          <h3 className="text-lg font-semibold mb-4">Task Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold">{tasks.length}</p>
              <p className="text-sm opacity-80">Total Tasks</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold">
                {tasks.filter(task => task.status === 'completed').length}
              </p>
              <p className="text-sm opacity-80">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AddTaskForm
            onSubmit={handleAddTask}
            onClose={() => setShowAddTask(false)}
            selectedDate={selectedDate}
          />
        </div>
      )}

      {/* Day View Modal */}
      {showDayView && (
        <DayViewModal
          date={selectedDate}
          tasks={getTasksByDate(selectedDate)}
          events={getEventsByDate(selectedDate)}
          onClose={() => setShowDayView(false)}
        />
      )}
    </div>
  );
};

export default Calendar;
