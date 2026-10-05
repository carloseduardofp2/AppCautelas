import { spawnSync } from 'node:child_process';
const env = { ...process.env, EXPO_PUBLIC_FIREBASE_API_KEY: 'demo-key', EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-cautelas', EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-cautelas.firebaseapp.com', EXPO_PUBLIC_FIREBASE_APP_ID: 'demo-app', EXPO_PUBLIC_USE_EMULATORS: 'true' };
const r = spawnSync(process.execPath, ['node_modules/expo/bin/cli', 'export', '--platform', 'web', '--output-dir', 'dist-test'], { env, stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
const configurar = spawnSync(process.execPath, ['scripts/configurar-web.mjs', 'dist-test'], { stdio: 'inherit' });
process.exit(configurar.status ?? 1);
