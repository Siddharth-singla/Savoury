// Applies pending Prisma migrations during the Render build.
// Render sets RENDER=true in its build environment; CI and local builds skip
// this. If a migration fails, the build fails and Render keeps the previous
// deploy running, so a bad migration can't take the site down.
const { execSync } = require('child_process');

if (process.env.RENDER !== 'true') {
  console.log('[migrate] Not on Render, skipping prisma migrate deploy');
  process.exit(0);
}

// Migrations whose changes are already in any database that was set up before
// migration tracking (e.g. with `prisma db push`). Used only to baseline.
const PRE_EXISTING = [
  '20260815185057_init_wallet_ledger',
  '20260815193843_remove_billing_qr',
  '20261007190000_add_cowarden_caretaker_roles',
];

const run = (cmd) => execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });

function deploy() {
  const out = run('npx prisma migrate deploy');
  process.stdout.write(out);
}

console.log('[migrate] Applying database migrations...');
try {
  deploy();
} catch (err) {
  const output = `${err.stdout || ''}${err.stderr || ''}`;
  process.stdout.write(output);
  if (!output.includes('P3005')) throw err;

  // P3005: the database has tables but no migration history. Mark the
  // migrations that created those tables as applied, then deploy the rest
  // (the newer migrations are written to be safe on existing tables).
  console.log('[migrate] Database has no migration history; baselining existing migrations...');
  for (const name of PRE_EXISTING) {
    process.stdout.write(run(`npx prisma migrate resolve --applied ${name}`));
  }
  deploy();
}
console.log('[migrate] Done.');
