#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Pre-build check starting...');

// Check if src directory exists
const srcPath = path.join(__dirname, 'src');
if (!fs.existsSync(srcPath)) {
  console.error('❌ Error: src/ directory not found!');
  console.error('   Expected path:', srcPath);
  console.error('   Current directory:', __dirname);
  console.error('   Available files:', fs.readdirSync(__dirname));
  process.exit(1);
}

// Check if src/index.js exists
const indexPath = path.join(srcPath, 'index.js');
if (!fs.existsSync(indexPath)) {
  console.error('❌ Error: src/index.js not found!');
  console.error('   Expected path:', indexPath);
  console.error('   Available files in src:', fs.readdirSync(srcPath));
  process.exit(1);
}

// Check if src/styles.css exists
const stylesPath = path.join(srcPath, 'styles.css');
if (!fs.existsSync(stylesPath)) {
  console.error('❌ Error: src/styles.css not found!');
  console.error('   Expected path:', stylesPath);
  process.exit(1);
}

console.log('✅ Pre-build check passed!');
console.log('   src/ directory: ✓');
console.log('   src/index.js: ✓');
console.log('   src/styles.css: ✓');
console.log('🚀 Proceeding with build...'); 