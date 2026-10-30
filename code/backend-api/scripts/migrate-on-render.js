// Applies pending Prisma migrations during the Render build.
// Render sets RENDER=true in its build environment; CI and local builds skip
// this. If a migration fails, the build fails and Render keeps the previous
// deploy running, so a bad migration can't take the site down.
const { execSync } = require('child_process');

if (process.env.RENDER !== 'true') {
  console.log('[migrate] Not on Render, skipping prisma migrate deploy');
  process.exit(0);
}

console.log('[migrate] Applying database migrations...');
execSync('npx prisma migrate deploy', { stdio: 'inherit' });
