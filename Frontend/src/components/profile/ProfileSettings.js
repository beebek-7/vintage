import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Mail, Calendar, Save, Clock } from 'lucide-react';

const ProfileSettings = () => {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      eventReminders: true,
      reminderHours: 24,
      dailyAgendaTime: '08:00'
    }
  });

  const [isSaving, setIsSaving] = useState(false);

  // Initialize settings from user data
  useEffect(() => {
    if (user?.user) {
      setSettings({
        notifications: {
          email: user.user.emailNotifications !== false,
          eventReminders: user.user.eventReminders !== false,
          reminderHours: user.user.reminderHours || 24,
          dailyAgendaTime: user.user.dailyAgendaTime || '08:00'
        }
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateProfile({
        emailNotifications: settings.notifications.email,
        eventReminders: settings.notifications.eventReminders,
        reminderHours: settings.notifications.reminderHours,
        dailyAgendaTime: settings.notifications.dailyAgendaTime
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (section, data) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
  };

  const reminderOptions = [
    { value: 1, label: '1 hour' },
    { value: 2, label: '2 hours' },
    { value: 4, label: '4 hours' },
    { value: 8, label: '8 hours' },
    { value: 12, label: '12 hours' },
    { value: 24, label: '24 hours' },
    { value: 48, label: '2 days' },
    { value: 72, label: '3 days' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Information */}
      <div className="bg-white dark:bg-dark-lighter rounded-xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark mb-4">Profile Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark mb-1">Display Name</label>
            <input
              type="text"
              value={user?.user?.name || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-dark text-gray-700 dark:text-dark"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark mb-1">Email</label>
            <input
              type="email"
              value={user?.user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-dark text-gray-700 dark:text-dark"
            />
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white dark:bg-dark-lighter rounded-xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark mb-4">Display Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark mb-2">Theme</label>
            <div className="flex space-x-2">
              <button
                onClick={toggleTheme}
                className={`
                  px-4 py-2 rounded-lg flex items-center
                  ${theme === 'light'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 dark:bg-dark text-gray-700 dark:text-dark hover:bg-gray-200 dark:hover:bg-dark-lighter'
                  }
                `}
              >
                <Sun className="w-4 h-4 mr-2" />
                Light
              </button>
              <button
                onClick={toggleTheme}
                className={`
                  px-4 py-2 rounded-lg flex items-center
                  ${theme === 'dark'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 dark:bg-dark text-gray-700 dark:text-dark hover:bg-gray-200 dark:hover:bg-dark-lighter'
                  }
                `}
              >
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-dark-lighter rounded-xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark mb-4">Notifications</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="flex items-center text-gray-700 dark:text-dark">
              <Mail className="w-5 h-5 mr-2" />
              Email Notifications
            </span>
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={(e) => handleSettingChange('notifications', { email: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="flex items-center text-gray-700 dark:text-dark">
              <Calendar className="w-5 h-5 mr-2" />
              Event Reminders
            </span>
            <input
              type="checkbox"
              checked={settings.notifications.eventReminders}
              onChange={(e) => handleSettingChange('notifications', { eventReminders: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>

          {settings.notifications.email && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Reminder Time
                </label>
                <select
                  value={settings.notifications.reminderHours}
                  onChange={(e) => handleSettingChange('notifications', { reminderHours: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark dark:text-dark"
                >
                  {reminderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} before
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Daily Agenda Time
                </label>
                <input
                  type="time"
                  value={settings.notifications.dailyAgendaTime}
                  onChange={(e) => handleSettingChange('notifications', { dailyAgendaTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark dark:text-dark"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`
            flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg 
            transition-colors shadow-lg
            ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-700'}
          `}
        >
          <Save className="w-5 h-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;
