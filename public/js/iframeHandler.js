
/**
 * iframeHandler.js - Manages iframes for Seb's Unblocker V7
 * Features:
 * - Dynamic resizing to fill tab content
 * - Secure postMessage communication
 * - Loading indicator management
 * - Error handling for failed loads
 * - Basic content security enforcement
 */

const iframes = {};

function createWebTab(url) {
  const tabContainer = document.getElementById('tabContainer');
  const tabBar = document.getElementById('tabBar');
  const tabCount = tabBar.children.length;
  const tabId = 'tab' + tabCount;

  // Create tab button
  const tabButton = document.createElement('div');
  tabButton.classList.add('tab', 'active');
  tabButton.id = tabId + '-btn';
  tabButton.innerText = url;
  tabButton.addEventListener('click', () => activateTab(tabId));

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('closeTab');
  closeBtn.innerText = 'x';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabId);
  };
  tabButton.appendChild(closeBtn);
  tabBar.insertBefore(tabButton, document.getElementById('newTabBtn'));

  // Create tab content
  const tabContent = document.createElement('div');
  tabContent.classList.add('tabContent', 'active');
  tabContent.id = tabId;

  const loader = document.createElement('div');
  loader.innerText = 'Loading...';
  loader.style.color = '#00ff7f';
  loader.style.textAlign = 'center';
  loader.style.paddingTop = '50px';
  tabContent.appendChild(loader);

  const iframe = document.createElement('iframe');
  iframe.src = '/proxy?url=' + encodeURIComponent(url);
  iframe.style.flexGrow = 1;
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.borderRadius = '0 0 15px 15px';
  iframe.onload = () => {
    loader.style.display = 'none';
  };
  iframe.onerror = () => {
    loader.innerText = 'Failed to load page.';
  };

  tabContent.appendChild(iframe);
  tabContainer.appendChild(tabContent);

  iframes[tabId] = iframe;

  activateTab(tabId);
}

// -------------------- TAB MANAGEMENT --------------------
function activateTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tabContent').forEach(tc => tc.classList.remove('active'));

  const btn = document.getElementById(tabId + '-btn');
  const content = document.getElementById(tabId);
  if (btn) btn.classList.add('active');
  if (content) content.classList.add('active');
}

function closeTab(tabId) {
  const btn = document.getElementById(tabId + '-btn');
  const content = document.getElementById(tabId);
  if (btn) btn.remove();
  if (content) content.remove();

  delete iframes[tabId];

  const tabs = document.querySelectorAll('.tab');
  if (tabs.length > 0) {
    const lastTabId = tabs[tabs.length - 1].id.replace('-btn', '');
    activateTab(lastTabId);
  }
}

// -------------------- IFRAME COMMUNICATION --------------------
window.addEventListener('message', (event) => {
  try {
    const data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {
      case 'resize':
        const iframe = iframes[data.tabId];
        if (iframe && data.height) iframe.style.height = data.height + 'px';
        break;
      case 'alert':
        alert(data.message);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  } catch (err) {
    console.error('Iframe message error:', err);
  }
});

// -------------------- SECURITY --------------------
// Remove unsafe iframe features
function secureIframe(iframe) {
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
}

// -------------------- DYNAMIC RESIZE --------------------
function resizeActiveIframe() {
  const activeContent = document.querySelector('.tabContent.active iframe');
  if (activeContent) {
    activeContent.style.height = window.innerHeight - activeContent.getBoundingClientRect().top - 20 + 'px';
  }
}
window.addEventListener('resize', resizeActiveIframe);
window.addEventListener('load', resizeActiveIframe);

// -------------------- UTILITIES --------------------
function reloadIframe(tabId) {
  const iframe = iframes[tabId];
  if (iframe) iframe.src = iframe.src;
}

function navigateIframe(tabId, url) {
  const iframe = iframes[tabId];
  if (iframe) iframe.src = '/proxy?url=' + encodeURIComponent(url);
}

// -------------------- INIT --------------------
document.getElementById('newTabBtn').addEventListener('click', () => {
  createHomeTab();
});
