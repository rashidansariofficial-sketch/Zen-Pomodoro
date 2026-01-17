/* eslint-disable no-restricted-globals */
// Web Worker for handling timer ticks in the background

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'START') {
    const { endTime } = payload;
    
    // Clear any existing interval
    if ((self as any).timerInterval) {
      clearInterval((self as any).timerInterval);
    }

    // Start a new interval
    (self as any).timerInterval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);

      if (remaining <= 0) {
        self.postMessage({ type: 'COMPLETE' });
        clearInterval((self as any).timerInterval);
        (self as any).timerInterval = null;
      } else {
        self.postMessage({ type: 'TICK', timeLeft: remaining });
      }
    }, 1000);

  } else if (type === 'STOP') {
    if ((self as any).timerInterval) {
      clearInterval((self as any).timerInterval);
      (self as any).timerInterval = null;
    }
  }
};

export {};