import React, { createContext, useContext, useState, useEffect } from 'react';

const UNTEventsContext = createContext();

export const UNTEventsProvider = ({ children }) => {
  const [subscribedEvents, setSubscribedEvents] = useState(() => {
    const saved = localStorage.getItem('untSubscribedEvents');
    return saved ? JSON.parse(saved) : [];
  });

  const [eventPreferences, setEventPreferences] = useState(() => {
    const saved = localStorage.getItem('untEventPreferences');
    return saved ? JSON.parse(saved) : {
      categories: [],
      notifications: true,
      emailNotifications: true
    };
  });

  useEffect(() => {
    localStorage.setItem('untSubscribedEvents', JSON.stringify(subscribedEvents));
  }, [subscribedEvents]);

  useEffect(() => {
    localStorage.setItem('untEventPreferences', JSON.stringify(eventPreferences));
  }, [eventPreferences]);

  const subscribeToEvent = (eventId) => {
    setSubscribedEvents(prev => [...new Set([...prev, eventId])]);
  };

  const unsubscribeFromEvent = (eventId) => {
    setSubscribedEvents(prev => prev.filter(id => id !== eventId));
  };

  const updatePreferences = (preferences) => {
    setEventPreferences(prev => ({ ...prev, ...preferences }));
  };

  return (
    <UNTEventsContext.Provider value={{
      subscribedEvents,
      eventPreferences,
      subscribeToEvent,
      unsubscribeFromEvent,
      updatePreferences
    }}>
      {children}
    </UNTEventsContext.Provider>
  );
};

export const useUNTEvents = () => {
  const context = useContext(UNTEventsContext);
  if (!context) {
    throw new Error('useUNTEvents must be used within a UNTEventsProvider');
  }
  return context;
};
