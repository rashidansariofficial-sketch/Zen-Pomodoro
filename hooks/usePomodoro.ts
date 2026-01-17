import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, TimerConfig } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { playTimerCompleteSound, initAudio, toggleSilentAudio } from '../utils/sound';
import { requestNotificationPermission, sendNotification } from '../utils/notifications';

const SESSION_KEY = 'zen-session-v1';

interface StoredSession {
  mode: TimerMode;
  isActive: boolean;
  endTime: number | null;
  timeLeft: number;
  timestamp: number;
}

// Worker code as a string to avoid import/bundler issues
const WORKER_CODE = `
self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'START') {
    const { endTime } = payload;
    
    if (self.timerInterval) {
      clearInterval(self.timerInterval);
    }

    self.timerInterval = setInterval(function() {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);

      if (remaining <= 0) {
        self.postMessage({ type: 'COMPLETE' });
        clearInterval(self.timerInterval);
        self.timerInterval = null;
      } else {
        self.postMessage({ type: 'TICK', timeLeft: remaining });
      }
    }, 1000);

  } else if (type === 'STOP') {
    if (self.timerInterval) {
      clearInterval(self.timerInterval);
      self.timerInterval = null;
    }
  }
};
`;

export const usePomodoro = (config: Record<TimerMode, TimerConfig>) => {
  const workerRef = useRef<Worker | null>(null);

  const getStoredSession = (): StoredSession | null => {
    if (typeof window === 'undefined') return null;
    try {
      const item = window.localStorage.getItem(SESSION_KEY);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  };

  const [mode, setMode] = useState<TimerMode>(() => {
    const session = getStoredSession();
    return (session?.mode && config[session.mode]) ? session.mode : TimerMode.FOCUS;
  });

  const [isActive, setIsActive] = useState<boolean>(() => {
    const session = getStoredSession();
    if (!session || !session.isActive || !session.endTime) return false;
    const remaining = Math.ceil((session.endTime - Date.now()) / 1000);
    return remaining > 0;
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const session = getStoredSession();
    const defaultDuration = config[TimerMode.FOCUS]?.duration || 1500;
    
    // Safety check for config existence
    if (!config[TimerMode.FOCUS]) return 1500;

    if (!session) return config[mode]?.duration ?? defaultDuration;

    if (session.isActive && session.endTime) {
       const remaining = Math.ceil((session.endTime - Date.now()) / 1000);
       return remaining > 0 ? remaining : 0;
    }
    
    const modeDuration = config[session.mode]?.duration ?? defaultDuration;
    return typeof session.timeLeft === 'number' ? session.timeLeft : modeDuration;
  });
  
  const endTimeRef = useRef<number | null>((() => {
      const session = getStoredSession();
      if (session?.isActive && session?.endTime) {
          const remaining = Math.ceil((session.endTime - Date.now()) / 1000);
          if (remaining > 0) return session.endTime;
      }
      return null;
  })());
  
  const autoResetTimeoutRef = useRef<number | null>(null);

  const clearAutoReset = () => {
    if (autoResetTimeoutRef.current) {
      clearTimeout(autoResetTimeoutRef.current);
      autoResetTimeoutRef.current = null;
    }
  };

  const persistSession = useCallback((
    currentMode: TimerMode,
    active: boolean,
    currentEndTime: number | null,
    currentTimeLeft: number
  ) => {
      const session: StoredSession = {
          mode: currentMode,
          isActive: active,
          endTime: currentEndTime,
          timeLeft: currentTimeLeft,
          timestamp: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, []);

  const handleTimerComplete = useCallback(() => {
      setTimeLeft(0);
      setIsActive(false);
      endTimeRef.current = null;
      
      // Stop the silent background audio
      toggleSilentAudio(false);

      // Play the actual bell sound
      triggerHaptic('alarm');
      playTimerCompleteSound();

      if (document.visibilityState === 'hidden') {
        sendNotification('Timer Complete', `${config[mode].label} session finished.`);
      }
      
      persistSession(mode, false, null, 0);

      autoResetTimeoutRef.current = window.setTimeout(() => {
          // Reset logic: Stay on current mode, just reset the time
          const duration = config[mode].duration;
          setTimeLeft(duration);
          persistSession(mode, false, null, duration);
      }, 3000);
  }, [config, mode, persistSession]);

  // Keep a ref to the latest handler to avoid stale closures in the worker callback
  const handleTimerCompleteRef = useRef(handleTimerComplete);
  useEffect(() => {
    handleTimerCompleteRef.current = handleTimerComplete;
  }, [handleTimerComplete]);

  // Initialize Worker
  useEffect(() => {
    // Create worker from Blob
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    
    workerRef.current.onmessage = (e) => {
      const { type, timeLeft: workerTimeLeft } = e.data;
      
      if (type === 'TICK') {
        setTimeLeft(workerTimeLeft);
      } else if (type === 'COMPLETE') {
        // Use the ref to ensure we call the latest version of the handler with fresh state (mode/config)
        handleTimerCompleteRef.current();
      }
    };

    // If we mount and state says active, ensure worker is running
    if (isActive && endTimeRef.current) {
      workerRef.current.postMessage({ 
        type: 'START', 
        payload: { endTime: endTimeRef.current } 
      });
      // Also ensure silent audio is running if we are active on mount
      toggleSilentAudio(true);
    }

    return () => {
      workerRef.current?.terminate();
      URL.revokeObjectURL(workerUrl);
      toggleSilentAudio(false); // Cleanup audio
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Sync worker when active state changes
  useEffect(() => {
    if (isActive && endTimeRef.current) {
      workerRef.current?.postMessage({ 
        type: 'START', 
        payload: { endTime: endTimeRef.current } 
      });
    } else {
      workerRef.current?.postMessage({ type: 'STOP' });
    }
  }, [isActive]);

  const switchMode = useCallback((newMode: TimerMode) => {
    clearAutoReset();
    setIsActive(false);
    toggleSilentAudio(false); // Ensure audio stops on manual switch
    setMode(newMode);
    
    const newDuration = config[newMode].duration;
    setTimeLeft(newDuration);
    endTimeRef.current = null;
    
    triggerHaptic('soft');
    persistSession(newMode, false, null, newDuration);
  }, [config, persistSession]);

  const toggleTimer = useCallback(() => {
    clearAutoReset();
    
    if (timeLeft === 0) {
        // Restart current mode
        const duration = config[mode].duration;
        setTimeLeft(duration);
        setIsActive(true);
        endTimeRef.current = Date.now() + duration * 1000;
        
        triggerHaptic('medium');
        initAudio();
        toggleSilentAudio(true); // Start background audio hack
        requestNotificationPermission();
        persistSession(mode, true, endTimeRef.current, duration);
        return;
    }

    if (!isActive) {
      // Start/Resume
      setIsActive(true);
      endTimeRef.current = Date.now() + timeLeft * 1000;
      
      triggerHaptic('medium');
      initAudio();
      toggleSilentAudio(true); // Start background audio hack
      requestNotificationPermission();
      persistSession(mode, true, endTimeRef.current, timeLeft);
    } else {
      // Pause
      setIsActive(false);
      endTimeRef.current = null;
      
      toggleSilentAudio(false); // Stop background audio
      triggerHaptic('soft');
      persistSession(mode, false, null, timeLeft);
    }
  }, [isActive, mode, timeLeft, config, persistSession]);

  const resetTimer = useCallback(() => {
    clearAutoReset();
    setIsActive(false);
    toggleSilentAudio(false);
    
    const duration = config[mode].duration;
    setTimeLeft(duration);
    endTimeRef.current = null;
    
    triggerHaptic('medium');
    persistSession(mode, false, null, duration);
  }, [mode, config, persistSession]);

  useEffect(() => {
      return () => {
          clearAutoReset();
          toggleSilentAudio(false);
      };
  }, []);

  // Track the previous config to detect duration changes
  const lastConfigRef = useRef({ mode, duration: config[mode].duration });

  useEffect(() => {
    const last = lastConfigRef.current;
    const currentDuration = config[mode].duration;

    // Check if configuration for the current mode has changed
    if (mode === last.mode && currentDuration !== last.duration) {
       // Config changed.
       if (!isActive) {
         // If timer is not running, we decide whether to update the displayed time.
         // We update if the timer was at the initial state (full duration of previous setting)
         // or if it was finished (0).
         // If it was paused in the middle, we treat it as "started" and preserve the session.
         const wasAtFullDuration = Math.abs(timeLeft - last.duration) < 1;
         const wasFinished = timeLeft === 0;

         if (wasAtFullDuration || wasFinished) {
            setTimeLeft(currentDuration);
            // Also update persistence so a reload keeps the new setting
            persistSession(mode, false, null, currentDuration);
         }
       }
    }

    // Update ref
    lastConfigRef.current = { mode, duration: currentDuration };
  }, [config, mode, isActive, timeLeft, persistSession]);

  const duration = config[mode]?.duration || 1500;
  const progress = 1 - timeLeft / duration;

  return {
    mode,
    timeLeft,
    isActive,
    progress,
    switchMode,
    toggleTimer,
    resetTimer,
  };
};