/**
 * seb-unblocker-v7 - Setup Script
 * Creates necessary folders, log files, default configs, and ensures environment readiness
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const folders = [
  'logs',
  'public',
  'public/css',
  'public/js',
  'public/images',
  'public/fonts',
  'views',
  'proxy'
];

const files = [
  { path: 'logs/proxy.log', default: '' },
  { path: 'views/error.html', default: '<h1>Proxy Error</h1><p>Something went wrong.</p>' },
  { path: 'public/css/styles.css', default: '/* Styles go here */' },
  { path: 'public/css/waves.css', default: '/* Waves animation */' },
  { path: 'public/js/tabs.js', default: '// Tab logic' },
  { path: 'public/js/search.js', default: '// Search logic' },
  { path: 'public/js/iframeHandler.js', default: '// Iframe enhancements' }
];

async function createFolders() {
  for (const folder of folders) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      console.log(`Created folder: ${folder}`);
    }
  }
}

async function createFiles() {
  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      fs.writeFileSync(file.path, file.default);
      console.log(`Created file: ${file.path}`);
    }
  }
}

async function checkNodeModules() {
  if (!fs.existsSync('node_modules')) {
    console.log('node_modules not found. Running npm install...');
    const { execSync } = require('child_process');
    execSync('npm install', { stdio: 'inherit' });
  }
}

async function init() {
  console.log('Initializing Seb-Unblocker V7 setup...');
  await createFolders();
  await createFiles();
  await checkNodeModules();
  console.log('Setup complete! Your proxy environment is ready.');
}

async function promptUser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Do you want to run setup now? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      await init();
    } else {
      console.log('Setup skipped. Make sure to run it later.');
    }
    rl.close();
  });
}

// Automatically run if this script is executed directly
if (require.main === module) {
  promptUser();
}

module.exports = { init, createFolders, createFiles, checkNodeModules };
