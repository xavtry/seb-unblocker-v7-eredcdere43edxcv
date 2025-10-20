
const fs = require('fs');
const path = require('path');

module.exports.init = () => {
  const folders = ['logs', 'proxy', 'public/css', 'public/js', 'public/images', 'public/fonts', 'views'];
  folders.forEach(f => {
    if (!fs.existsSync(f)) fs.mkdirSync(f, { recursive: true });
  });
  const logFile = path.join('logs', 'proxy.log');
  if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, '', 'utf8');
  console.log('Setup complete: folders and logs initialized.');
};
