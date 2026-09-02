/* global navigate, tabs, tld */

// ====== HELPERS ======
function safeNavigate(href, index) {
  try {
    if (!href) return;
    navigate(index, { href });
    console.log('[NimSeek] Navigated:', href);
  } catch (err) {
    console.error('[NimSeek] Navigation Error:', err, href);
  }
}

function handleSearchFallback(query) {
  chrome.storage.local.get(
    { 'search-engine': 'https://www.google.com/search?q=%s' },
    prefs => {
      const engine = prefs['search-engine'];
      if (engine) {
        const searchUrl = engine.replace('%s', encodeURIComponent(query));
        safeNavigate(searchUrl);
      } else {
        let href = query;
        if (!href.toLowerCase().startsWith('http')) {
          href = 'https://' + href;
        }
        safeNavigate(href);
      }
    }
  );
}

// ====== FOOTER FORM ======
document.querySelector('.footer').onsubmit = e => {
  e.preventDefault();
  let href = document.getElementById('address').value.trim();

  try {
    // Direct URL
    new URL(href);
    safeNavigate(href);
  } catch {
    // Domain Check
    const domain = tld.getDomain(href);
    if (domain) {
      return safeNavigate('https://' + href);
    }
    // Search Fallback
    handleSearchFallback(href);
  }
};

// ====== INITIAL MESSAGE SYNC ======
chrome.runtime.sendMessage({ method: 'get-href' }, res => {
  if (res?.href) {
    safeNavigate(res.href);
  }
});

// ====== MESSAGE HANDLER ======
chrome.runtime.onMessage.addListener((request, sender, response) => {
  switch (request.method) {
    case 'send-href':
      safeNavigate(request.href);
      response(true);
      break;

    case 'reset-tabs':
      resetTabs();
      response(true);
      break;

    default:
      console.warn('[NimSeek] Unhandled message:', request.method);
      response(false);
  }
});

// ====== PAGE LOAD HOOK ======
addEventListener('load', () => {
  chrome.storage.local.get(
    {
      visits: [],
      'start-page': '',
      'open-last-visited': true
    },
    prefs => {
      if (prefs['start-page']) {
        prefs['start-page']
          .split(/\s*,\s*/)
          .slice(0, 2)
          .forEach((href, index) => safeNavigate(href, index + 1));
      } else if (prefs['open-last-visited']) {
        const lastVisit = prefs.visits.at(0);
        if (lastVisit) safeNavigate(lastVisit);
      }
    }
  );
});

// ====== PAGE UNLOAD HOOK ======
// ====== PAGE UNLOAD HOOK ======
const sendClosedMessage = () =>
  chrome.runtime.sendMessage({ method: 'closed' });

addEventListener('unload', sendClosedMessage);
addEventListener('beforeunload', sendClosedMessage); // <--- এগুলি মুছে ফেলুন/কমেন্ট আউট করুন

// ====== RESET TABS ======
function resetTabs() {
  for (let i = 1; i < 5; i++) {
    try {
      navigate.terminate(i);
      tabs.remove(i); // <-- এটি iframe-এর src অ্যাট্রিবিউট সরিয়ে দেয়
    } catch (err) {
      console.warn('[NimSeek] Reset Error (tab:', i, ')', err);
    }
  }
  tabs.update(1, { state: 'homepage' });
  console.log('[NimSeek] All tabs reset');
}

document.getElementById('reset').onclick = resetTabs;


// Quick Links click handler
document.addEventListener('click', e => {
  if (e.target.matches('#quick-links button')) {
    const href = e.target.dataset.href;
    if (href) {
      navigate(undefined, { href });
    }
  }
});



