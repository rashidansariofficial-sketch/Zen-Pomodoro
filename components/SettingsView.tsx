import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Lock, Unlock } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface SettingsViewProps {
  focusDuration: number;
  setFocusDuration: (val: number) => void;
  shortBreakDuration: number;
  setShortBreakDuration: (val: number) => void;
  longBreakDuration: number;
  setLongBreakDuration: (val: number) => void;
  demoDuration: number;
  setDemoDuration: (val: number) => void;
  isDemoEnabled: boolean;
  setIsDemoEnabled: (enabled: boolean) => void;
  onClose: () => void;
}

interface CounterRowProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  unit?: string;
  step?: number;
  className?: string;
}

const CounterRow: React.FC<CounterRowProps> = ({ label, value, onChange, min, max, unit = "min", step = 1, className = "" }) => {
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const valueRef = useRef(value);

  // Keep ref in sync with latest value for the interval callback
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAdjusting();
  }, []);

  const stopAdjusting = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startAdjusting = (increment: boolean) => {
    const adjust = () => {
      const currentVal = valueRef.current;
      if (increment) {
        if (currentVal < max) {
          onChange(currentVal + step);
          triggerHaptic('soft');
        } else {
            stopAdjusting();
        }
      } else {
        if (currentVal > min) {
          onChange(currentVal - step);
          triggerHaptic('soft');
        } else {
            stopAdjusting();
        }
      }
    };

    // Immediate execution
    adjust();

    // Setup rapid fire after delay
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(adjust, 100);
    }, 800); // 800ms delay before rapid changes
  };

  const isMin = value <= min;
  const isMax = value >= max;

  return (
    <div className={`flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-white/5 ${className}`}>
      <span className="text-zinc-300 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button 
          onPointerDown={(e) => {
            e.preventDefault(); // Prevent focus/selection
            if (!isMin) startAdjusting(false);
          }}
          onPointerUp={stopAdjusting}
          onPointerLeave={stopAdjusting}
          onPointerCancel={stopAdjusting}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isMin}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 touch-none select-none"
        >
          <Minus size={16} />
        </button>
        
        <div className="w-16 text-center">
            <span className="font-bold text-xl tabular-nums block leading-none">{value}</span>
            {unit && <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{unit}</span>}
        </div>
        
        <button 
          onPointerDown={(e) => {
            e.preventDefault();
            if (!isMax) startAdjusting(true);
          }}
          onPointerUp={stopAdjusting}
          onPointerLeave={stopAdjusting}
          onPointerCancel={stopAdjusting}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isMax}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 touch-none select-none"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

const SettingsView: React.FC<SettingsViewProps> = ({
  focusDuration,
  setFocusDuration,
  shortBreakDuration,
  setShortBreakDuration,
  longBreakDuration,
  setLongBreakDuration,
  demoDuration,
  setDemoDuration,
  isDemoEnabled,
  setIsDemoEnabled,
  onClose,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [errorShake, setErrorShake] = useState(0);
  const [isError, setIsError] = useState(false);

  const handlePinSubmit = (pin: string) => {
    setPinInput(pin);
    if (isError) setIsError(false);
    triggerHaptic('soft');

    if (pin.length === 4) {
      if (pin === '7890') {
        setIsDemoEnabled(true);
        setShowPinInput(false);
        setPinInput('');
        triggerHaptic('success');
      } else {
        setErrorShake(prev => prev + 1);
        setIsError(true);
        triggerHaptic('heavy');
        setTimeout(() => {
            setPinInput('');
            setIsError(false);
        }, 500);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="w-full max-w-sm space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-xl font-medium tracking-wide text-zinc-200">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Timer Settings Container */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2">Timer Durations</h3>
          
          <CounterRow 
            label="Focus" 
            value={focusDuration} 
            onChange={setFocusDuration} 
            min={1} 
            max={60} 
          />
          
          <CounterRow 
            label="Short Break" 
            value={shortBreakDuration} 
            onChange={setShortBreakDuration} 
            min={1} 
            max={10} 
          />
          
          <CounterRow 
            label="Long Break" 
            value={longBreakDuration} 
            onChange={setLongBreakDuration} 
            min={1} 
            max={20} 
          />
        </div>

        {/* Advanced Settings */}
        <div className="pt-2 border-t border-white/5 space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2 mt-4">Advanced</h3>
          
          <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
             {/* Toggle Row */}
             <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    {isDemoEnabled ? <Unlock size={18} className="text-emerald-500" /> : <Lock size={18} className="text-zinc-500" />}
                    <span className="text-zinc-300 font-medium">Demo Mode</span>
                </div>
                
                {isDemoEnabled ? (
                    <button 
                        onClick={() => setIsDemoEnabled(false)}
                        className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-wide border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
                    >
                        Disable
                    </button>
                ) : (
                    <button 
                        onClick={() => setShowPinInput(true)}
                        className="w-12 h-6 rounded-full bg-zinc-800 relative transition-colors hover:bg-zinc-700"
                    >
                        <div className="absolute left-1 top-1 w-4 h-4 bg-zinc-500 rounded-full" />
                    </button>
                )}
             </div>

             {/* PIN Input Panel */}
             <AnimatePresence>
                {showPinInput && !isDemoEnabled && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-6"
                    >
                        <div className="text-xs text-zinc-500 mb-3 ml-1">Enter PIN to enable</div>
                        <motion.div 
                            className="relative"
                            animate={{ x: errorShake % 2 === 0 ? 0 : [0, -10, 10, -10, 10, 0] }}
                            transition={{ duration: 0.4 }}
                        >
                            <input
                                type="tel"
                                maxLength={4}
                                value={pinInput}
                                onChange={(e) => handlePinSubmit(e.target.value)}
                                placeholder="####"
                                className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-center text-lg tracking-[1em] focus:outline-none transition-colors font-mono ${
                                    isError 
                                        ? 'border-red-500/50 text-red-500 focus:border-red-500' 
                                        : 'border-zinc-700 text-zinc-200 focus:border-zinc-500'
                                }`}
                                autoFocus
                            />
                        </motion.div>
                         <button 
                            onClick={() => { setShowPinInput(false); setPinInput(''); }}
                            className="w-full mt-3 py-2 text-xs text-zinc-600 hover:text-zinc-400"
                         >
                            Cancel
                         </button>
                    </motion.div>
                )}
             </AnimatePresence>

             {/* Demo Time Configuration - Moved inside Advanced card */}
             <AnimatePresence>
                {isDemoEnabled && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="border-t border-white/5 p-4 bg-black/20">
                            <CounterRow 
                                label="Demo Duration" 
                                value={demoDuration} 
                                onChange={setDemoDuration} 
                                min={10} 
                                max={120}
                                step={5}
                                unit="sec"
                                className="!bg-transparent !border-0 !p-0"
                            />
                        </div>
                    </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>
        
      </div>
    </motion.div>
  );
};

export default SettingsView;