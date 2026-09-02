// ===== CONFIGURATION =====
const CONFIG = {
  SIDEPANEL_ENABLED: true,
  CONTEXT_MENU_ID: 'nimseek-sideopen',
};
let lastProcessedSearch = { key: '', time: 0 };
// ===== STATE =====
let sidebarHref = '';
let lastTabHref = '';

// ===== LOG HELPERS =====
function logInfo(...args) { console.log('[NimSeek]', ...args); }
function logWarn(...args) { console.warn('[NimSeek Warning]', ...args); }
function logError(...args) { console.error('[NimSeek Error]', ...args); }

// ===== SIDE PANEL =====
async function openSidePanel(tab) {
  try {
    if (!tab?.windowId) throw new Error('Invalid tab for side panel');
    await chrome.sidePanel.open({ windowId: tab.windowId });
    logInfo('SidePanel opened for', tab.id);
  } catch (error) {
    logError('SidePanel Open Failed:', error);
  }
}

// ===== RUNTIME MESSAGING =====
function safeSendMessage(message) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        logWarn('Runtime Message Error:', chrome.runtime.lastError.message);
      } else {
        logInfo('Message sent:', message, 'Response:', response);
      }
    });
  } catch (error) {
    logError('Safe Message Error:', error);
  }
}

// ===== PANEL BEHAVIOR =====
if (CONFIG.SIDEPANEL_ENABLED && chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(logWarn);
}

// ===== CONTEXT MENUS =====
async function setupContextMenus() {
  try {
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: CONFIG.CONTEXT_MENU_ID,
      title: 'NimSeek SideOpen',
      contexts: ['link', 'page'],
    });
    logInfo('Context menu created');
  } catch (error) {
    logError('Context Menu Setup Failed:', error);
  }
}
setupContextMenus();

// ===== CONTEXT MENU CLICK =====
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    sidebarHref = info.linkUrl || info.pageUrl || '';
    lastTabHref = sidebarHref;
    if (!sidebarHref) throw new Error('No valid URL found to open');
    safeSendMessage({ method: 'send-href', href: sidebarHref });
    await openSidePanel(tab);
  } catch (error) {
    logError('ContextMenu Click Failed:', error);
  }
});

// ===== MESSAGE HANDLER =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    const { method } = request;
    switch (method) {
      case 'get-href':
        sendResponse({ href: sidebarHref });
        sidebarHref = '';
        return true;

      case 'send-href':
        if (typeof request.href === 'string') {
          sidebarHref = request.href;
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Invalid href' });
        }
        return true;

      case 'get-latest-tab-href':
        sendResponse({ href: lastTabHref });
        return true;

      case 'is-popup': {
        const isPopup = sender?.tab?.url?.includes(chrome.runtime.id) || !sender.documentId;
        sendResponse({ permit: isPopup });
        return true;
      }

      case 'open-side-panel':
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0) {
            openSidePanel(tabs[0]);
            sendResponse({ success: true, message: 'Side panel open request initiated' });
          } else {
            logError('Could not find active tab to open side panel.');
            sendResponse({ success: false, error: 'No active tab found' });
          }
        });
        return true;

      default:
        logWarn('Unhandled Message Method:', method);
        return false;
    }
  } catch (error) {
    logError('Message Handler Error:', error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

// ===== ACTION ICON CLICK =====
chrome.action.onClicked.addListener(async (tab) => {
  try {
    let popupPage = 'popup.html';
    if (tab.url.includes('google.com')) popupPage = 'popup-google.html';
    else if (tab.url.includes('youtube.com')) popupPage = 'popup-youtube.html';
    if (chrome.action.openPopup) {
      chrome.action.openPopup().catch(async () => {
        await chrome.tabs.create({ url: chrome.runtime.getURL(popupPage) });
      });
    } else {
      await chrome.tabs.create({ url: chrome.runtime.getURL(popupPage) });
    }
  } catch (error) {
    logError('Action Icon Error:', error);
  }
});

// ===== INSTALL HOOK =====
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
  logInfo('Extension installed & context menu initialized');
});


function isValidSearch(query) {
    if (!query || query.trim() === "") return false;
    const term = query.trim();
    if (term.length > 200) return false;
    
    // ★ নতুন রুল: ৩০ অক্ষরের বেশি এবং কোনো স্পেস না থাকলে হিস্ট্রিতে সেভ হবে না
    if (term.length > 30 && !term.includes(' ')) return false;

    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
    if (urlPattern.test(term)) return false;
    if (term.includes('.') && !term.includes(' ')) return false;
    return true;
}

