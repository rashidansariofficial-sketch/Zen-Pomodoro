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
      icon: '/icon.svg',
      // Aggressive vibration pattern: 
      // Vibrate 200ms, pause 100ms (repeat x3), then long vibrate 500ms
      vibrate: [200, 100, 200, 100, 200, 100, 500, 100, 500], 
      tag: 'zen-timer-complete',
      renotify: true,
      requireInteraction: true,
      silent: false, // Explicitly request sound
    };

    const showViaWindow = () => new Notification(title, options);

    if ('serviceWorker' in navigator) {
      // Race the service worker ready promise against a 500ms timeout
      // to prevent hanging if the SW isn't active/registered.
      const swPromise = navigator.serviceWorker.ready.then((registration) => {
        // Check if there is an active SW to handle the notification
        if (registration.active) {
            return registration.showNotification(title, options);
        }
        throw new Error('No active service worker');
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SW timed out')), 500)
      );

      Promise.race([swPromise, timeoutPromise]).catch((e) => {
        // Fallback to standard web notification if SW fails or times out
        console.warn("Falling back to window notification:", e);
        showViaWindow();
      });
    } else {
      showViaWindow();
    }
  }
};