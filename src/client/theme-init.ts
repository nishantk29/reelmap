// Runs before first paint (loaded as a blocking external script, no inline JS).
// The theme always follows the system setting; drop a theme saved by an older version.
try {
  localStorage.removeItem('reelmap:v1:theme');
} catch {
  /* ignore */
}
