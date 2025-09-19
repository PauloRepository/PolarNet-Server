#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'infrastructure', 'persistence', 'PostgreSQLInvoiceRepository.js');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Reemplazar todas las ocurrencias de invoice_date con issue_date
  const originalContent = content;
  content = content.replace(/invoice_date/g, 'issue_date');
  
  if (originalContent !== content) {
    fs.writeFileSync(filePath, content);
    console.log('✅ Replaced all invoice_date with issue_date in PostgreSQLInvoiceRepository.js');
  } else {
    console.log('ℹ️  No invoice_date references found to replace');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
