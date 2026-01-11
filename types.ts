export enum TimerMode {
  FOCUS = 'focus',
  SHORT_BREAK = 'short',
  LONG_BREAK = 'long',
  DEMO = 'demo',
}

export interface TimerConfig {
  mode: TimerMode;
  duration: number; // in seconds
  label: string;
}

export const MODES: Record<TimerMode, TimerConfig> = {
  [TimerMode.FOCUS]: { mode: TimerMode.FOCUS, duration: 25 * 60, label: 'Focus' },
  [TimerMode.SHORT_BREAK]: { mode: TimerMode.SHORT_BREAK, duration: 5 * 60, label: 'Short Break' },
  [TimerMode.LONG_BREAK]: { mode: TimerMode.LONG_BREAK, duration: 15 * 60, label: 'Long Break' },
  [TimerMode.DEMO]: { mode: TimerMode.DEMO, duration: 5, label: 'Demo' },
};