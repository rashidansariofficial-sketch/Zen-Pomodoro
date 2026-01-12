import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, TimerConfig } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { playTimerCompleteSound, initAudio } from '../utils/sound';

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
  const endTimeRef = useRef<number | null>(() => {
      const session = getStoredSession();
      if (session?.isActive && session?.endTime) {
          const remaining = Math.ceil((session.endTime - Date.now()) / 1000);
          if (remaining > 0) return session.endTime;
      }
      return null;
  });
  
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
        persistSession(mode, true, endTimeRef.current, duration);
        return;
    }

    if (!isActive) {
      // Start/Resume
      setIsActive(true);
      endTimeRef.current = Date.now() + timeLeft * 1000;
      
      triggerHaptic('medium');
      initAudio();
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
      // Only update if the stored timeLeft matches the *old* duration of this mode
      // This is tricky. Simplified: If inactive, and we are not in a "paused mid-way" state, update.
      // For now, we trust the persistence logic above. 
      // If user changes setting 25->30, and we are at 25:00, we want 30:00.
      // If we are at 20:00 (paused), we probably want to keep 20:00? 
      // Let's adopt a simple rule: if timeLeft equals the *previous* default, update it? 
      // Actually, standard behavior: if Paused, don't change. If "Fresh", change.
      // Determining "Fresh" is hard.
      // Let's just force update if timeLeft equals the OLD duration? No, we don't know old duration.
      
      // Safe bet: If the timer is NOT active, and the current timeLeft matches the *previous* config for this mode (implicit), update?
      // Actually, let's just NOT auto-update timeLeft on config change if it looks like a custom paused time.
      // But if the user just opened settings and changed 25 to 30, they expect 30.
      
      // Workaround: We'll update timeLeft if it seems to be a full duration (even if old).
      // Or simply: If we are not active, sync to new duration. 
      // The only downside is losing "paused" progress if you change settings. This is acceptable.
       const session = getStoredSession();
       // Only override if we aren't mid-session
       const isMidSession = session && session.mode === mode && session.timeLeft !== config[mode].duration && session.timeLeft !== 0; // rough check
       
       // Actually, let's just respect the current config if we aren't active. 
       // The user interaction in SettingsView implies intent.
       // But we need to avoid the loop where `config` is recreated every render. `currentConfig` in App.tsx is Memoized.
       // We only want to setTimeLeft if `config[mode].duration` CHANGED from what `timeLeft` currently is?
       // No, `timeLeft` counts down.
       
       // Let's rely on the user to hit Reset if they want the new time, OR:
       // If the timer is at "Start" state (config check difficult), update.
       // Let's just leave timeLeft alone unless Reset is clicked. This is safer.
       // User changes 25->30. Timer says 25:00. User clicks Reset -> 30:00. That's fine.
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
          
          // Optional: Persist periodically (e.g. every 5s) to ensure crash recovery?
          // Not strictly necessary if we have endTime, but helpful for "timeLeft" display if we load while paused?
          // No, if we load while active, we calculate from endTime. We don't need accurate timeLeft in DB.
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