export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

export const sendNotification = (title: string, body: string) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const options: any = {
      body,
      icon: '/icon.svg', // Ensure this path matches your public folder asset
      // This pattern triggers the system vibration for the notification
      vibrate: [200, 100, 200, 100, 200, 100, 400], 
      tag: 'zen-timer-complete',
      renotify: true, // Vibrates even if an old notification is still there
      requireInteraction: true, // Keeps notification visible until clicked
    };

    // Attempt to use Service Worker Registration (Standard for PWAs)
    // This allows the notification to show up more reliably on mobile
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, options);
      }).catch((e) => {
        console.warn("SW notification failed, falling back to window", e);
        new Notification(title, options);
      });
    } else {
      // Fallback for non-SW environments
      new Notification(title, options);
    }
  }
};