// ── Engine name map (must match script.js normalizeEngineName) ──
const ENGINE_NAME_MAP = {
    google:'Google', bing:'Bing', duckduckgo:'DuckDuckGo', yahoo:'Yahoo',
    yandex:'Yandex', ecosia:'Ecosia', qwant:'Qwant', brave:'Brave',
    startpage:'Startpage', presearch:'Presearch', kagi:'Kagi', aol:'AOL',
    youtube:'YouTube', rumble:'Rumble', dailymotion:'Dailymotion',
    tiktok:'TikTok', bilibili:'Bilibili', vimeo:'Vimeo', rutube:'Rutube',
    facebook:'Facebook', x:'X', threads:'Threads', reddit:'Reddit',
    pinterest:'Pinterest', twitch:'Twitch', github:'GitHub', sigma:'Sigma',
    chatgpt:'ChatGPT', copilot:'Copilot', grok:'Grok', perplexity:'Perplexity',
    you:'You.com', mistral:'Mistral', qwen:'Qwen', blackbox:'Blackbox',
    scira:'Scira', felo:'Felo', yep:'Yep', iask:'iAsk',
    wikipedia:'Wikipedia', archive:'Archive',
};
function normalizeEngineName(key) {
    if (!key) return 'Other';
    const k = key.trim().toLowerCase();
    return ENGINE_NAME_MAP[k] || (key.charAt(0).toUpperCase() + key.slice(1));
}
function detectEngineFromHost(host) {
    if (host.includes('google.'))         return 'Google';
    if (host.includes('bing.'))           return 'Bing';
    if (host.includes('duckduckgo.'))     return 'DuckDuckGo';
    if (host.includes('yahoo.'))          return 'Yahoo';
    if (host.includes('yandex.'))         return 'Yandex';
    if (host.includes('ecosia.'))         return 'Ecosia';
    if (host.includes('qwant.'))          return 'Qwant';
    if (host.includes('brave.'))          return 'Brave';
    if (host.includes('startpage.'))      return 'Startpage';
    if (host.includes('presearch.'))      return 'Presearch';
    if (host.includes('kagi.'))           return 'Kagi';
    if (host.includes('aol.'))            return 'AOL';
    if (host.includes('archive.org'))     return 'Archive';
    if (host.includes('youtube.com'))     return 'YouTube';
    if (host.includes('rumble.com'))      return 'Rumble';
    if (host.includes('dailymotion.com')) return 'Dailymotion';
    if (host.includes('tiktok.com'))      return 'TikTok';
    if (host.includes('bilibili.'))       return 'Bilibili';
    if (host.includes('vimeo.com'))       return 'Vimeo';
    if (host.includes('rutube.ru'))       return 'Rutube';
    if (host.includes('facebook.'))       return 'Facebook';
    if (host.includes('twitter.com') || host.includes('x.com')) return 'X';
    if (host.includes('threads.'))        return 'Threads';
    if (host.includes('reddit.com'))      return 'Reddit';
    if (host.includes('pinterest.'))      return 'Pinterest';
    if (host.includes('twitch.tv'))       return 'Twitch';
    if (host.includes('github.com'))      return 'GitHub';
    if (host.includes('sigmabrowser.'))   return 'Sigma';
    if (host.includes('chatgpt.com') || host.includes('chat.openai.')) return 'ChatGPT';
    if (host.includes('copilot.microsoft.')) return 'Copilot';
    if (host.includes('grok.com'))        return 'Grok';
    if (host.includes('perplexity.'))     return 'Perplexity';
    if (host.includes('you.com'))         return 'You.com';
    if (host.includes('mistral.'))        return 'Mistral';
    if (host.includes('qwen.'))           return 'Qwen';
    if (host.includes('blackbox.'))       return 'Blackbox';
    if (host.includes('scira.'))          return 'Scira';
    if (host.includes('felo.'))           return 'Felo';
    if (host.includes('yep.com'))         return 'Yep';
    if (host.includes('iask.'))           return 'iAsk';
    if (host.includes('wikipedia.org'))   return 'Wikipedia';
    return 'Other';
}

