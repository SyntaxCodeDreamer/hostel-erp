import axios from 'axios';

const API_BASE_URL = '/api';

/**
 * Convert VAPID public key from URL-safe base64 to Uint8Array
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register Service Worker if supported
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push Notifications are not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('Service Worker registered successfully with scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Get active Service Worker registration
 */
export async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  return await navigator.serviceWorker.ready;
}

/**
 * Fetch VAPID public key from backend
 */
export async function getVapidPublicKey() {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_BASE_URL}/push/public-key`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return response.data.publicKey;
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeUserToPush() {
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Service Worker is not registered or supported.');
  }

  // Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied by user.');
  }

  // Fetch public key
  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    throw new Error('Could not retrieve VAPID public key from server.');
  }

  const convertedKey = urlBase64ToUint8Array(publicKey);

  // Subscribe via PushManager
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey
  });

  // Send subscription to backend
  const token = localStorage.getItem('token');
  await axios.post(
    `${API_BASE_URL}/push/subscribe`,
    subscription.toJSON(),
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  return subscription;
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeUserFromPush() {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    // Notify backend
    const token = localStorage.getItem('token');
    if (token) {
      await axios.post(
        `${API_BASE_URL}/push/unsubscribe`,
        { endpoint },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
  }
}

/**
 * Check current push subscription status
 */
export async function getExistingPushSubscription() {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;
  return await registration.pushManager.getSubscription();
}
