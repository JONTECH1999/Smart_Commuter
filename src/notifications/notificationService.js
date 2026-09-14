// src/notifications/notificationService.js
// Helper for Web Notification API
export function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications.');
    return Promise.resolve(false);
  }
  return Notification.requestPermission().then((permission) => permission === 'granted');
}

export function showBrowserNotification(title = 'Alert', options = { body: 'You have entered the alert zone!', icon: undefined }) {
  if (!('Notification' in window)) {
    alert(`${title}: ${options.body}`);
    return;
  }
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  } else {
    // Fallback to alert if permission not granted
    alert(`${title}: ${options.body}`);
  }
}
