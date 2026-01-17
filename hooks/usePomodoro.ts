import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, TimerConfig } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { playTimerCompleteSound, initAudio } from '../utils/sound';
import { requestNotificationPermission, sendNotification } from '../utils/notifications';

const SESSION_KEY = 'zen-session-v1';

interface StoredSession {
  mode: TimerMode;
  isActive: boolean;
  endTime: number | null;
  timeLeft: number;
  timestamp: number;
}

export const usePomodoro = (config: Record<TimerMode, TimerConfig>) => {
  // 1. Lazy Initialization from LocalStorage
  // We interpret the storage state immediately to set the initial values
  // This prevents the "flash" of a default state before restoration
  
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
    
    // Check if the session is still valid (in the future)
    const remaining = Math.ceil((session.endTime - Date.now()) / 1000);
    return remaining > 0;
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const session = getStoredSession();
    const defaultDuration = config[TimerMode.FOCUS].duration;

    if (!session) return defaultDuration;

    if (session.isActive && session.endTime) {
       const remaining = Math.ceil((session.endTime - Date.now()) / 1000);
       return remaining > 0 ? remaining : 0;
    }

    // If we were paused, return the stored remaining time
    // But verify it matches the current mode's logic roughly (optional)
    return typeof session.timeLeft === 'number' ? session.timeLeft : config[session.mode].duration;
  });
  
  // Use a ref to track the expected end time to correct for drift
  // Fix: Immediately invoke the function to pass the value to useRef, as useRef does not accept a factory function
  const endTimeRef = useRef<number | null>((() => {
      const session = getStoredSession();
      if (session?.isActive && session?.endTime) {
          const remaining = Math.ceil((session.endTime - Date.now()) / 1000);
          if (remaining > 0) return session.endTime;
      }
      return null;
  })());
  
  // Track the auto-reset timeout to clear it if user interacts
  const autoResetTimeoutRef = useRef<number | null>(null);

  const clearAutoReset = () => {
    if (autoResetTimeoutRef.current) {
      clearTimeout(autoResetTimeoutRef.current);
      autoResetTimeoutRef.current = null;
    }
  };

  // Helper to persist state
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

  const switchMode = useCallback((newMode: TimerMode) => {
    clearAutoReset();
    setIsActive(false);
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
        // Restart
        const duration = config[mode].duration;
        setTimeLeft(duration);
        setIsActive(true);
        endTimeRef.current = Date.now() + duration * 1000;
        
        triggerHaptic('medium');
        initAudio();
        requestNotificationPermission(); // Ask for permission on interaction
        persistSession(mode, true, endTimeRef.current, duration);
        return;
    }

    if (!isActive) {
      // Start/Resume
      setIsActive(true);
      endTimeRef.current = Date.now() + timeLeft * 1000;
      
      triggerHaptic('medium');
      initAudio();
      requestNotificationPermission(); // Ask for permission on interaction
      persistSession(mode, true, endTimeRef.current, timeLeft);
    } else {
      // Pause
      setIsActive(false);
      endTimeRef.current = null;
      
      triggerHaptic('soft');
      persistSession(mode, false, null, timeLeft);
    }
  }, [isActive, mode, timeLeft, config, persistSession]);

  const resetTimer = useCallback(() => {
    clearAutoReset();
    setIsActive(false);
    
    const duration = config[mode].duration;
    setTimeLeft(duration);
    endTimeRef.current = null;
    
    triggerHaptic('medium');
    persistSession(mode, false, null, duration);
  }, [mode, config, persistSession]);

  // Handle configuration changes (e.g. settings update)
  useEffect(() => {
    if (!isActive) {
       // See notes in previous version about why we keep this minimal
    }
  }, [config, mode, isActive]);

  // The Timer Loop
  useEffect(() => {
    let interval: number;

    if (isActive && timeLeft > 0) {
        if (!endTimeRef.current) {
             endTimeRef.current = Date.now() + timeLeft * 1000;
        }

      interval = window.setInterval(() => {
        if (!endTimeRef.current) return;
        
        const now = Date.now();
        const remaining = Math.ceil((endTimeRef.current - now) / 1000);

        if (remaining <= 0) {
          // Timer Finished
          setTimeLeft(0);
          setIsActive(false);
          endTimeRef.current = null;
          
          triggerHaptic('alarm');
          playTimerCompleteSound();

          // Send notification if app is hidden (background)
          if (document.visibilityState === 'hidden') {
            sendNotification('Timer Complete', `${config[mode].label} session finished.`);
          }
          
          // Clear session active state but keep mode
          persistSession(mode, false, null, 0);

          autoResetTimeoutRef.current = window.setTimeout(() => {
              const newDuration = config[mode].duration;
              setTimeLeft(newDuration);
              persistSession(mode, false, null, newDuration);
          }, 3000);

        } else {
          // Tick
          setTimeLeft(prev => {
            if (prev !== remaining) return remaining;
            return prev;
          });
        }
      }, 1000); 
    } else {
       endTimeRef.current = null;
    }

    return () => {
        clearInterval(interval);
    };
  }, [isActive, timeLeft, mode, config, persistSession]);

  useEffect(() => {
      return () => clearAutoReset();
  }, []);

  const progress = 1 - timeLeft / config[mode].duration;

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