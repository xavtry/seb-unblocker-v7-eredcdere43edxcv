
/**
 * errorPage.js
 *
 * Generates an HTML error page for proxy failures
 * Features:
 *  - safe escaping of user-provided URL
 *  - shows status code and reason
 *  - includes "Go back" and retry links
 *  - minimal, responsive design
 */

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function (m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

function generateErrorPage(opts = {}) {
  const url = escapeHtml(opts.url || '');
  const status = opts.status || 'Unknown';
  const message = escapeHtml(opts.message || 'An error occurred while loading the page.');
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proxy Error</title>
<style>
body { font-family: Arial, sans-serif; background: #010a0a; color: #00ff7f; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;}
.container { text-align:center; max-width:500px; }
h1 { font-size:2rem; margin-bottom:0.5em; }
p { margin-bottom:1em; }
a { color:#00ff7f; text-decoration:none; border:1px solid #00ff7f; padding:5px 10px; border-radius:5px; transition:0.3s;}
a:hover { background:#00ff7f; color:#010a0a;}
</style>
</head>
<body>
<div class="container">
  <h1>Proxy Error</h1>
  <p>Status: ${status}</p>
  <p>${message}</p>
  <p>URL: <code>${url}</code></p>
  <p>
    <a href="javascript:history.back()">Go Back</a>
    <a href="${url}">Retry</a>
  </p>
</div>
</body>
</html>
  `;
}

module.exports = { generateErrorPage };
