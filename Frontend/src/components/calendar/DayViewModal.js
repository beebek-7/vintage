import React, { useEffect, useRef } from 'react';
import { format, isToday } from 'date-fns';
import { Calendar, CheckSquare, X, Clock } from 'lucide-react';

const DayViewModal = ({ date, tasks, events, onClose }) => {
  const timelineRef = useRef(null);
  const nowIndicatorRef = useRef(null);
  const isCurrentDate = isToday(date);

  // Combine and sort tasks and events by time
  const allItems = [
    ...tasks.map(task => ({
      ...task,
      type: 'task',
      time: new Date(task.due_date)
    })),
    ...events.map(event => ({
      ...event,
      type: 'event',
      time: new Date(event.event_date)
    }))
  ].sort((a, b) => a.time - b.time);

  // Generate hour blocks for full 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  // Auto-scroll to current time when modal opens
  useEffect(() => {
    // Only auto-scroll if we're viewing today's date
    if (!isCurrentDate) return;

    // Small delay to ensure content is rendered
    const scrollTimer = setTimeout(() => {
      if (timelineRef.current) {
        const currentHourBlock = timelineRef.current.children[0].children[currentHour];
        if (currentHourBlock) {
          const offset = currentHourBlock.offsetTop - (timelineRef.current.clientHeight / 3);
          timelineRef.current.scrollTo({
            top: offset,
            behavior: 'smooth'
          });
        }
      }
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [currentHour, isCurrentDate]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-lighter rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{format(date, 'MMMM d, yyyy')}</h2>
              <p className="text-primary-100">{format(date, 'EEEE')}</p>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <CheckSquare className="w-4 h-4" />
                <span>Tasks</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>UNT Events</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div ref={timelineRef} className="overflow-y-auto flex-1 p-4">
          <div className="space-y-0">
            {hours.map(hour => {
              const timeStr = format(new Date().setHours(hour, 0), 'h:mm a');
              const itemsAtHour = allItems.filter(item => 
                item.time.getHours() === hour
              );

              const isCurrentHour = isCurrentDate && hour === currentHour;

              return (
                <div key={hour} className="relative min-h-[60px]">
                  {/* Time marker */}
                  <div className="flex items-center space-x-4 sticky">
                    <div className="w-20 text-sm text-gray-500 dark:text-dark-muted font-mono">{timeStr}</div>
                    <div className="flex-1 border-t border-gray-200 dark:border-dark"></div>
                  </div>

                  {/* Now indicator - only show on today's date */}
                  {isCurrentHour && (
                    <div 
                      ref={nowIndicatorRef}
                      className="absolute left-0 right-0 flex items-center space-x-2 z-10"
                      style={{ top: `${(currentMinute / 60) * 100}%` }}
                    >
                      <div className="w-20 text-xs text-red-500 dark:text-red-400 font-medium text-right">Now</div>
                      <div className="flex-1 border-t-2 border-red-500 dark:border-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-400 -ml-1.5"></div>
                    </div>
                  )}

                  {/* Items at this hour */}
                  {itemsAtHour.length > 0 && (
                    <div className="ml-24 -mt-3 space-y-2">
                      {itemsAtHour.map((item, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg p-3 shadow-sm flex items-start space-x-3 ${
                            item.type === 'task' 
                              ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-l-4 border-blue-500'
                              : 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-l-4 border-green-500'
                          }`}
                        >
                          {item.type === 'task' ? (
                            <CheckSquare className="w-5 h-5 mt-1 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                          ) : (
                            <Calendar className="w-5 h-5 mt-1 text-green-500 dark:text-green-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-dark-light">
                              {item.title}
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-dark-muted mt-1">{item.description}</p>
                            )}
                            <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-dark-muted">
                              <Clock className="w-4 h-4 mr-1" />
                              {format(item.time, 'h:mm a')}
                              {item.location && ` • ${item.location}`}
                              {item.type === 'task' && item.priority && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                  item.priority === 'high' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                                  item.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' :
                                  'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                }`}>
                                  {item.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayViewModal; 