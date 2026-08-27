(() => {
  'use strict';

  const blockedCombo = (e) => {
    const key = String(e.key || '').toLowerCase();
    return (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(key)) ||
      (e.metaKey && e.altKey && ['i','j','c'].includes(key)) ||
      ((e.ctrlKey || e.metaKey) && key === 'u')
    );
  };

  document.addEventListener('keydown', e => {
    if (!blockedCombo(e)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  document.addEventListener('contextmenu', e => {
    e.preventDefault();
  }, true);
})();
