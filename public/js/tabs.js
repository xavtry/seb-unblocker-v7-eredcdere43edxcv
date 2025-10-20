
/**
 * tabs.js - Handles tab system for Seb's Unblocker V7
 * Features:
 * - Create, activate, close tabs
 * - Navigate URLs through proxy
 * - Dynamic iframe management
 * - Keyboard shortcuts & tab reordering
 * - Tab state saving & restoration
 */

let tabCount = 0;
const tabBar = document.getElementById('tabBar');
const tabContainer = document.getElementById('tabContainer');

// Store tab data
const tabsData = {};

// Load previous session if available
if (localStorage.getItem('sebTabs')) {
  const savedTabs = JSON.parse(localStorage.getItem('sebTabs'));
  savedTabs.forEach(tab => createWebTab(tab.url, tab.title));
} else {
  createHomeTab();
}

// -------------------- TAB CREATION --------------------
function createHomeTab() {
  tabCount++;
  const tabId = 'tab' + tabCount;

  const tabButton = document.createElement('div');
  tabButton.classList.add('tab', 'active');
  tabButton.id = tabId + '-btn';
  tabButton.innerText = 'Home';
  tabButton.addEventListener('click', () => activateTab(tabId));

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('closeTab');
  closeBtn.innerText = 'x';
  closeBtn.onclick = (e) => { e.stopPropagation(); closeTab(tabId); }
  tabButton.appendChild(closeBtn);

  tabBar.insertBefore(tabButton, document.getElementById('newTabBtn'));

  const tabContent = document.createElement('div');
  tabContent.classList.add('tabContent', 'active');
  tabContent.id = tabId;
  tabContent.innerHTML = `
    <h1 class="glow-text" style="text-align:center; margin-top:20px;">Seb's Unblocker<sup>V7</sup></h1>
    <div class="search-container">
      <input type="text" placeholder="Enter website URL..." class="urlInput">
      <button class="goBtn">Go</button>
    </div>
  `;
  tabContainer.appendChild(tabContent);

  const goBtn = tabContent.querySelector('.goBtn');
  const urlInput = tabContent.querySelector('.urlInput');

  goBtn.addEventListener('click', () => {
    let url = urlInput.value.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    createWebTab(url);
  });

  urlInput.addEventListener('keypress', e => { if (e.key === 'Enter') goBtn.click(); });

  tabsData[tabId] = { type: 'home', title: 'Home', url: null };
  saveTabs();
  activateTab(tabId);
}

function createWebTab(url, customTitle = null) {
  tabCount++;
  const tabId = 'tab' + tabCount;

  const tabButton = document.createElement('div');
  tabButton.classList.add('tab', 'active');
  tabButton.id = tabId + '-btn';
  tabButton.innerText = customTitle || url;
  tabButton.addEventListener('click', () => activateTab(tabId));

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('closeTab');
  closeBtn.innerText = 'x';
  closeBtn.onclick = (e) => { e.stopPropagation(); closeTab(tabId); }
  tabButton.appendChild(closeBtn);

  tabBar.insertBefore(tabButton, document.getElementById('newTabBtn'));

  const tabContent = document.createElement('div');
  tabContent.classList.add('tabContent', 'active');
  tabContent.id = tabId;

  tabContent.innerHTML = `<iframe src="/proxy?url=${encodeURIComponent(url)}"></iframe>`;

  tabContainer.appendChild(tabContent);

  tabsData[tabId] = { type: 'web', title: customTitle || url, url };
  saveTabs();
  activateTab(tabId);
}

// -------------------- TAB MANAGEMENT --------------------
function activateTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tabContent').forEach(tc => tc.classList.remove('active'));
  const btn = document.getElementById(tabId + '-btn');
  const content = document.getElementById(tabId);
  if (btn && content) {
    btn.classList.add('active');
    content.classList.add('active');
  }
}

function closeTab(tabId) {
  const btn = document.getElementById(tabId + '-btn');
  const content = document.getElementById(tabId);
  if (btn) btn.remove();
  if (content) content.remove();
  delete tabsData[tabId];
  saveTabs();

  const tabs = document.querySelectorAll('.tab');
  if (tabs.length > 0) {
    const lastTabId = tabs[tabs.length - 1].id.replace('-btn', '');
    activateTab(lastTabId);
  }
}

// -------------------- TAB STATE --------------------
function saveTabs() {
  const savedTabs = [];
  for (const id in tabsData) {
    const tab = tabsData[id];
    if (tab.type === 'web') savedTabs.push({ title: tab.title, url: tab.url });
  }
  localStorage.setItem('sebTabs', JSON.stringify(savedTabs));
}

// -------------------- KEYBOARD SHORTCUTS --------------------
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 't') { // Ctrl+T new tab
    createHomeTab();
  }
  if (e.ctrlKey && e.key === 'w') { // Ctrl+W close tab
    const active = document.querySelector('.tab.active');
    if (active) closeTab(active.id.replace('-btn', ''));
  }
});

// -------------------- DRAG & DROP --------------------
let draggedTab = null;
tabBar.addEventListener('dragstart', e => {
  if (e.target.classList.contains('tab')) draggedTab = e.target;
});
tabBar.addEventListener('dragover', e => e.preventDefault());
tabBar.addEventListener('drop', e => {
  if (draggedTab && e.target.classList.contains('tab') && draggedTab !== e.target) {
    tabBar.insertBefore(draggedTab, e.target.nextSibling);
    draggedTab = null;
  }
});

// -------------------- DEBUGGING --------------------
console.log('Tab system loaded. Current tabsData:', tabsData);

// -------------------- EXTRA FEATURES --------------------
// Can add iframe resizing, message passing, tab grouping, etc.
