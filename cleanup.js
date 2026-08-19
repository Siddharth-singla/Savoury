const fs = require('fs');
const path = require('path');

const filesToDelete = [
  // Backend API
  'backend-api/src/routes/billing.routes.ts',
  'backend-api/src/controllers/billing.controller.ts',
  'backend-api/src/services/billing.service.ts',
  'backend-api/src/utils/billing-calc.ts',
  'backend-api/tests/billing.test.ts',
  'backend-api/src/utils/qr.ts',
  'backend-api/tests/qr.test.ts',
  // Web App
  'web/src/pages/BillingPage.tsx',
  'web/src/api/billing.ts',
  'web/src/pages/ScannerPage.tsx',
  // Mobile App
  'mobile/src/api/billing.ts',
  'mobile/src/hooks/useMyBills.ts',
  'mobile/src/api/qr.ts',
  'mobile/src/hooks/useMyQr.ts',
  'mobile/app/(app)/qr.tsx',
  'mobile/app/(app)/bills.tsx'
];

filesToDelete.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted: ${file}`);
    } catch (e) {
      console.error(`❌ Failed to delete ${file}:`, e.message);
    }
  } else {
    console.log(`ℹ️ Already deleted or not found: ${file}`);
  }
});

console.log('\nCleanup complete! You can now delete this script.');
