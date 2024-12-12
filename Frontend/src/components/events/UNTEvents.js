import React, { useState } from 'react';
import { Search, CalendarPlus, Users, MapPin, Tag, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://localhost:3001/api';

const categories = [
  { id: 'ACADEMIC', name: 'Academic', color: 'bg-blue-500' },
  { id: 'SPORTS', name: 'Sports', color: 'bg-green-500' },
  { id: 'ARTS', name: 'Arts & Culture', color: 'bg-purple-500' },
  { id: 'CLUBS', name: 'Clubs', color: 'bg-pink-500' },
  { id: 'CAREER', name: 'Career', color: 'bg-orange-500' },
  { id: 'GENERAL', name: 'General', color: 'bg-gray-500' },
];

const UNTEvents = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [errorDetails, setErrorDetails] = useState('');

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

  // Subscribe to event mutation
  const subscribeMutation = useMutation({
    mutationFn: async (eventId) => {
      console.log('Subscribing to event:', {
        eventId,
        headers: getAuthHeaders(),
        userId: user?.id
      });

      const response = await fetch(`${API_BASE_URL}/unt/events/${eventId}/subscribe`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to subscribe to event');
      }

      return response.json();
    },
    onSuccess: () => {
      // Don't invalidate queries, just let the optimistic update stay
      queryClient.invalidateQueries(['subscribedEvents']);
    },
    onError: (error) => {
      setErrorDetails(error.message || 'Failed to subscribe to event');
    }
  });

  // Unsubscribe from event mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async (eventId) => {
      console.log('Unsubscribing from event:', {
        eventId,
        headers: getAuthHeaders(),
        userId: user?.id
      });

      const response = await fetch(`${API_BASE_URL}/unt/events/${eventId}/unsubscribe`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to unsubscribe from event');
      }

      return response.json();
    },
    onSuccess: () => {
      // Don't invalidate queries, just let the optimistic update stay
      queryClient.invalidateQueries(['subscribedEvents']);
    },
    onError: (error) => {
      setErrorDetails(error.message || 'Failed to unsubscribe from event');
    }
  });

  // Fetch events
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['untEvents', user?.id],
    queryFn: async () => {
      try {
        console.log('Fetching events with auth:', {
          headers: getAuthHeaders(),
          userId: user?.id
        });

        // First get all events
        const eventsResponse = await fetch(`${API_BASE_URL}/unt/events`, {
          headers: getAuthHeaders()
        });

        if (!eventsResponse.ok) {
          const errorData = await eventsResponse.json();
          setErrorDetails(errorData.message || `Error: ${eventsResponse.status}`);
          throw new Error(errorData.message || 'Failed to fetch events');
        }

        const eventsData = await eventsResponse.json();
        if (!eventsData.success) {
          setErrorDetails(eventsData.message || 'API returned unsuccessful response');
          throw new Error(eventsData.message);
        }

        // If there's no user, return events with is_subscribed as false
        if (!user) {
          return eventsData.data.map(event => ({ ...event, is_subscribed: false }));
        }

        // If there is a user, get their subscribed events
        const subscribedResponse = await fetch(`${API_BASE_URL}/unt/events/subscribed`, {
          headers: getAuthHeaders()
        });

        if (!subscribedResponse.ok) {
          return eventsData.data;
        }

        const subscribedData = await subscribedResponse.json();
        const subscribedIds = new Set(subscribedData.data.map(event => event.id));

        // Mark events as subscribed if they're in the user's subscribed events
        return eventsData.data.map(event => ({
          ...event,
          is_subscribed: subscribedIds.has(event.id)
        }));

      } catch (error) {
        console.error('Error fetching events:', error);
        setErrorDetails(error.message || 'Unknown error occurred');
        throw error;
      }
    },
    enabled: true
  });

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleEventSubscription = async (eventId) => {
    if (!user) {
      setErrorDetails('Please log in to subscribe to events');
      return;
    }

    try {
      const event = events.find(e => e.id === eventId);
      if (!event) {
        setErrorDetails('Event not found');
        return;
      }

      // Optimistically update the UI
      queryClient.setQueryData(['untEvents', user?.id], oldData => {
        return oldData.map(e => {
          if (e.id === eventId) {
            return { ...e, is_subscribed: !e.is_subscribed };
          }
          return e;
        });
      });

      // Then perform the actual server update
      if (event.is_subscribed) {
        await unsubscribeMutation.mutateAsync(eventId);
      } else {
        await subscribeMutation.mutateAsync(eventId);
      }
    } catch (error) {
      // If there's an error, revert the optimistic update
      queryClient.invalidateQueries(['untEvents']);
      console.error('Error toggling event subscription:', error);
      setErrorDetails(error.message || 'Failed to update subscription');
    }
  };

  const filteredEvents = events?.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(event.category);
    return matchesSearch && matchesCategory;
  }) || [];

  // Format date for display
  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Add this helper function near the other helper functions
  const handleViewDetails = (event) => {
    if (!event.link) {
      setErrorDetails('Event link not available');
      return;
    }
    
    // Ensure URL has proper protocol
    let url = event.link;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-[#00853E] rounded-xl shadow-soft p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">UNT Events</h1>
            <p className="text-white/80">Discover and track campus events</p>
          </div>
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-white/60" />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-3">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            className={`
              px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors
              ${selectedCategories.includes(category.id)
                ? `${category.color} text-white`
                : 'bg-white dark:bg-dark-lighter text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-card'}
            `}
          >
            <Tag className="w-4 h-4" />
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          <p className="font-bold">Error loading events</p>
          <p className="text-sm mt-1">{errorDetails || 'Please try again later'}</p>
          <button
            onClick={() => queryClient.invalidateQueries(['untEvents'])}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map(event => (
          <div
            key={event.id}
            className="bg-white dark:bg-dark-lighter rounded-xl shadow-soft p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-dark-light">{event.title}</h3>
                <p className="text-sm text-gray-500 dark:text-dark-muted mt-2">{event.description}</p>
              </div>
              <button
                onClick={() => toggleEventSubscription(event.id)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${event.is_subscribed
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-card'}
                `}
              >
                <CalendarPlus className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-gray-500 dark:text-dark-muted">
                <Clock className="w-4 h-4 mr-2" />
                {formatEventDate(event.event_date)}
              </div>
              {event.location && (
                <div className="flex items-center text-sm text-gray-500 dark:text-dark-muted">
                  <MapPin className="w-4 h-4 mr-2" />
                  {event.location}
                </div>
              )}
              <div className="flex items-center text-sm text-gray-500 dark:text-dark-muted">
                <Users className="w-4 h-4 mr-2" />
                {event.attendees || 0} attending
              </div>
            </div>

            <div className="mt-4 pt-4 border-t dark:border-dark">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  event.category === 'ACADEMIC' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                  event.category === 'SPORTS' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                  event.category === 'ARTS' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' :
                  event.category === 'CLUBS' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-400' :
                  event.category === 'CAREER' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
                }`}>
                  {event.category.toLowerCase()}
                </span>
                <button
                  onClick={() => handleViewDetails(event)}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UNTEvents;
