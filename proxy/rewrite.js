/**
 * rewrite.js
 *
 * Full HTML/CSS/JS rewriting engine.
 * - Uses cheerio to parse HTML safely and perform fine-grained rewrites
 * - Rewrites: href, src, srcset, data-src, form action, iframe src, link href
 * - Rewrites inline <style> blocks and style attributes (url(...))
 * - Rewrites srcset and picture/source tags
 * - Removes or neutralizes <base> tags that break relative resolution
 * - Injects a small navigation shim script so window.open / top navigation go through proxy
 *
 * Exports:
 *   - rewriteHtml(html, baseUrl, opts)
 *
 * Dependencies: cheerio
 */

const cheerio = require('cheerio');
const { URL } = require('url');
const { rewriteCssUrls } = require('./cssParser'); // we expect cssParser module exists

const DEFAULT_OPTS = {
  resourceRoute: '/resource?url=',
  proxyRoute: '/proxy?url='
};

function absify(urlOrPath, base) {
  try {
    return new URL(urlOrPath, base).href;
  } catch (e) {
    return null;
  }
}

function shouldIgnoreUrl(href) {
  if (!href) return true;
  const trimmed = href.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return true;
  if (/^\s*javascript:/i.test(trimmed)) return true;
  if (/^\s*mailto:/i.test(trimmed)) return true;
  return false;
}

function proxifyUrl(absUrl, isAsset, opts) {
  if (!absUrl) return absUrl;
  const route = isAsset ? opts.resourceRoute : opts.proxyRoute;
  return route + encodeURIComponent(absUrl);
}

/**
 * Main rewrite function
 * @param {string} html Raw HTML text
 * @param {string} baseUrl Base URL to resolve relative references
 * @param {object} opts Optional overrides: resourceRoute, proxyRoute
 */
function rewriteHtml(html, baseUrl, opts = {}) {
  opts = Object.assign({}, DEFAULT_OPTS, opts);
  const $ = cheerio.load(html, { decodeEntities: false });

  // Remove <base> tags - they break relative URL behavior
  $('base').remove();

  // Rewrite <a href>
  $('a[href]').each((i, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (shouldIgnoreUrl(href)) return;
    const abs = absify(href, baseUrl);
    if (!abs) return;
    $el.attr('href', proxifyUrl(abs, false, opts));
    // ensure links open in same tab (so proxy handles navigation)
    if ($el.attr('target') === '_blank') {
      // keep _blank if user wants external open; but allow proxying via new tab if desired
    }
  });

  // Rewrite <link href> (styles, preloads)
  $('link[href]').each((i, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (!href) return;
    const abs = absify(href, baseUrl);
    if (!abs) return;
    // if it's a stylesheet or icon, route through resource
    $el.attr('href', proxifyUrl(abs, true, opts));
  });

  // Rewrite <script src>
  $('script[src]').each((i, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    if (!src) return;
    const abs = absify(src, baseUrl);
    if (!abs) return;
    $el.attr('src', proxifyUrl(abs, true, opts));
    // remove integrity/crossorigin to avoid blocking
    $el.removeAttr('integrity');
    $el.removeAttr('crossorigin');
  });

  // Rewrite <img src>, data-src, srcset
  $('img').each((i, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    const dataSrc = $el.attr('data-src') || $el.attr('data-lazy') || $el.attr('data-original');
    if (src) {
      const abs = absify(src, baseUrl);
      if (abs) $el.attr('src', proxifyUrl(abs, true, opts));
    }
    if (dataSrc) {
      const abs2 = absify(dataSrc, baseUrl);
      if (abs2) $el.attr('data-src', proxifyUrl(abs2, true, opts));
    }
    const srcset = $el.attr('srcset');
    if (srcset) {
      // parse srcset entries
      const parts = srcset.split(',').map(p => p.trim()).map(p => {
        const [u, desc] = p.split(/\s+/, 2);
        const abs = absify(u, baseUrl);
        if (!abs) return p;
        return proxifyUrl(abs, true, opts) + (desc ? ' ' + desc : '');
      });
      $el.attr('srcset', parts.join(', '));
    }
  });

  // Picture/source tags
  $('source[srcset], source[src]').each((i, el) => {
    const $el = $(el);
    if ($el.attr('src')) {
      const abs = absify($el.attr('src'), baseUrl);
      if (abs) $el.attr('src', proxifyUrl(abs, true, opts));
    }
    if ($el.attr('srcset')) {
      const parts = $el.attr('srcset').split(',').map(p => p.trim()).map(p => {
        const [u, desc] = p.split(/\s+/, 2);
        const abs = absify(u, baseUrl);
        if (!abs) return p;
        return proxifyUrl(abs, true, opts) + (desc ? ' ' + desc : '');
      });
      $el.attr('srcset', parts.join(', '));
    }
  });

  // Rewrite iframes
  $('iframe[src]').each((i, el) => {
    const $el = $(el);
    const src = $el.attr('src');
    if (!src) return;
    const abs = absify(src, baseUrl);
    if (!abs) return;
    $el.attr('src', proxifyUrl(abs, false, opts)); // use /proxy so iframe content also rewritten
    // keep sandbox minimal - avoid sandbox attribute by default for compatibility
  });

  // Rewrite forms (action)
  $('form[action]').each((i, el) => {
    const $el = $(el);
    const action = $el.attr('action');
    if (!action) return;
    const abs = absify(action, baseUrl);
    if (!abs) return;
    $el.attr('action', proxifyUrl(abs, false, opts));
    // convert method GET/POST unchanged
    // Optionally inject hidden _method to preserve some behaviors
  });

  // Rewrite inline <style> blocks
  $('style').each((i, el) => {
    const css = $(el).html() || '';
    const rewritten = rewriteCssUrls(css, baseUrl);
    $(el).html(rewritten);
  });

  // Rewrite style attributes with url(...)
  $('[style]').each((i, el) => {
    const style = $(el).attr('style') || '';
    const newStyle = style.replace(/url\(([^)]+)\)/g, (m, p1) => {
      const raw = p1.replace(/['"]/g, '').trim();
      const abs = absify(raw, baseUrl);
      if (!abs) return m;
      return `url("${proxifyUrl(abs, true, opts)}")`;
    });
    $(el).attr('style', newStyle);
  });

  // Inject a small script at the end of body to intercept navigation & window.open
  const navShim = `
    <script>
      (function(){
        // override window.open to load via proxy (top-level)
        const origOpen = window.open;
        window.open = function(href, name, specs) {
          try {
            const url = new URL(href, location.href).href;
            location.href = '${opts.proxyRoute}' + encodeURIComponent(url);
            return null;
          } catch (e) {
            return origOpen.apply(this, arguments);
          }
        };
        // intercept "a" link clicks to route via proxy
        document.addEventListener('click', function(ev){
          try {
            let el = ev.target;
            while (el && el.tagName !== 'A') el = el.parentElement;
            if (!el) return;
            const href = el.getAttribute('href');
            if (!href) return;
            if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
            ev.preventDefault();
            const url = new URL(href, location.href).href;
            location.href = '${opts.proxyRoute}' + encodeURIComponent(url);
          } catch(e){}
        }, true);
      })();
    </script>
  `;
  $('body').append(navShim);

  return $.html();
}

module.exports = { rewriteHtml };
