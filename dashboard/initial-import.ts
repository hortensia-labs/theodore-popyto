import { syncSection } from './lib/actions/import';

async function initialImport() {
  console.log('Starting initial import for section: 3-fundamentos-1');
  
  const result = await syncSection('3-fundamentos-1');
  
  if (result.success && result.data) {
    console.log('✓ Import completed successfully!');
    console.log(`  - URLs imported: ${result.data.urlsImported}`);
    console.log(`  - URLs updated: ${result.data.urlsUpdated}`);
    console.log(`  - URLs skipped: ${result.data.urlsSkipped}`);
  } else {
    console.error('✗ Import failed:', result.error);
    process.exit(1);
  }
  
  process.exit(0);
}

initialImport();

