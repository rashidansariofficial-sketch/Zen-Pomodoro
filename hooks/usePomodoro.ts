import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerMode, TimerConfig } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { playTimerCompleteSound, initAudio } from '../utils/sound';

export const usePomodoro = (config: Record<TimerMode, TimerConfig>) => {
  const [mode, setMode] = useState<TimerMode>(TimerMode.FOCUS);
  const [timeLeft, setTimeLeft] = useState(config[TimerMode.FOCUS].duration);
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
    setTimeLeft(config[newMode].duration);
    triggerHaptic('soft');
  }, [config]);

  const toggleTimer = useCallback(() => {
    clearAutoReset();
    
    if (timeLeft === 0) {
        // Restart logic if timer finished and user manually taps before auto-reset
        setTimeLeft(config[mode].duration);
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
  }, [isActive, mode, timeLeft, config]);

  const resetTimer = useCallback(() => {
    clearAutoReset();
    setIsActive(false);
    setTimeLeft(config[mode].duration);
    endTimeRef.current = null;
    triggerHaptic('medium');
  }, [mode, config]);

  // Handle configuration changes (e.g. settings update)
  useEffect(() => {
    if (!isActive) {
      // If the timer is idle, update the display to match the new duration
      // This ensures if user changes 25 -> 30, they see 30 immediately.
      setTimeLeft(config[mode].duration);
    }
  }, [config, mode, isActive]);

  useEffect(() => {
    let interval: number;

    if (isActive && timeLeft > 0) {
        // If we just started (or resumed) and haven't set the ref yet (or it's stale from pause)
        if (!endTimeRef.current) {
             endTimeRef.current = Date.now() + timeLeft * 1000;
        }

      // REDUCED FREQUENCY: 100ms -> 1000ms
      interval = window.setInterval(() => {
        if (!endTimeRef.current) return;
        
        const now = Date.now();
        const remaining = Math.ceil((endTimeRef.current - now) / 1000);

        if (remaining <= 0) {
          setTimeLeft(0);
          setIsActive(false);
          endTimeRef.current = null;
          triggerHaptic('alarm');
          playTimerCompleteSound(); 
          
          autoResetTimeoutRef.current = window.setTimeout(() => {
              setTimeLeft(config[mode].duration);
          }, 3000);

        } else {
          // Only update state if the second has actually changed to prevent redundant renders
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
  }, [isActive, timeLeft, mode, config]);

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