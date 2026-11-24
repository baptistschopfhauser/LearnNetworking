// Remove previously built files at the repo root before a fresh build.
import { rmSync } from 'node:fs';
rmSync(new URL('../assets', import.meta.url), { recursive: true, force: true });
rmSync(new URL('../index.html', import.meta.url), { force: true });
