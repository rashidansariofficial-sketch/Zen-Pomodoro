export const triggerHaptic = (type: 'soft' | 'medium' | 'heavy' | 'success' | 'alarm') => {
  if (!navigator.vibrate) return;

  switch (type) {
    case 'soft':
      navigator.vibrate(10);
      break;
    case 'medium':
      navigator.vibrate(40);
      break;
    case 'heavy':
      navigator.vibrate(80);
      break;
    case 'success':
      navigator.vibrate([50, 50, 50]);
      break;
    case 'alarm':
      // Pulsing vibration for ~2.5s to match audio duration
      // Vibrate 400ms, pause 100ms, repeat 5 times
      navigator.vibrate([400, 100, 400, 100, 400, 100, 400, 100, 400]);
      break;
  }
};