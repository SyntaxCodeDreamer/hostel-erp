import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { AuthContext } from './AuthContext';
import {
  registerServiceWorker,
  getExistingPushSubscription,
  subscribeUserToPush,
  unsubscribeUserFromPush
} from '../utils/pushManager';

const PushContext = createContext();

export const PushProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Check support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  // Sync subscription state when user logs in or on load
  useEffect(() => {
    async function checkSubscription() {
      if (!user || !isSupported) return;
      try {
        const currentPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
        setPermission(currentPermission);
        
        let sub = await getExistingPushSubscription();
        if (currentPermission === 'granted') {
          try {
            sub = await subscribeUserToPush();
          } catch (autoSubErr) {
            console.warn('Auto push subscription sync notice:', autoSubErr);
          }
        }
        setIsSubscribed(!!sub);
      } catch (err) {
        console.error('Failed to check push subscription status:', err);
      }
    }
    checkSubscription();
  }, [user, isSupported]);

  const subscribe = async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser.');
    }
    setLoading(true);
    setMessage(null);
    try {
      await subscribeUserToPush();
      setIsSubscribed(true);
      setPermission('granted');
      setMessage({ type: 'success', text: 'Web push notifications enabled successfully!' });
    } catch (error) {
      console.error('Subscribe error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to enable notifications.' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await unsubscribeUserFromPush();
      setIsSubscribed(false);
      setMessage({ type: 'info', text: 'Push notifications disabled.' });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to disable notifications.' });
    } finally {
      setLoading(false);
    }
  };

  const sendTestPush = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/push/test', {});
      setMessage({ type: 'success', text: res.data.message || 'Test notification sent!' });
    } catch (error) {
      console.error('Test push error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send test push notification.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PushContext.Provider
      value={{
        isSupported,
        isSubscribed,
        permission,
        loading,
        message,
        setMessage,
        subscribe,
        unsubscribe,
        sendTestPush
      }}
    >
      {children}
    </PushContext.Provider>
  );
};

export const usePush = () => useContext(PushContext);
export { PushContext };
