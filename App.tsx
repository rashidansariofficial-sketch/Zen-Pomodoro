import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Settings } from 'lucide-react';

import { usePomodoro } from './hooks/usePomodoro';
import { useLocalStorage } from './hooks/useLocalStorage';
import TimerDisplay from './components/TimerDisplay';
import ModeSelector from './components/ModeSelector';
import SettingsView from './components/SettingsView';
import { MODES, TimerMode, TimerConfig } from './types';

const App: React.FC = () => {
  // App State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings State - Now Persistent
  const [focusDuration, setFocusDuration] = useLocalStorage('zen-focus', 25);
  const [shortBreakDuration, setShortBreakDuration] = useLocalStorage('zen-short-break', 5);
  const [longBreakDuration, setLongBreakDuration] = useLocalStorage('zen-long-break', 15);
  const [demoDuration, setDemoDuration] = useLocalStorage('zen-demo-duration', 50);
  const [isDemoEnabled, setIsDemoEnabled] = useLocalStorage('zen-demo-enabled', false);

  // Derive current configurations based on settings
  const currentConfig = useMemo<Record<TimerMode, TimerConfig>>(() => ({
    [TimerMode.FOCUS]: { mode: TimerMode.FOCUS, duration: focusDuration * 60, label: 'Focus' },
    [TimerMode.SHORT_BREAK]: { mode: TimerMode.SHORT_BREAK, duration: shortBreakDuration * 60, label: 'Short Break' },
    [TimerMode.LONG_BREAK]: { mode: TimerMode.LONG_BREAK, duration: longBreakDuration * 60, label: 'Long Break' },
    [TimerMode.DEMO]: { mode: TimerMode.DEMO, duration: demoDuration, label: 'Demo' },
  }), [focusDuration, shortBreakDuration, longBreakDuration, demoDuration]);

  // Filter available modes for the selector
  const availableModes = useMemo(() => {
    return (Object.values(currentConfig) as TimerConfig[]).filter(m => 
      m.mode === TimerMode.DEMO ? isDemoEnabled : true
    );
  }, [currentConfig, isDemoEnabled]);

  const {
    mode,
    timeLeft,
    isActive,
    switchMode,
    toggleTimer,
    resetTimer,
  } = usePomodoro(currentConfig);

  // Breathing Logic:
  // Active only when timer is running AND within the first 25 seconds of the session.
  // We calculate elapsed time by comparing total duration vs time left.
  const totalDuration = currentConfig[mode].duration;
  const elapsedTime = totalDuration - timeLeft;
  const isBreathing = isActive && elapsedTime < 25;

  return (
    <div className="min-h-screen bg-black overflow-hidden relative selection:bg-zinc-800">
      
      {/* Main App Content Wrapper */}
      <motion.div
        className="h-[100dvh] w-full flex flex-col items-center justify-between bg-zinc-950 absolute inset-0 origin-top"
      >
        {/* Header / Top Bar */}
        <div className="h-20 w-full flex items-center justify-between px-6 z-20 shrink-0">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500">Zen Pomodoro</span>
            
            {/* Settings Button */}
            <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 -mr-2 text-zinc-500 hover:text-zinc-200 transition-colors"
            aria-label="Settings"
            >
            <Settings size={20} />
            </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-lg relative z-10">
            
            {/* Timer */}
            <div className="mb-12">
                <TimerDisplay 
                    timeLeft={timeLeft} 
                    totalTime={totalDuration}
                    isActive={isActive}
                    isBreathing={isBreathing}
                    onClick={toggleTimer}
                />
            </div>

            {/* Reset Button */}
            <AnimatePresence>
            {/* Show reset if paused or finished (not active) and time is not full */}
            {(!isActive && timeLeft !== totalDuration) && (
                <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={resetTimer}
                className="group flex items-center gap-2 px-6 py-2 rounded-full border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 transition-all duration-300"
                >
                <RotateCcw size={14} className="group-hover:-rotate-180 transition-transform duration-500" />
                <span className="text-xs uppercase tracking-wider font-semibold">Reset</span>
                </motion.button>
            )}
            {/* Placeholder to prevent layout jump when button is hidden */}
            {(isActive || timeLeft === totalDuration) && (
                <div className="h-[34px]" aria-hidden="true" />
            )}
            </AnimatePresence>

        </main>

        {/* Bottom Controls */}
        <footer className="w-full flex flex-col items-center mb-safe-bottom z-10 min-h-[120px] justify-end shrink-0">
            <AnimatePresence>
            {!isActive && (
                <motion.div
                className="w-full flex justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                <ModeSelector 
                    modes={availableModes}
                    currentMode={mode} 
                    onSwitch={switchMode} 
                />
                </motion.div>
            )}
            </AnimatePresence>
            
            {/* Active State Indicator (Optional text instead of controls) */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-10 text-xs tracking-widest text-zinc-600 uppercase font-medium pointer-events-none"
                    >
                        Focus Mode Active
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Safe area padding for mobile home indicators */}
            <div className="h-6 w-full" /> 
        </footer>
        
        {/* Background Ambience (Breathing Effect) - Optimized & Limited Duration */}
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
             <motion.div 
                className="w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(39, 39, 42, 0.25) 0%, rgba(9, 9, 11, 0) 70%)',
                    willChange: 'transform, opacity' // Hardware acceleration hint
                }}
                animate={isBreathing ? "breathing" : "idle"}
                variants={{
                    breathing: {
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 1, 0.6],
                        transition: {
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }
                    },
                    idle: {
                        scale: 1,
                        opacity: 0.4,
                        transition: {
                            duration: 2, // Slow, smooth transition to idle state
                            ease: "easeInOut"
                        }
                    }
                }}
             />
        </div>

      </motion.div>

      {/* Settings Overlay */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsView 
            focusDuration={focusDuration}
            setFocusDuration={setFocusDuration}
            shortBreakDuration={shortBreakDuration}
            setShortBreakDuration={setShortBreakDuration}
            longBreakDuration={longBreakDuration}
            setLongBreakDuration={setLongBreakDuration}
            demoDuration={demoDuration}
            setDemoDuration={setDemoDuration}
            isDemoEnabled={isDemoEnabled}
            setIsDemoEnabled={setIsDemoEnabled}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

export default App;