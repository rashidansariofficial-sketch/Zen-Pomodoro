import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

import { usePomodoro } from './hooks/usePomodoro';
import TimerDisplay from './components/TimerDisplay';
import ModeSelector from './components/ModeSelector';
import { MODES } from './types';

const App: React.FC = () => {
  const {
    mode,
    timeLeft,
    isActive,
    switchMode,
    toggleTimer,
    resetTimer,
  } = usePomodoro();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-between overflow-hidden selection:bg-zinc-800 relative">
      
      {/* Header / Spacer */}
      <div className="h-16 w-full flex items-center justify-center opacity-40 z-10">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500">Zen Pomodoro</span>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-lg relative z-10">
        
        {/* Timer */}
        <div className="mb-12">
            <TimerDisplay 
                timeLeft={timeLeft} 
                totalTime={MODES[mode].duration}
                isActive={isActive}
                onClick={toggleTimer}
            />
        </div>

        {/* Reset Button */}
        <AnimatePresence>
          {/* Show reset if paused or finished (not active) and time is not full */}
          {(!isActive && timeLeft !== MODES[mode].duration) && (
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
           {(isActive || timeLeft === MODES[mode].duration) && (
             <div className="h-[34px]" aria-hidden="true" />
           )}
        </AnimatePresence>

      </main>

      {/* Bottom Controls */}
      <footer className="w-full flex flex-col items-center mb-safe-bottom z-10 min-h-[120px] justify-end">
        <AnimatePresence>
          {!isActive && (
            <motion.div
              className="w-full flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <ModeSelector currentMode={mode} onSwitch={switchMode} />
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

      {/* Background Ambience (Breathing Effect) */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center">
         <motion.div 
            className="w-[500px] h-[500px] bg-zinc-800/30 rounded-full blur-[100px]"
            animate={isActive ? {
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
            } : {
                scale: 1,
                opacity: 0.2
            }}
            transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
            }}
         />
      </div>
    </div>
  );
};

export default App;