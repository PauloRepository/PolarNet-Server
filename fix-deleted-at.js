#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Función para reemplazar deleted_at en un archivo
function removeDeletedAtFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Patrones a reemplazar
    const patterns = [
      { search: / AND \w+\.deleted_at IS NULL/g, replace: '' },
      { search: / AND deleted_at IS NULL/g, replace: '' },
      { search: /WHERE \w+\.deleted_at IS NULL AND /g, replace: 'WHERE ' },
      { search: /WHERE deleted_at IS NULL AND /g, replace: 'WHERE ' },
      { search: /WHERE \w+\.deleted_at IS NULL/g, replace: '' },
      { search: /WHERE deleted_at IS NULL/g, replace: '' },
      { search: /\['?\w*\.?deleted_at IS NULL'?\]/g, replace: "['1=1']" },
      { search: /'?\w*\.?deleted_at IS NULL'?,?\s*/g, replace: '' }
    ];

    patterns.forEach(pattern => {
      const originalContent = content;
      content = content.replace(pattern.search, pattern.replace);
      if (originalContent !== content) {
        modified = true;
      }
    });

    // Limpiar WHERE vacíos
    content = content.replace(/WHERE\s*$/gm, '');
    content = content.replace(/WHERE\s*\n/g, '\n');
    content = content.replace(/WHERE\s*;/g, ';');
    content = content.replace(/WHERE\s*\)/g, ')');

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Función para procesar todos los archivos en un directorio
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  let totalFixed = 0;

  files.forEach(file => {
    const fullPath = path.join(dirPath, file.name);
    
    if (file.isDirectory()) {
      totalFixed += processDirectory(fullPath);
    } else if (file.name.endsWith('.js')) {
      if (removeDeletedAtFromFile(fullPath)) {
        totalFixed++;
      }
    }
  });

  return totalFixed;
}

// Procesar el directorio de repositorios
const persistenceDir = path.join(__dirname, 'src', 'infrastructure', 'persistence');

console.log('🔧 Removing deleted_at references from repository files...');
console.log(`📁 Processing directory: ${persistenceDir}`);

if (!fs.existsSync(persistenceDir)) {
  console.error(`❌ Directory not found: ${persistenceDir}`);
  process.exit(1);
}

const fixedFiles = processDirectory(persistenceDir);

console.log(`\n🎉 Completed! Fixed ${fixedFiles} files.`);
console.log('📝 You may need to review the changes and fix any syntax issues manually.');
