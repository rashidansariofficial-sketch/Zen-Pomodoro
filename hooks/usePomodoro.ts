import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, MODES } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { playTimerCompleteSound, initAudio } from '../utils/sound';

export const usePomodoro = () => {
  const [mode, setMode] = useState<TimerMode>(TimerMode.FOCUS);
  const [timeLeft, setTimeLeft] = useState(MODES[TimerMode.FOCUS].duration);
  const [isActive, setIsActive] = useState(false);
  
  // Use a ref to track the expected end time to correct for drift
  const endTimeRef = useRef<number | null>(null);
  
  // Track the auto-reset timeout to clear it if user interacts
  const autoResetTimeoutRef = useRef<number | null>(null);

  const clearAutoReset = () => {
    if (autoResetTimeoutRef.current) {
      clearTimeout(autoResetTimeoutRef.current);
      autoResetTimeoutRef.current = null;
    }
  };

  const switchMode = useCallback((newMode: TimerMode) => {
    clearAutoReset();
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
    triggerHaptic('soft');
  }, []);

  const toggleTimer = useCallback(() => {
    clearAutoReset();
    
    if (timeLeft === 0) {
        // Restart logic if timer finished and user manually taps before auto-reset
        setTimeLeft(MODES[mode].duration);
        setIsActive(true);
        triggerHaptic('medium');
        initAudio(); // Prepare audio
        return;
    }

    if (!isActive) {
      // Starting
      setIsActive(true);
      // Calculate expected end time based on current timeLeft
      endTimeRef.current = Date.now() + timeLeft * 1000;
      triggerHaptic('medium');
      initAudio(); // Prepare audio
    } else {
      // Pausing
      setIsActive(false);
      endTimeRef.current = null;
      triggerHaptic('soft');
    }
  }, [isActive, mode, timeLeft]);

  const resetTimer = useCallback(() => {
    clearAutoReset();
    setIsActive(false);
    setTimeLeft(MODES[mode].duration);
    endTimeRef.current = null;
    triggerHaptic('medium');
  }, [mode]);

  useEffect(() => {
    let interval: number;

    if (isActive && timeLeft > 0) {
        // If we just started (or resumed) and haven't set the ref yet (or it's stale from pause)
        if (!endTimeRef.current) {
             endTimeRef.current = Date.now() + timeLeft * 1000;
        }

      interval = window.setInterval(() => {
        if (!endTimeRef.current) return;
        
        const now = Date.now();
        const remaining = Math.ceil((endTimeRef.current - now) / 1000);

        if (remaining <= 0) {
          setTimeLeft(0);
          setIsActive(false);
          endTimeRef.current = null;
          triggerHaptic('success');
          playTimerCompleteSound(); // Play the ring
          
          // Auto-reset after ringing is over (approx 2s) + 1 second wait = 3000ms
          autoResetTimeoutRef.current = window.setTimeout(() => {
              setTimeLeft(MODES[mode].duration);
          }, 3000);

        } else {
          setTimeLeft(remaining);
        }
      }, 100); 
    } else {
       // When paused, clear the interval
       endTimeRef.current = null;
    }

    return () => {
        clearInterval(interval);
    };
  }, [isActive, timeLeft, mode]);

  // Cleanup timeouts on unmount
  useEffect(() => {
      return () => clearAutoReset();
  }, []);

  // Derived progress (0 to 1)
  const progress = 1 - timeLeft / MODES[mode].duration;

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