import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimerDisplayProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  onClick: () => void;
}

// Animated Digit Component
// Uses a fixed width container to prevent layout shifts while the number slides/fades
const Digit = ({ value }: { value: string }) => {
  return (
    <div className="relative w-[0.6em] h-[1.2em] flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-40%', opacity: 0, filter: 'blur(3px)' }}
          animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '40%', opacity: 0, filter: 'blur(3px)' }}
          transition={{ type: "spring", stiffness: 400, damping: 25, mass: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

const TimerDisplay: React.FC<TimerDisplayProps> = ({ timeLeft, totalTime, isActive, onClick }) => {
  
  const formatDigits = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    return { mStr, sStr };
  };

  const { mStr, sStr } = formatDigits(timeLeft);

  // SVG parameters for the progress ring
  const radius = 120;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = 1 - timeLeft / totalTime;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center p-8">
      {/* Interactive area wrapper */}
      <motion.button
        onClick={onClick}
        className="relative flex items-center justify-center rounded-full outline-none focus:outline-none select-none touch-manipulation group"
        whileTap={{ scale: 0.95 }}
        // Animation states: Active (Breathing), Done (Ringing/Shaking), Paused/Idle (Normal)
        animate={
            isActive 
                ? { scale: [1, 1.02, 1] } 
                : timeLeft === 0
                    ? { rotate: [0, -3, 3, -3, 3, 0] }
                    : { scale: 1 }
        }
        transition={
            isActive 
                ? { repeat: Infinity, duration: 4, ease: "easeInOut" }
                : timeLeft === 0
                    ? { repeat: 4, duration: 0.5, ease: "easeInOut", repeatDelay: 1 }
                    : { type: "spring", stiffness: 300, damping: 20 }
        }
        aria-label={isActive ? "Pause Timer" : "Start Timer"}
      >
        {/* Background Ring */}
        <svg
          height={radius * 2}
          width={radius * 2}
          className="rotate-[-90deg] transform"
        >
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset: 0 }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="text-zinc-800 transition-colors duration-500"
          />
          {/* Progress Ring */}
          <motion.circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            initial={{ strokeDashoffset }}
            animate={{ strokeDashoffset }}
            transition={{
                duration: isActive ? 1 : 0.5,
                ease: isActive ? "linear" : "easeOut"
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className={`transition-colors duration-500 ease-in-out ${
              isActive 
                ? 'text-white' 
                : timeLeft === 0 
                    ? 'text-zinc-200' 
                    : 'text-zinc-500'
            }`}
          />
        </svg>

        {/* Time Text Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center text-6xl font-bold tabular-nums tracking-tight overflow-hidden h-[1.2em]">
             {/* We map explicitly to handle the layout of digits */}
             <div className={`flex ${isActive ? 'text-white' : 'text-zinc-400'} transition-colors duration-300`}>
                <Digit value={mStr[0]} />
                <Digit value={mStr[1]} />
                {/* Separator with optional pulse */}
                <motion.div 
                    className="w-[0.4em] flex justify-center items-center pb-2"
                    animate={isActive ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                    :
                </motion.div>
                <Digit value={sStr[0]} />
                <Digit value={sStr[1]} />
             </div>
          </div>
          
          {/* Label */}
          <span className={`mt-2 text-sm font-medium uppercase tracking-widest ${isActive ? 'text-zinc-400' : 'text-zinc-600'} transition-colors`}>
            {isActive ? 'Running' : timeLeft === 0 ? 'Done' : 'Paused'}
          </span>
        </div>
        
        {/* Breathing Halo effect when active */}
        {isActive && (
            <motion.div
                className="absolute -inset-4 rounded-full border border-white/5 pointer-events-none"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ scale: [1, 1.1, 1], opacity: [0, 0.4, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
        )}
        
        {/* Subtle Ringing Ripple when Done */}
        {!isActive && timeLeft === 0 && (
             <motion.div
                className="absolute -inset-4 rounded-full border border-white/10 pointer-events-none"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
            />
        )}
      </motion.button>
    </div>
  );
};

export default TimerDisplay;