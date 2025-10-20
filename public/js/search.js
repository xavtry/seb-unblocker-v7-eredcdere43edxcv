/**
 * search.js - Handles search functionality for Seb's Unblocker V7
 * Features:
 * - Fetch top 10 search results from /search
 * - Display clickable results
 * - Keyboard navigation (arrows + enter)
 * - Caching recent searches
 * - Highlight search terms
 */

const searchForm = document.createElement('form');
searchForm.id = 'searchForm';
searchForm.style.display = 'flex';
searchForm.style.justifyContent = 'center';
searchForm.style.margin = '20px';

const searchInput = document.createElement('input');
searchInput.type = 'text';
searchInput.id = 'query';
searchInput.placeholder = 'Search the web';
searchInput.style.width = '60%';
searchInput.style.padding = '10px 15px';
searchInput.style.borderRadius = '15px 0 0 15px';
searchInput.style.border = '2px solid #00ff7f';
searchInput.style.background = 'rgba(0,255,127,0.05)';
searchInput.style.color = '#00ff7f';
searchInput.style.fontSize = '1rem';
searchForm.appendChild(searchInput);

const searchBtn = document.createElement('button');
searchBtn.type = 'submit';
searchBtn.innerText = 'Search';
searchBtn.style.padding = '10px 20px';
searchBtn.style.borderRadius = '0 15px 15px 0';
searchBtn.style.border = 'none';
searchBtn.style.background = '#00ff7f';
searchBtn.style.color = '#010a0a';
searchBtn.style.cursor = 'pointer';
searchBtn.style.fontWeight = 'bold';
searchForm.appendChild(searchBtn);

const resultsContainer = document.createElement('div');
resultsContainer.id = 'results';
resultsContainer.style.width = '80%';
resultsContainer.style.margin = '0 auto';
resultsContainer.style.marginTop = '20px';
resultsContainer.style.display = 'flex';
resultsContainer.style.flexDirection = 'column';
resultsContainer.style.gap = '10px';

document.body.appendChild(searchForm);
document.body.appendChild(resultsContainer);

let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
let activeResultIndex = -1;

function renderResults(results) {
  resultsContainer.innerHTML = '';
  results.forEach((r, index) => {
    const div = document.createElement('div');
    div.classList.add('search-result');
    div.style.padding = '10px';
    div.style.border = '1px solid #00ff7f';
    div.style.borderRadius = '10px';
    div.style.cursor = 'pointer';
    div.style.background = 'rgba(0,255,127,0.05)';
    div.innerHTML = `<strong>${r.title}</strong><br><span style="color:#00ff7f">${r.description}</span><br><a href="${r.url}" target="_blank">${r.url}</a>`;
    div.addEventListener('click', () => {
      createWebTab(r.url);
    });
    resultsContainer.appendChild(div);
  });
}

// -------------------- HANDLE FORM SUBMIT --------------------
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;

  recentSearches.unshift(query);
  if (recentSearches.length > 10) recentSearches.pop();
  localStorage.setItem('recentSearches', JSON.stringify(recentSearches));

  resultsContainer.innerHTML = '<p style="color:#00ff7f; text-align:center;">Loading...</p>';

  try {
    const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
    const results = await res.json();
    renderResults(results);
  } catch (err) {
    resultsContainer.innerHTML = `<p style="color:red;">Search failed: ${err.message}</p>`;
  }
});

// -------------------- KEYBOARD NAVIGATION --------------------
document.addEventListener('keydown', (e) => {
  const resultDivs = Array.from(document.querySelectorAll('.search-result'));
  if (!resultDivs.length) return;

  if (e.key === 'ArrowDown') {
    activeResultIndex = (activeResultIndex + 1) % resultDivs.length;
    highlightResult(resultDivs);
  }
  if (e.key === 'ArrowUp') {
    activeResultIndex = (activeResultIndex - 1 + resultDivs.length) % resultDivs.length;
    highlightResult(resultDivs);
  }
  if (e.key === 'Enter' && activeResultIndex >= 0) {
    resultDivs[activeResultIndex].click();
  }
});

function highlightResult(divs) {
  divs.forEach((d, i) => {
    if (i === activeResultIndex) {
      d.style.background = '#00ff7f';
      d.style.color = '#010a0a';
    } else {
      d.style.background = 'rgba(0,255,127,0.05)';
      d.style.color = '#00ff7f';
    }
  });
}

// -------------------- RECENT SEARCHES --------------------
function renderRecentSearches() {
  const recentDiv = document.createElement('div');
  recentDiv.style.marginTop = '20px';
  recentDiv.style.display = 'flex';
  recentDiv.style.flexDirection = 'column';
  recentDiv.style.gap = '5px';

  const title = document.createElement('strong');
  title.innerText = 'Recent Searches:';
  recentDiv.appendChild(title);

  recentSearches.forEach(term => {
    const tDiv = document.createElement('div');
    tDiv.innerText = term;
    tDiv.style.cursor = 'pointer';
    tDiv.style.color = '#00ff7f';
    tDiv.addEventListener('click', () => {
      searchInput.value = term;
      searchForm.dispatchEvent(new Event('submit'));
    });
    recentDiv.appendChild(tDiv);
  });

  resultsContainer.appendChild(recentDiv);
}

renderRecentSearches();

