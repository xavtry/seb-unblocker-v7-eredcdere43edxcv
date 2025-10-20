const { URL } = require('url');

class Rewriter {
  rewriteHTML(html, baseUrl) {
    // Rewrite href/src
    return html.replace(/(href|src)=["']([^"']+)["']/g, (match, attr, link) => {
      try {
        const absolute = new URL(link, baseUrl).href;
        return `${attr}="/proxy?url=${encodeURIComponent(absolute)}"`;
      } catch {
        return match;
      }
    });
  }

  rewriteCSS(css, baseUrl) {
    return css.replace(/url\(["']?([^"')]+)["']?\)/g, (match, url) => {
      try {
        const absolute = new URL(url, baseUrl).href;
        return `url("/proxy?url=${encodeURIComponent(absolute)}")`;
      } catch {
        return match;
      }
    });
  }

  rewriteJS(js, baseUrl) {
    // Simple JS rewriting (fetch/axios URLs)
    return js.replace(/(['"`])((https?:)?\/\/[^'"`]+)\1/g, (match, quote, url) => {
      try {
        const absolute = new URL(url, baseUrl).href;
        return `${quote}/proxy?url=${encodeURIComponent(absolute)}${quote}`;
      } catch {
        return match;
      }
    });
  }
}

module.exports = new Rewriter();
