// Saves the public cleaner list into the build so the landing page can show
// cards instantly, even while the Render backend is asleep. Never fails the
// build: if the backend doesn't answer, the app just fetches live as before.
import { writeFileSync } from 'node:fs';

const URL = 'https://cleanersapp-backend.onrender.com/api/public/cleaners';
const OUT = new globalThis.URL('../src/assets/cleaners-snapshot.json', import.meta.url);

let cleaners = [];
try {
  const res = await fetch(URL, { signal: AbortSignal.timeout(90_000) });
  const data = await res.json();
  if (res.ok && Array.isArray(data)) cleaners = data;
  console.log(`snapshot: ${cleaners.length} cleaners`);
} catch (err) {
  console.warn(`snapshot: backend unavailable (${err.message}), shipping an empty snapshot`);
}
writeFileSync(OUT, JSON.stringify(cleaners));