// ২. স্টোরেজে সেভ করার উন্নত ফাংশন — engine ও timestamp সহ
function saveToSharedHistory(query, engine) {
    if (!isValidSearch(query)) return;
    chrome.storage.local.get(['searchHistory'], (result) => {
        let searchHistory = result.searchHistory || [];
        const cleanQuery  = query.trim();
        const engineName  = normalizeEngineName(engine || 'Other');
        const now         = Date.now();
        const existingIndex = searchHistory.findIndex(
            item => item.query.toLowerCase() === cleanQuery.toLowerCase()
        );
        if (existingIndex >= 0) {
            const [item] = searchHistory.splice(existingIndex, 1);
            item.count     = (item.count || 1) + 1;
            item.engine    = engineName;
            item.timestamp = now;
            item.engines   = item.engines || {};
            item.engines[engineName] = (item.engines[engineName] || 0) + 1;
            searchHistory.unshift(item);
        } else {
            const engines = {};
            engines[engineName] = 1;
            searchHistory.unshift({
                query: cleanQuery, count: 1,
                engine: engineName, timestamp: now, engines,
            });
        }
        if (searchHistory.length > 196645745775) searchHistory.pop();
        chrome.storage.local.set({ searchHistory });
    });
}

// ৩. সব জনপ্রিয় সাইট থেকে সার্চ ট্র্যাকিং লজিক
chrome.history.onVisited.addListener((historyItem) => {
    try {
        const url    = new URL(historyItem.url);
        const host   = url.hostname.toLowerCase();
        const path   = url.pathname.toLowerCase();
        const params = url.searchParams;
        let searchTerm = '';

        // Extension-generated search — skip
        if (params.get('ns_ext') === '1') return;

        // ── Search Engines ─────────────────────────────────────────
        if (host.includes('google.') || host.includes('bing.')        ||
            host.includes('duckduckgo.') || host.includes('ecosia.')  ||
            host.includes('qwant.')  || host.includes('brave.')       ||
            host.includes('presearch.')||
            host.includes('kagi.')   || host.includes('facebook.')    ||
            host.includes('pinterest.') || host.includes('reddit.com')||
            host.includes('twitter.com') || host.includes('x.com')   ||
            host.includes('tiktok.com') || host.includes('rumble.')   ||
            host.includes('vimeo.com') || host.includes('threads.')   ||
            host.includes('github.com') ||
            host.includes('sigmabrowser.') || host.includes('perplexity.') ||
            host.includes('you.com') || host.includes('felo.')        ||
            host.includes('yep.com') || host.includes('iask.')        ||
            host.includes('scira.') || host.includes('blackbox.')     ||
            host.includes('grok.com') || host.includes('chatgpt.com') ||
            host.includes('copilot.microsoft.')) {
            searchTerm = params.get('q');
        }
        else if (host.includes('youtube.com')) {
            searchTerm = params.get('search_query');
        }
        else if (host.includes('yahoo.')) {
            searchTerm = params.get('p');
        }
        else if (host.includes('aol.')) {
            searchTerm = params.get('q') || params.get('query');
        }
        else if (host.includes('wikipedia.org')) {
            searchTerm = params.get('search');
        }
        else if (host.includes('bilibili.')) {
            searchTerm = params.get('keyword') || params.get('q');
        }
        else if (host.includes('rutube.ru')) {
            searchTerm = params.get('query') || params.get('search');
        }
        else if (host.includes('dailymotion.com')) {
            // /search/{query} path format
            const m = path.match(/\/search\/([^/]+)/);
            if (m) searchTerm = decodeURIComponent(m[1]);
        }
        else if (host.includes('archive.org')) {
            searchTerm = params.get('query') || params.get('q');
        }
        else if (host.includes('yandex.')) {
            // Yandex: yandex.com/search/?text=query
            searchTerm = params.get('text');
        }
        else if (host.includes('startpage.')) {
            // Startpage: startpage.com/search?query=  OR  ?q=
            searchTerm = params.get('query') || params.get('q');
        }
        else if (host.includes('twitch.tv')) {
            // Twitch: twitch.tv/search?term=query
            searchTerm = params.get('term') || params.get('q');
        }
        else if (host.includes('mistral.') || host.includes('qwen.')) {
            searchTerm = params.get('q') || params.get('text');
        }

        if (searchTerm && searchTerm.trim() !== '') {
            const cleanTerm = decodeURIComponent(searchTerm).trim();
            const now       = Date.now();
            const engine    = detectEngineFromHost(host);
            // Duplicate check: same engine+query within 15s (prevents YouTube redirect double-count)
            const dupKey    = engine + '::' + cleanTerm.toLowerCase();
            if (lastProcessedSearch.key === dupKey && (now - lastProcessedSearch.time < 15000)) {
                return;
            }
            lastProcessedSearch = { key: dupKey, time: now };
            saveToSharedHistory(cleanTerm, engine);
        }
    } catch (e) { /* invalid URL — ignore */ }
});