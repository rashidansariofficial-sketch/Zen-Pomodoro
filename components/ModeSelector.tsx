import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { TimerMode, MODES } from '../types';

interface ModeSelectorProps {
  currentMode: TimerMode;
  onSwitch: (mode: TimerMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onSwitch }) => {
  const modesList = Object.values(MODES);
  
  // We use this to detect simple swipe gestures on the container
  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50;
    const currentIndex = modesList.findIndex(m => m.mode === currentMode);
    
    if (info.offset.x > threshold) {
      // Swiped Right -> Previous Mode
      if (currentIndex > 0) {
        onSwitch(modesList[currentIndex - 1].mode);
      }
    } else if (info.offset.x < -threshold) {
      // Swiped Left -> Next Mode
      if (currentIndex < modesList.length - 1) {
        onSwitch(modesList[currentIndex + 1].mode);
      }
    }
  };

  return (
    <div className="w-full max-w-md px-6 pb-8">
      {/* Draggable area for swipe detection */}
      <motion.div 
        className="relative bg-zinc-900/50 rounded-2xl p-1 backdrop-blur-sm overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        <div className="flex justify-between items-center relative z-10">
          {modesList.map((m) => {
            const isSelected = currentMode === m.mode;
            return (
              <button
                key={m.mode}
                onClick={() => onSwitch(m.mode)}
                className={`relative flex-1 py-3 text-sm font-medium transition-colors duration-300 z-10 outline-none focus:outline-none ${
                  isSelected ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {/* Background Pill for Active State */}
                {isSelected && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{m.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
      
      {/* Helper text for accessibility/ux */}
      <div className="text-center mt-3 opacity-30 text-xs text-zinc-500 font-medium">
        Swipe to switch modes
      </div>
    </div>
  );
};

export default ModeSelector;