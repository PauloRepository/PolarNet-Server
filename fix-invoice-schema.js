const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/infrastructure/persistence/PostgreSQLInvoiceRepository.js');

console.log('🔧 Fixing invoice_date -> issue_date in PostgreSQLInvoiceRepository.js');

try {
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Count occurrences before replacement
  const beforeCount = (content.match(/invoice_date/g) || []).length;
  console.log(`📊 Found ${beforeCount} occurrences of 'invoice_date'`);
  
  // Replace all occurrences of invoice_date with issue_date
  content = content.replace(/invoice_date/g, 'issue_date');
  
  // Count occurrences after replacement
  const afterCount = (content.match(/invoice_date/g) || []).length;
  console.log(`🔄 Replaced ${beforeCount - afterCount} occurrences`);
  
  // Write the file back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ Successfully updated PostgreSQLInvoiceRepository.js');
  console.log('📋 All invoice_date references changed to issue_date');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
