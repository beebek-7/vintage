import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, CheckSquare, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="bg-white dark:bg-dark-lighter shadow-soft border-b border-gray-100 dark:border-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white dark:text-dark-light" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 text-transparent bg-clip-text">
                  Syncd
                </span>
              </Link>
            </div>
            
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              <Link
                to="/"
                className="flex items-center px-3 py-2 rounded-lg text-gray-600 dark:text-dark-muted hover:text-primary-600 dark:hover:text-dark-primary hover:bg-primary-50 dark:hover:bg-dark-card transition-colors"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Calendar
              </Link>
              <Link
                to="/tasks"
                className="flex items-center px-3 py-2 rounded-lg text-gray-600 dark:text-dark-muted hover:text-primary-600 dark:hover:text-dark-primary hover:bg-primary-50 dark:hover:bg-dark-card transition-colors"
              >
                <CheckSquare className="w-5 h-5 mr-2" />
                Tasks
              </Link>
              <Link
                to="/unt-events"
                className="flex items-center px-3 py-2 rounded-lg text-gray-600 dark:text-dark-muted hover:text-primary-600 dark:hover:text-dark-primary hover:bg-primary-50 dark:hover:bg-dark-card transition-colors"
              >
                <Bell className="w-5 h-5 mr-2" />
                UNT Events
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/profile"
              className="flex items-center px-3 py-2 rounded-lg text-gray-600 dark:text-dark-muted hover:text-primary-600 dark:hover:text-dark-primary hover:bg-primary-50 dark:hover:bg-dark-card transition-colors"
            >
              <User className="w-5 h-5 mr-2" />
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
