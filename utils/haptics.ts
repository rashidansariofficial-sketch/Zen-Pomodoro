export const triggerHaptic = (type: 'soft' | 'medium' | 'heavy' | 'success') => {
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
  }
};