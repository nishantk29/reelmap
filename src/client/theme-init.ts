// Runs before first paint (loaded as a blocking external script, no inline JS).
try {
  const t = JSON.parse(localStorage.getItem('reelmap:v1:theme') || '"system"');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch {
  /* ignore */
}
