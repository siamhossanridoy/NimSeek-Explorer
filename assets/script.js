let searchHistory = []; 
// ── Engine name normalizer — used in both save paths and popup ──────────
// Defined as function declaration (not const) so it hoists to top of scope
function normalizeEngineName(key) {
    if (!key) return 'Other';
    const MAP = {
        google:'Google', bing:'Bing', duckduckgo:'DuckDuckGo', yahoo:'Yahoo',
        yandex:'Yandex', ecosia:'Ecosia', qwant:'Qwant', brave:'Brave',
        startpage:'Startpage', presearch:'Presearch', kagi:'Kagi', aol:'AOL',
        youtube:'YouTube', rumble:'Rumble', dailymotion:'Dailymotion',
        tiktok:'TikTok', bilibili:'Bilibili', vimeo:'Vimeo', rutube:'Rutube',
        facebook:'Facebook', x:'X', threads:'Threads', reddit:'Reddit',
        pinterest:'Pinterest', twitch:'Twitch', github:'GitHub',
        chatgpt:'ChatGPT', copilot:'Copilot', grok:'Grok',
        perplexity:'Perplexity', you:'You.com', mistral:'Mistral',
        qwen:'Qwen', blackbox:'Blackbox', felo:'Felo', iask:'iAsk',
        wikipedia:'Wikipedia', archive:'Archive',
    };
    const k = key.trim().toLowerCase();
    return MAP[k] || MAP[k.replace(/[^a-z]/g,'')] || (key.charAt(0).toUpperCase()+key.slice(1));
}

// ── Engine → search URL map for click-to-search ─────────────────────────
const ENGINE_SEARCH_URLS = {
    'Google':      q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    'Bing':        q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    'DuckDuckGo':  q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    'Yahoo':       q => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`,
    'Yandex':      q => `https://yandex.com/search/?text=${encodeURIComponent(q)}`,
    'Ecosia':      q => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`,
    'Qwant':       q => `https://www.qwant.com/?q=${encodeURIComponent(q)}`,
    'Brave':       q => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
    'Startpage':   q => `https://www.startpage.com/do/search?q=${encodeURIComponent(q)}`,
    'Presearch':   q => `https://presearch.com/search?q=${encodeURIComponent(q)}`,
    'Kagi':        q => `https://kagi.com/search?q=${encodeURIComponent(q)}`,
    'AOL':         q => `https://search.aol.com/aol/search?q=${encodeURIComponent(q)}`,
    'YouTube':     q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    'Rumble':      q => `https://rumble.com/search/all?q=${encodeURIComponent(q)}`,
    'Dailymotion': q => `https://www.dailymotion.com/search/${encodeURIComponent(q)}`,
    'TikTok':      q => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`,
    'Bilibili':    q => `https://www.bilibili.tv/en/search-result?q=${encodeURIComponent(q)}`,
    'Vimeo':       q => `https://vimeo.com/search?q=${encodeURIComponent(q)}`,
    'Rutube':      q => `https://rutube.ru/search/?query=${encodeURIComponent(q)}`,
    'Facebook':    q => `https://www.facebook.com/search/top?q=${encodeURIComponent(q)}`,
    'X':           q => `https://x.com/search?q=${encodeURIComponent(q)}`,
    'Threads':     q => `https://www.threads.com/search?q=${encodeURIComponent(q)}`,
    'Reddit':      q => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
    'Pinterest':   q => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`,
    'Twitch':      q => `https://www.twitch.tv/search?term=${encodeURIComponent(q)}`,
    'GitHub':      q => `https://github.com/search?q=${encodeURIComponent(q)}`,
    'ChatGPT':     q => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
    'Copilot':     q => `https://www.bing.com/copilotsearch?q=${encodeURIComponent(q)}`,
    'Grok':        q => `https://grok.com/?q=${encodeURIComponent(q)}`,
    'Perplexity':  q => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
    'You.com':     q => `https://you.com/search?q=${encodeURIComponent(q)}`,
    'Mistral':     q => `https://chat.mistral.ai/chat?q=${encodeURIComponent(q)}`,
    'Qwen':        q => `https://chat.qwen.ai/?text=${encodeURIComponent(q)}`,
    'Blackbox':    q => `https://www.blackbox.ai/?q=${encodeURIComponent(q)}`,
    'Felo':        q => `https://felo.ai/en/search?q=${encodeURIComponent(q)}`,
    'iAsk':        q => `https://iask.ai/?q=${encodeURIComponent(q)}`,
    'Wikipedia':   q => `https://wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`,
    'Archive':     q => `https://archive.org/search?query=${encodeURIComponent(q)}`,
};



// ★ এই অংশটি যুক্ত করুন (সিঙ্ক্রোনাইজেশন লিসেনার)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.searchHistory) {
        searchHistory = changes.searchHistory.newValue || [];
        console.log("History synchronized from another tab.");
    }
});
let selectedEngine = 'google';
 let shortcuts = [];  
 let isEngineSticky = false; // ★★★ নতুন ভেরিয়েবল: ট্র্যাক করে প্রিফিক্স ব্যবহার হয়েছে কিনা
 let activeHistoryIndex = -1; 
 let suggestionAbortController = null; 
 const MAX_HISTORY_QUERY_LENGTH = 200; 


// --- নতুন যোগ করা কোড (ইঞ্জিন আইকন লজিক) (শুরু) ---

// ইঞ্জিনের জন্য ইমোজি/প্রতীকগুলোর ম্যাপ
// ইঞ্জিনের জন্য লোগোগুলোর ম্যাপ
const engineIcons = {
    // --- Search Engines ---
    'google':      '<img src="icons/google.ico" alt="Google">',
    'bing':        '<img src="icons/bing.ico" alt="Bing">',
    'duckduckgo':  '<img src="icons/duckduckgo.ico" alt="DuckDuckGo">',
    'yahoo':       '<img src="icons/yahoo.ico" alt="Yahoo">',
    'yandex':      '<img src="icons/yandex.ico" alt="Yandex">',
    'ecosia':      '<img src="icons/ecosia.ico" alt="Ecosia">',
    'kagi':        '<img src="icons/Kagi_Search_Engine_Icon.png" alt="Kagi">',
    'qwant':       '<img src="icons/qwant.ico" alt="Qwant">',
    'brave':       '<img src="icons/brave.ico" alt="Brave">',
    'startpage':   '<img src="icons/startpage.ico" alt="Startpage">',
    'presearch':   '<img src="icons/presearch.ico" alt="Presearch">',
    'aol':         '<img src="icons/aol.ico" alt="AOL">',

    // --- AI & Chatbots ---
    'chatgpt':     '<img src="icons/chatgpt.ico" alt="ChatGPT">',
    'copilot':     '<img src="icons/copilot.ico" alt="Copilot">',
    'perplexity':  '<img src="icons/perplexity.ico" alt="Perplexity">',
    'grok':        '<img src="icons/grok.ico" alt="Grok">',
    'mistral':     '<img src="icons/mistral.ico" alt="Mistral">',
    'qwen':        '<img src="icons/qwen.ico" alt="Qwen">',
    'felo':        '<img src="icons/felo.svg" alt="Felo">',
    'iask':        '<img src="icons/iask.ico" alt="iAsk">',
    'you':         '<img src="icons/youcom.ico" alt="You.com">',

    // --- Social Media & Community ---
    'facebook':    '<img src="icons/facebook.ico" alt="Facebook">',
    'x':           '<img src="icons/x.ico" alt="X">',
    'threads':     '<img src="icons/threads-app-icon.png" alt="Threads">',
    'reddit':      '<img src="icons/reddit.ico" alt="Reddit">',
    'tiktok':      '<img src="icons/tiktok.ico" alt="TikTok">',
    'pinterest':   '<img src="icons/pinterest.ico" alt="Pinterest">',

    // --- Video & Content Platforms ---
    'youtube':     '<img src="icons/youtube.ico" alt="YouTube">',
    'rumble':      '<img src="icons/rumble.ico" alt="Rumble">',
    'dailymotion': '<img src="icons/dailymotion.ico" alt="Dailymotion">',
    'github':      '<img src="icons/github.ico" alt="GitHub">',
    'wikipedia':   '<img src="icons/wikipedia.ico" alt="Wikipedia">',
    'archive':     '<img src="icons/Internet_Archive_logotype.png" alt="Internet Archive">',

    // --- Fallback ---
    'default':     '🔍︎' 
};



// ★★★ নতুন: ইঞ্জিন সাজেশনের জন্য আইকন পাথ (src) ম্যাপ ★★★
const engineSuggestionIcons = {
    // --- Major Search Engines ---
    'google':      'icons/google.ico',
    'bing':        'icons/bing.ico',
    'duckduckgo':  'icons/duckduckgo.ico',
    'yahoo':       'icons/yahoo.ico',
    'yandex':      'icons/yandex.ico',
    'brave':       'icons/brave.ico',
    'ecosia':      'icons/ecosia.ico',
    'kagi':        'icons/Kagi_Search_Engine_Icon.png',
    'qwant':       'icons/qwant.ico',
    'startpage':   'icons/startpage.ico',
    'presearch':   'icons/presearch.ico',
    'aol':         'icons/aol.ico',

    // --- AI Tools & Search ---
    'chatgpt':     'icons/chatgpt.ico',
    'copilot':     'icons/copilot.ico',
    'perplexity':  'icons/perplexity.ico',
    'grok':        'icons/grok.ico',
    'mistral':     'icons/mistral.ico',
    'qwen':        'icons/qwen.ico',
    'felo':        'icons/felo.svg',
    'iask':        'icons/iask.ico',
    'you':         'icons/youcom.ico',

    // --- Social Media ---
    'facebook':    'icons/facebook.ico',
    'x':           'icons/x.ico',
    'threads':     'icons/threads-app-icon.png',
    'reddit':      'icons/reddit.ico',
    'tiktok':      'icons/tiktok.ico',
    'pinterest':   'icons/pinterest.ico',

    // --- Content & Knowledge ---
    'youtube':     'icons/youtube.ico',
    'github':      'icons/github.ico',
    'wikipedia':   'icons/wikipedia.ico',
    'archive':     'icons/Internet_Archive_logotype.png',
    'rumble':      'icons/rumble.ico',
    'dailymotion': 'icons/dailymotion.ico'
};

// ইঞ্জিন প্রিফিক্সগুলোর ম্যাপ
/**
 * বিভিন্ন প্ল্যাটফর্মের জন্য সার্চ প্রিফিক্স (Prefixes)
 * ফরম্যাট: '@keyword:'
 */
const enginePrefixes = {
    // --- General Search ---
    google:     '@google:',
    bing:       '@bing:',
    duckduckgo: '@duckduckgo:',
    yahoo:      '@yahoo:',
    yandex:     '@yandex:',
    ecosia:     '@ecosia:',
    kagi:       '@kagi:',
    qwant:      '@qwant:',
    brave:      '@brave:',
    startpage:  '@startpage:',
    presearch:  '@presearch:',
    aol:        '@aol:',
    archive:    '@archive:',

    // --- AI / Chat ---
    perplexity: '@perplexity:',
    grok:       '@grok:',
    chatgpt:    '@chatgpt:',
    copilot:    '@copilot:',
    mistral:    '@mistral:',
    you:        '@you:',
    iask:       '@iask:',
    felo:       '@felo:',
    qwen:       '@qwen:',

    // --- Social & Community ---
    x:          '@x:',
    facebook:   '@facebook:',
    reddit:     '@reddit:',
    threads:    '@threads:',
    pinterest:  '@pinterest:', // কোলোন (:) যোগ করা হয়েছে সামঞ্জস্যের জন্য
    github:     '@github:',

    // --- Video Platforms ---
    youtube:    '@youtube:',
    tiktok:     '@tiktok:',
    rumble:     '@rumble:',
    dailymotion:'@dailymotion:',

    // --- Knowledge ---
    wikipedia:  '@wikipedia:'
};


/**
 * নির্বাচিত ইঞ্জিন অনুযায়ী সার্চ বাটনের আইকন আপডেট করে।
 */
function updateSearchButtonIcon(engine) {
    const iconElement = document.getElementById('search-icon-display');
    const iconToDisplay = engineIcons[engine] || engineIcons['default'];
    
    if (iconElement) {
       // ★★★ পরিবর্তন: আইকনের টেক্সটের বদলে HTML পরিবর্তন করা হচ্ছে ★★★
        iconElement.innerHTML = iconToDisplay; 
        
        // বাটনকেও স্টাইল করার প্রয়োজন হতে পারে
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
            // লোগো থাকলে, ব্যাকগ্রাউন্ড লোগো বাটন লুকানোর জন্য এই ক্লাস যুক্ত করুন
            if (engine !== 'default') {
                searchButton.classList.add('engine-active');
            } else {
                searchButton.classList.remove('engine-active');
            }
        }
    }
}




/**
 * ইনপুট থেকে সার্চ ইঞ্জিন প্রিফিক্স চেক করে এবং যদি পাওয়া যায় তবে ইঞ্জিন সেট করে।
 */
function updateSearchEngineFromInput(value) {
    let cleanValue = value;
    let newEngine = selectedEngine; 
    let prefixFound = false;

    for (const [engine, prefix] of Object.entries(enginePrefixes)) {
        if (value.toLowerCase().startsWith(prefix)) {
            newEngine = engine;
            cleanValue = value.substring(prefix.length).trimStart(); 
            prefixFound = true; 
            isEngineSticky = true; 
            
            // ★ পরিবর্তন: পছন্দটি স্থায়ীভাবে সেভ করা হচ্ছে
            chrome.storage.local.set({ selectedEngine: newEngine });
            break; 
        }
    }

    if (newEngine !== selectedEngine) {
        selectedEngine = newEngine;
        if (typeof updateEngineButtonText === 'function') {
             updateEngineButtonText(); 
        }
    }
    
    // আইকন আপডেট লজিক
    if (prefixFound) {
        updateSearchButtonIcon(selectedEngine);
    } else if (cleanValue.length === 0) {
        // ★ পরিবর্তন: ইনপুট খালি হলেও ডিফল্ট আইকনে ফিরে যাবে না যদি তা স্টিকি থাকে
        if (isEngineSticky) {
            updateSearchButtonIcon(selectedEngine);
        } else {
            updateSearchButtonIcon('default');
        }
    } else if (isEngineSticky) {
        updateSearchButtonIcon(selectedEngine);
    } else {
        updateSearchButtonIcon('default');
    }
    
    return cleanValue;
}
// --- নতুন যোগ করা কোড (ইঞ্জিন প্রিফিক্স হ্যান্ডলিং) (শেষ) ---
const presetImages = [
    { name: "wallpepar",  url: "assets/wallpepar/1.avif" },   
     { name: "wallpepar",  url: "assets/wallpepar/2.avif" },   
      { name: "wallpepar",  url: "assets/wallpepar/3.avif" },  
        { name: "wallpepar",  url: "assets/wallpepar/4.avif" },  
          { name: "wallpepar",  url: "assets/wallpepar/5.avif" }, 
             { name: "wallpepar",  url: "assets/wallpepar/6.avif" }, 
                { name: "wallpepar",  url: "assets/wallpepar/7.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/8.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/9.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/10.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/11.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/12.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/13.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/14.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/15.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/16.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/17.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/18.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/19.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/20.avif" },
                    { name: "wallpepar",  url: "assets/wallpepar/21.avif" },
];
const presetColors = [
  // ── NEUTRALS: Black → White (sequential) ────────────────────
  '#000000', '#111111', '#1c1c1c',
  '#2d2d2d', '#3c3c3c', '#4a4a4a',
  '#555555', '#666666', '#777777',
  '#888888', '#999999', '#aaaaaa',
  '#bbbbbb', '#cccccc', '#dddddd',
  '#eeeeee', '#f5f5f5', '#ffffff',

  // ── REDS: Dark → Light ───────────────────────────────────────
  '#1a0000', '#3b0000', '#6d0000',
  '#8b0000', '#b71c1c', '#c62828',
  '#d32f2f', '#ef5350', '#e57373',
  '#ef9a9a', '#ffcdd2', '#fce4ec',

  // ── ORANGES: Dark → Light ────────────────────────────────────
  '#1a0800', '#3e1c00', '#6f3200',
  '#bf360c', '#e64a19', '#f4511e',
  '#ff5722', '#ff7043', '#ff8a65',
  '#ffab91', '#ffccbc', '#fbe9e7',

  // ── YELLOWS/AMBERS: Dark → Light ─────────────────────────────
  '#1a1200', '#3e2d00', '#6f5300',
  '#e65100', '#ff6f00', '#ffa000',
  '#ffb300', '#ffc107', '#ffd54f',
  '#ffe082', '#ffecb3', '#fff8e1',

  // ── GREENS: Dark → Light ─────────────────────────────────────
  '#001a00', '#0a2e00', '#1b5e20',
  '#2e7d32', '#388e3c', '#43a047',
  '#4caf50', '#66bb6a', '#81c784',
  '#a5d6a7', '#c8e6c9', '#e8f5e9',

  // ── TEALS/CYANS: Dark → Light ────────────────────────────────
  '#001a1a', '#002e2e', '#004d40',
  '#00695c', '#00796b', '#00897b',
  '#009688', '#26a69a', '#4db6ac',
  '#80cbc4', '#b2dfdb', '#e0f2f1',

  // ── BLUES: Dark → Light ──────────────────────────────────────
  '#00001a', '#000428', '#0d1b3e',
  '#0d47a1', '#1565c0', '#1976d2',
  '#1e88e5', '#2196f3', '#42a5f5',
  '#64b5f6', '#90caf9', '#e3f2fd',

  // ── INDIGOS/PURPLES: Dark → Light ────────────────────────────
  '#0a001a', '#1a0040', '#283593',
  '#311b92', '#4527a0', '#512da8',
  '#673ab7', '#7e57c2', '#9575cd',
  '#b39ddb', '#d1c4e9', '#ede7f6',

  // ── PINKS/ROSES: Dark → Light ────────────────────────────────
  '#1a000d', '#4a0019', '#880e4f',
  '#ad1457', '#c2185b', '#d81b60',
  '#e91e63', '#ec407a', '#f06292',
  '#f48fb1', '#f8bbd9', '#fce4ec',

  // ── WARM BROWNS ───────────────────────────────────────────────
  '#1a0f00', '#3e2000', '#5d4037',
  '#6d4c41', '#795548', '#8d6e63',
  '#a1887f', '#bcaaa4', '#d7ccc8',

  // ── SPECIAL TONES ────────────────────────────────────────────
  '#e7e7e7', '#ea6666', '#7ec776',
  '#78e6d9', '#ea8bdd', '#b67be3',
  '#d8c275', '#e1a071', '#8ba6f7',

  // ── Premium Gradients (80 total) ───────────────────────────

  // ▸ DARK LUXURY
  'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
  'linear-gradient(135deg, #000000 0%, #2d1b69 100%)',
  'linear-gradient(160deg, #0d0221 0%, #0a1628 40%, #1a0a2e 100%)',
  'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  'linear-gradient(160deg, #000000 0%, #434343 100%)',
  'linear-gradient(135deg, #141414 0%, #1f1f1f 50%, #0d0d0d 100%)',
  'linear-gradient(135deg, #1a0a2e 0%, #0d1b3e 50%, #0a2010 100%)',

  // ▸ MIDNIGHT BLUE
  'linear-gradient(135deg, #000428 0%, #004e92 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  'linear-gradient(160deg, #0d1b2a 0%, #1b2a4a 50%, #2a3a6a 100%)',
  'linear-gradient(135deg, #1a237e 0%, #283593 50%, #0d47a1 100%)',
  'linear-gradient(135deg, #001f5b 0%, #0d47a1 50%, #42a5f5 100%)',

  // ▸ DEEP SPACE
  'linear-gradient(135deg, #0a0015 0%, #1a0040 40%, #000428 100%)',
  'linear-gradient(160deg, #000000 0%, #1a0a2e 30%, #0d47a1 100%)',
  'radial-gradient(ellipse at top, #1a0a2e 0%, #000000 70%)',
  'radial-gradient(ellipse at bottom, #0d47a1 0%, #0a0015 70%)',

  // ▸ AURORA BOREALIS
  'linear-gradient(135deg, #001a00 0%, #003300 30%, #004d1a 60%, #006633 100%)',
  'linear-gradient(160deg, #00051a 0%, #00334d 40%, #004d33 70%, #001a0d 100%)',
  'linear-gradient(135deg, #0d0221 0%, #1a2a0d 40%, #0d3320 100%)',
  'linear-gradient(135deg, #000d1a 0%, #003333 50%, #001a1a 100%)',

  // ▸ GOLDEN HOUR
  'linear-gradient(135deg, #1a0a00 0%, #4d1a00 30%, #804000 60%, #b35900 100%)',
  'linear-gradient(160deg, #0d0500 0%, #3d1a00 40%, #7a3800 70%, #b36200 100%)',
  'linear-gradient(135deg, #1a0500 0%, #4d0e00 40%, #991f00 70%, #cc3300 100%)',
  'linear-gradient(135deg, #2d1700 0%, #804000 50%, #cc7a00 100%)',

  // ▸ ROYAL PURPLE
  'linear-gradient(135deg, #0d001a 0%, #1a0033 40%, #2d0052 70%, #400066 100%)',
  'linear-gradient(160deg, #0a0015 0%, #1f0040 40%, #3d0080 100%)',
  'linear-gradient(135deg, #150025 0%, #330066 50%, #1a0040 100%)',
  'linear-gradient(135deg, #0f0020 0%, #1a0040 40%, #330066 70%, #4d0099 100%)',

  // ▸ CRIMSON & ROSE
  'linear-gradient(135deg, #1a0005 0%, #4d000f 40%, #800019 70%, #cc0029 100%)',
  'linear-gradient(160deg, #0d0008 0%, #330015 40%, #66002b 70%, #990040 100%)',
  'linear-gradient(135deg, #1a0010 0%, #4d0030 50%, #990060 100%)',
  'linear-gradient(135deg, #200010 0%, #600030 40%, #c00060 70%, #ff1493 100%)',

  // ▸ FOREST & EMERALD
  'linear-gradient(135deg, #001a00 0%, #004d00 40%, #007a00 70%, #00a300 100%)',
  'linear-gradient(160deg, #000d05 0%, #00331a 40%, #00664d 70%, #009966 100%)',
  'linear-gradient(135deg, #001405 0%, #004d1a 40%, #00804d 70%, #00b36b 100%)',
  'linear-gradient(135deg, #0a1f0a 0%, #1a4d1a 40%, #2d7a2d 70%, #3da33d 100%)',

  // ▸ OCEAN DEPTHS
  'linear-gradient(180deg, #001a33 0%, #003366 40%, #00509e 70%, #0066cc 100%)',
  'linear-gradient(160deg, #000d1a 0%, #00264d 40%, #003d80 70%, #0055b3 100%)',
  'radial-gradient(ellipse at center, #003366 0%, #001a33 60%, #000d1a 100%)',
  'linear-gradient(135deg, #001433 0%, #00294d 40%, #004080 70%, #0055aa 100%)',

  // ▸ SUNSET PREMIUM
  'linear-gradient(160deg, #0d0005 0%, #330015 20%, #660030 40%, #cc3300 60%, #ff6600 80%, #ffcc00 100%)',
  'linear-gradient(135deg, #1a0000 0%, #4d0000 20%, #990000 40%, #cc3300 60%, #ff6600 100%)',
  'linear-gradient(160deg, #100020 0%, #400060 30%, #800080 50%, #c04040 70%, #ff8040 100%)',
  'linear-gradient(135deg, #0d0015 0%, #400040 30%, #800040 50%, #c02000 70%, #ff8000 100%)',

  // ▸ NEON & CYBER
  'linear-gradient(135deg, #000000 0%, #001a1a 40%, #003333 70%, #004d4d 100%)',
  'linear-gradient(135deg, #000000 0%, #0d001a 40%, #1a0033 70%, #001a33 100%)',
  'radial-gradient(ellipse at top left, #001433 0%, #000000 60%), radial-gradient(ellipse at bottom right, #330033 0%, transparent 60%)',
  'linear-gradient(135deg, #000d1a 0%, #001a33 30%, #003366 60%, #006699 100%)',

  // ▸ WARM EARTH
  'linear-gradient(135deg, #1a0f00 0%, #4d2900 40%, #7a4700 70%, #a36200 100%)',
  'linear-gradient(160deg, #150c00 0%, #3d2200 40%, #6b3d00 70%, #996100 100%)',
  'linear-gradient(135deg, #1a1000 0%, #4d3000 40%, #805000 70%, #b37000 100%)',
  'linear-gradient(135deg, #1a0a00 0%, #4d1f00 40%, #7a3300 70%, #a64d00 100%)',

  // ▸ METALLIC
  'linear-gradient(135deg, #1a1a1a 0%, #3d3d3d 25%, #1a1a1a 50%, #3d3d3d 75%, #1a1a1a 100%)',
  'linear-gradient(135deg, #0d1017 0%, #1a2030 40%, #0d1017 70%, #253040 100%)',
  'linear-gradient(135deg, #1a1500 0%, #3d3300 40%, #5c4d00 70%, #7a6600 100%)',
  'linear-gradient(160deg, #0a0a0a 0%, #2a2a2a 30%, #1a1a1a 60%, #333333 100%)',

  // ▸ MYSTICAL
  'linear-gradient(135deg, #0d0015 0%, #1a0029 25%, #00001a 50%, #001a29 75%, #00001a 100%)',
  'linear-gradient(160deg, #050010 0%, #0f0020 30%, #001020 60%, #050015 100%)',
  'radial-gradient(ellipse at 30% 40%, #1a0040 0%, #000000 50%), radial-gradient(ellipse at 70% 60%, #001a40 0%, transparent 50%)',
  'linear-gradient(135deg, #000000 0%, #0a0015 30%, #000a1a 60%, #000000 100%)',

  // ▸ PREMIUM SPECIAL
  'conic-gradient(from 135deg at 50% 50%, #0d0015, #001a33, #001a00, #1a0005, #1a0015, #0d0015)',
  'linear-gradient(135deg, #000000 0%, #0d0221 33%, #1a0f00 66%, #000000 100%)',
  'radial-gradient(ellipse at 20% 20%, #1a0040 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, #003366 0%, transparent 50%), linear-gradient(135deg, #000000, #0a0a0a)',
  'linear-gradient(45deg, #000000 0%, #0d0015 20%, #00000a 40%, #150010 60%, #000a15 80%, #000000 100%)',

  // ── 30 More Premium Gradients ─────────────────────────────
  // Ultra Dark Mesh
  'radial-gradient(ellipse at 0% 0%, #1a0a2e 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, #0d1b3e 0%, transparent 50%), #000000',
  'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #000000 100%)',
  // Iridescent Dark
  'linear-gradient(135deg, #0d0015 0%, #001a3e 33%, #003300 66%, #1a0015 100%)',
  'linear-gradient(160deg, #000d1a 0%, #1a0040 25%, #003333 50%, #1a0020 75%, #000d1a 100%)',
  'linear-gradient(45deg, #0a000f 0%, #001533 20%, #100020 60%, #001a1a 100%)',
  // Velvet & Silk
  'linear-gradient(135deg, #1a0015 0%, #330029 30%, #001a1a 100%)',
  'linear-gradient(160deg, #100015 0%, #200030 40%, #001520 100%)',
  'linear-gradient(135deg, #0f0020 0%, #1f0030 30%, #001020 100%)',
  // Prismatic Dark
  'linear-gradient(135deg, #001a00 0%, #00001a 33%, #1a0000 66%, #001a1a 100%)',
  'linear-gradient(160deg, #000a15 0%, #150020 33%, #001500 66%, #0a000f 100%)',
  // Quantum
  'linear-gradient(135deg, #020208 0%, #060316 33%, #020a12 66%, #08020c 100%)',
  'radial-gradient(ellipse at 20% 80%, #0d1b3e 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #1a0540 0%, transparent 60%), #050005',
  // Carbon
  'repeating-linear-gradient(45deg, #0d0d0d 0px, #0d0d0d 2px, #1a1a1a 2px, #1a1a1a 8px)',
  'repeating-linear-gradient(90deg, #111 0px, #111 1px, #1a1a1a 1px, #1a1a1a 6px)',
  // Nebula
  'radial-gradient(ellipse at 30% 40%, #200040 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, #001a40 0%, transparent 60%), #000000',
  'radial-gradient(ellipse at 60% 20%, #400020 0%, transparent 55%), radial-gradient(ellipse at 40% 80%, #001040 0%, transparent 55%), #000000',
  'radial-gradient(ellipse at 50% 50%, #0d0030 0%, #000000 70%)',
  // Onyx
  'linear-gradient(135deg, #0a0a0a 0%, #1e1e1e 50%, #0a0a0a 100%)',
  'linear-gradient(135deg, #050505 0%, #101010 50%, #050505 100%)',
  'linear-gradient(160deg, #080808 0%, #151515 50%, #080808 100%)',
  // Phantom Blue
  'linear-gradient(135deg, #000510 0%, #001020 50%, #000515 100%)',
  'linear-gradient(160deg, #000008 0%, #010a1a 50%, #000008 100%)',
  // Void
  'radial-gradient(circle at 50% 0%, #0a0015 0%, #000000 60%)',
  'radial-gradient(circle at 50% 100%, #00001a 0%, #000000 60%)',
  // Luxury Brand
  'linear-gradient(135deg, #1a1400 0%, #3d3000 40%, #1a1400 100%)',
  'linear-gradient(135deg, #0a0505 0%, #200f0f 50%, #0a0505 100%)',
  'linear-gradient(135deg, #050a0a 0%, #0f2020 50%, #050a0a 100%)',
  // Smoked
  'linear-gradient(160deg, rgba(5,5,15,0.98) 0%, rgba(15,10,25,0.98) 50%, rgba(5,10,15,0.98) 100%)',
  'linear-gradient(135deg, rgba(10,10,20,0.97) 0%, rgba(20,15,30,0.97) 100%)',

  // ── 50 More Premium Gradients ─────────────────────────────

  // Cosmic Dust
  'radial-gradient(ellipse at 10% 90%, rgba(63,0,113,0.8), transparent 60%), radial-gradient(ellipse at 90% 10%, rgba(0,30,100,0.8), transparent 60%), #030308',
  'radial-gradient(ellipse at 80% 20%, rgba(100,0,50,0.7), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(0,50,100,0.7), transparent 55%), #020206',
  'radial-gradient(circle at 30% 70%, rgba(50,0,100,0.6) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(0,80,80,0.6) 0%, transparent 50%), #010104',

  // Northern Lights
  'linear-gradient(160deg, #001a00 0%, #004d1a 20%, #006633 40%, #004d4d 60%, #001a33 80%, #000d1a 100%)',
  'linear-gradient(135deg, #000a05 0%, #003320 25%, #006644 50%, #003333 75%, #000a10 100%)',
  'linear-gradient(170deg, #000500 0%, #001a00 30%, #004d00 50%, #003333 70%, #000510 100%)',

  // Infrared Spectrum
  'linear-gradient(135deg, #000000 0%, #1a0000 20%, #330000 40%, #4d0000 60%, #660000 80%, #800000 100%)',
  'linear-gradient(135deg, #050000 0%, #200000 33%, #500000 66%, #800010 100%)',
  'linear-gradient(135deg, #0a0000 0%, #250000 40%, #600000 70%, #900020 100%)',

  // Arctic Ice
  'linear-gradient(135deg, #000a14 0%, #001428 30%, #002040 50%, #001428 70%, #000a14 100%)',
  'linear-gradient(160deg, #000810 0%, #001020 33%, #001a33 66%, #000810 100%)',
  'radial-gradient(ellipse at 50% 0%, #001a33 0%, #000000 70%)',

  // Jungle Canopy
  'linear-gradient(160deg, #000500 0%, #001400 25%, #002800 50%, #003300 75%, #001a00 100%)',
  'linear-gradient(135deg, #000300 0%, #000f00 33%, #002000 66%, #003000 100%)',
  'radial-gradient(ellipse at 50% 100%, #003300 0%, #000000 65%)',

  // Desert Night
  'linear-gradient(160deg, #0a0800 0%, #1a1400 33%, #2d2200 66%, #1a1400 100%)',
  'linear-gradient(135deg, #080600 0%, #181000 33%, #281a00 66%, #181000 100%)',
  'linear-gradient(160deg, #0d0900 0%, #201500 50%, #301e00 100%)',

  // Toxic Waste
  'linear-gradient(135deg, #000800 0%, #001a00 25%, #003300 50%, #005500 75%, #007700 100%)',
  'linear-gradient(135deg, #001000 0%, #003000 40%, #005000 70%, #008000 100%)',

  // Blood Moon
  'radial-gradient(circle at 50% 50%, #400000 0%, #200000 40%, #0d0000 70%, #000000 100%)',
  'radial-gradient(ellipse at 50% 30%, #600000 0%, #300000 40%, #000000 80%)',

  // Deep Ocean
  'linear-gradient(180deg, #000000 0%, #000510 20%, #000a20 40%, #001030 60%, #001540 80%, #001a50 100%)',
  'linear-gradient(180deg, #000308 0%, #000820 40%, #001040 70%, #001560 100%)',
  'radial-gradient(ellipse at 50% 100%, #001040 0%, #000000 70%)',

  // Volcanic
  'linear-gradient(180deg, #000000 0%, #0a0000 30%, #200000 55%, #400000 75%, #600000 90%, #800000 100%)',
  'radial-gradient(ellipse at 50% 100%, #800000 0%, #400000 30%, #100000 60%, #000000 100%)',

  // Quantum Field
  'repeating-conic-gradient(from 0deg at 50% 50%, #000010 0deg, #000820 10deg, #000010 20deg)',
  'linear-gradient(135deg, #000010 0%, #00001a 25%, #000010 50%, #00001a 75%, #000010 100%)',

  // Silk & Satin
  'linear-gradient(135deg, #0a0005 0%, #150010 25%, #0a0015 50%, #050010 75%, #000005 100%)',
  'linear-gradient(160deg, #050005 0%, #0f0010 33%, #050010 66%, #00000f 100%)',

  // Chrome & Mirror
  'linear-gradient(135deg, #060606 0%, #1a1a1a 20%, #060606 40%, #222222 60%, #060606 80%, #1a1a1a 100%)',
  'linear-gradient(160deg, #080808 0%, #202020 25%, #0a0a0a 50%, #1c1c1c 75%, #080808 100%)',

  // Twilight
  'linear-gradient(180deg, #000000 0%, #050015 20%, #0a0030 40%, #0f0040 55%, #140050 70%, #0a0030 85%, #000000 100%)',
  'linear-gradient(180deg, #000000 0%, #020020 30%, #050040 55%, #020020 80%, #000000 100%)',

  // Cursed Forest
  'linear-gradient(160deg, #000500 0%, #010a00 20%, #021500 40%, #040a00 60%, #010500 80%, #000000 100%)',
  'radial-gradient(ellipse at 50% 0%, #030f00 0%, #000000 70%)',

  // Ember Glow
  'radial-gradient(circle at 50% 100%, #3d0c00 0%, #200600 40%, #0a0000 70%, #000000 100%)',
  'radial-gradient(circle at 50% 80%, #500c00 0%, #280600 50%, #000000 80%)',

  // Void Storm
  'radial-gradient(ellipse at 30% 50%, #100020 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, #001020 0%, transparent 60%), #000000',
  'radial-gradient(circle at 20% 50%, #050015 0%, transparent 40%), radial-gradient(circle at 80% 50%, #000515 0%, transparent 40%), #000000',

  // Pure Luxury
  'linear-gradient(135deg, #0d0a00 0%, #1f1500 33%, #0d0a00 66%, #2a1e00 100%)',
  'linear-gradient(135deg, #080500 0%, #151000 50%, #080500 100%)',
  'linear-gradient(160deg, #0a0700 0%, #1a1200 40%, #0d0900 70%, #201500 100%)',

];



// ১. NimSeek Tools এর ডেটা লিস্ট

// --- Drag & Drop Helpers ---

let draggedTool = null;
const NIMSEEK_TOOLS_STORAGE_KEY = 'nimseekToolsOrder'; // লোকাল স্টোরেজের চাবি

// নতুন ক্রম লোকাল স্টোরেজে সেভ করার ফাংশন
function saveNimSeekToolsOrder() {
    // DOM থেকে বর্তমান টুলের ক্রম সংগ্রহ করা
    const toolNames = Array.from(document.querySelectorAll('#toolsList .app-item')).map(item => item.dataset.toolName);

    // toolNames এর ক্রম অনুযায়ী nimSeekTools অ্যারে আপডেট করা
    const reorderedTools = toolNames.map(name => nimSeekTools.find(tool => tool.name === name));
    
    // গ্লোবাল অ্যারে আপডেট (ভবিষ্যতে ব্যবহারের জন্য)
    nimSeekTools.length = 0;
    nimSeekTools.push(...reorderedTools);

    // লোকাল স্টোরেজে নতুন ক্রম সেভ করা
    localStorage.setItem(NIMSEEK_TOOLS_STORAGE_KEY, JSON.stringify(reorderedTools));
}

// লোকাল স্টোরেজ থেকে সেভ করা ক্রম লোড করার ফাংশন
function loadNimSeekToolsOrder(defaultTools) {
    const savedOrder = localStorage.getItem(NIMSEEK_TOOLS_STORAGE_KEY);
    if (savedOrder) {
        return JSON.parse(savedOrder);
    }
    return defaultTools;
}

// --- Drag & Drop Event Handlers ---

function handleDragStart(e) {
    draggedTool = this;
    setTimeout(() => this.classList.add('dragging'), 0); 
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML); 
}

function handleDragOver(e) {
    e.preventDefault(); 
    const target = this;
    if (target.closest('#toolsList') && target !== draggedTool) {
        
        const rect = target.getBoundingClientRect();
        // কার্সর আইটেমের উপরের অর্ধেকে না নিচের অর্ধেকে আছে তা দেখবে
        const next = (e.clientY - rect.top) / rect.height > 0.5;
        
        // আগের ভিজ্যুয়াল ইঙ্গিতগুলি মুছে ফেলা
        target.parentNode.querySelectorAll('.drop-hint-before, .drop-hint-after').forEach(el => {
            el.classList.remove('drop-hint-before', 'drop-hint-after');
        });
        
        // নতুন ভিজ্যুয়াল ইঙ্গিত যোগ করা
        if (next) {
            target.classList.add('drop-hint-after');
        } else {
            target.classList.add('drop-hint-before');
        }
        e.dataTransfer.dropEffect = 'move';
    }
}

function handleDragLeave(e) {
    this.classList.remove('drop-hint-before', 'drop-hint-after');
}

function handleDrop(e) {
    e.stopPropagation(); 
    
    const target = this;
    target.classList.remove('drop-hint-before', 'drop-hint-after');
    
    if (draggedTool !== target) {
        const toolList = document.getElementById('toolsList');
        
        // সঠিক স্থানে ইনসার্ট করা
        if (target.classList.contains('drop-hint-after')) {
            toolList.insertBefore(draggedTool, target.nextSibling);
        } else {
            toolList.insertBefore(draggedTool, target);
        }
        
        // নতুন ক্রম সেভ করা
        saveNimSeekToolsOrder();
    }
}

function handleDragEnd(e) {
    // সবশেষে ক্লিন আপ করা
    this.classList.remove('dragging');
    this.parentNode.querySelectorAll('.drop-hint-before, .drop-hint-after').forEach(el => {
        el.classList.remove('drop-hint-before', 'drop-hint-after');
    });
    draggedTool = null;
}


// ২. টুলস মেনু তৈরি করার ফাংশন
// script.js ফাইলে বিদ্যমান function populateToolsMenu() { ... } ফাংশনটিকে প্রতিস্থাপন করুন
function populateToolsMenu() {
    const toolsList = document.getElementById('toolsList');
    if (!toolsList) return;

    // লোকাল স্টোরেজ থেকে বর্তমান ক্রম লোড করা হচ্ছে
    const currentTools = loadNimSeekToolsOrder(nimSeekTools);

    toolsList.innerHTML = '';
    const fallbackIcon = 'icons/default.png'; // আপনার ডিফল্ট আইকন পাথ

    currentTools.forEach(tool => { 
        const a = document.createElement('a');
        a.className = 'app-item'; 
        a.href = tool.url;
        a.target = '_self';
        a.rel = 'noopener noreferrer';
        
        // ★★★ Drag & Drop এর জন্য সেট করা হচ্ছে ★★★
        a.setAttribute('draggable', 'true');
        a.dataset.toolName = tool.name; // টুলের নাম দ্বারা শনাক্ত করা হবে

        const iconHtml = tool.icon 
            ? `<img src="${tool.icon}" onerror="this.src='${fallbackIcon}'" alt="${tool.name}" class="app-icon">`
            : ``;

        a.innerHTML = `
            ${iconHtml}
            <span>${tool.name}</span>
        `;
        
        // ★★★ Drag & Drop ইভেন্ট লিসেনার যোগ করা হচ্ছে ★★★
        a.addEventListener('dragstart', handleDragStart);
        a.addEventListener('dragover', handleDragOver);
        a.addEventListener('dragleave', handleDragLeave);
        a.addEventListener('drop', handleDrop);
        a.addEventListener('dragend', handleDragEnd);

        toolsList.appendChild(a);
    });
}

// ৩. টুলস পপআপ টগল করার ফাংশন
function toggleToolsPopup() {
    const popup = document.getElementById('toolsPopup');
    if (popup) {
        popup.classList.toggle('hidden');
    }

    // অন্য পপআপগুলো বন্ধ করা (যাতে এক সাথে একাধিক খোলা না থাকে)
    const otherPopups = ['settingsPopup', 'enginePopup', 'themesPopup', 'appsPopup', 'historyDropdown'];
    otherPopups.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// ৪. ইভেন্ট লিসেনার সেটআপ (DOM লোড হওয়ার পর)
document.addEventListener('DOMContentLoaded', () => {
    
    // টুলস বাটন ক্লিক হ্যান্ডলার
    const toolsBtn = document.getElementById('btn-tools');
    if (toolsBtn) {
        toolsBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // ইভেন্ট বাবলিং বন্ধ করা
            toggleToolsPopup();
        });
    }

    // মেনু পপুলেট করা
    populateToolsMenu();

    // ৫. বাইরে ক্লিক করলে পপআপ বন্ধ করা (আপনার বর্তমান clickHandler এর সাথে ইন্টিগ্রেশন)
    document.addEventListener('click', (e) => {
        const toolsPopup = document.getElementById('toolsPopup');
        const toolsBtn = document.getElementById('btn-tools');
        
        if (toolsPopup && !toolsPopup.classList.contains('hidden')) {
            if (!toolsPopup.contains(e.target) && !toolsBtn.contains(e.target)) {
                toolsPopup.classList.add('hidden');
            }
        }
    });
});

const nimSeekTools = [
    { name: 'NimSeek Notes', url: 'Tools/NS_Notes.html', icon: 'icons/9239205.png'  },
    { name: 'NS Pomodoro', url: 'Tools/Pomodoro.html', icon: 'icons/17496512.png'  },
    { name: 'NS Spinner', url: 'Tools/Spinner.html', icon: 'icons/15542.png'  }
    // { name: 'NS FAQ Builder', url: 'Tools/faq.html', icon: 'icons/faq-chat-3d-icon-png-download-4312629.png'  },


];

const appsData = [
    { url: 'https://chatgpt.com/', name: 'ChatGPT', icon: 'icons/chatgpt.ico' },
    { url: 'https://gemini.google.com/', name: 'Gemini', icon: 'icons/gemini-google.ico' },
    { url: 'https://copilot.microsoft.com/', name: 'Copilot', icon: 'icons/copilot.ico' },
    { url: 'https://chat.deepseek.com/', name: 'DeepSeek', icon: 'icons/deepseek.ico' },
    { url: 'https://grok.com/', name: 'Grok', icon: 'icons/grok.ico' },
    { url: 'https://chat.qwen.ai/', name: 'Qwen', icon: 'icons/qwen.ico' },
    { url: 'https://www.google.com/', name: 'Google', icon: 'icons/google.ico' },
    { url: 'https://mail.google.com/', name: 'Gmail', icon: 'icons/gmail.ico' },
    { url: 'https://www.youtube.com/', name: 'YouTube', icon: 'icons/youtube.ico' },
    { url: 'https://drive.google.com/', name: 'Drive', icon: 'icons/drive.ico' },
    { url: 'https://photos.google.com/', name: 'Photos', icon: 'icons/googlephotos.ico' },
    { url: 'https://translate.google.com/', name: 'Translate', icon: 'icons/translate.ico' },
    { url: 'https://keep.google.com/', name: 'Keeps', icon: 'icons/googlekeep.ico' },
    { url: 'https://calendar.google.com/', name: 'Calendar', icon: 'icons/googlecalendar.ico' },   
    { url: 'https://docs.google.com/', name: 'Docs', icon: 'icons/googledocs.ico' },
    { url: 'https://sheets.google.com/', name: 'Sheets', icon: 'icons/googlesheets.ico' },
    { url: 'https://slides.google.com/', name: 'Slides', icon: 'icons/googleslides.ico' },
    { url: 'https://forms.google.com/', name: 'Forms', icon: 'icons/googleforms.ico' },
    { url: 'https://docs.google.com/videos/u/0/', name: 'Google Vids', icon: 'icons/vids_48dp.png' },
    { url: 'https://www.canva.com/', name: 'Canva', icon: 'icons/canva.ico' },
    { url: 'https://www.notion.so/', name: 'Notion', icon: 'icons/channels4_profile.jpg' },
    { url: 'https://news.google.com/', name: 'News', icon: 'icons/googlenews.ico' },
    { url: 'https://maps.google.com/', name: 'Maps', icon: 'icons/googlemaps.ico' },
    { url: 'https://contacts.google.com/', name: 'Contacts', icon: 'icons/Google_Contacts_icon.svg.png' },
    { url: 'https://chat.google.com/', name: 'Chat', icon: 'icons/192px.svg' },
    { url: 'https://meet.google.com/', name: 'Meet', icon: 'icons/googlemeet.ico' },
    { url: 'https://notebooklm.google.com/', name: 'NotebookLM', icon: 'icons/notebooklm.ico' },
    { url: 'https://www.blogger.com/', name: 'Blogger', icon: 'icons/blogger.ico' },
    { url: 'https://analytics.google.com/', name: 'Google Analytics', icon: 'icons/googleanalytics.ico' },
    { url: 'https://studio.youtube.com/', name: 'YouTube Studio', icon: 'icons/youtube-studio.ico' },
    { url: 'https://sites.google.com/', name: 'Google Sites', icon: 'icons/googlesites.ico' },
    { url: 'https://aistudio.google.com/', name: 'Google AI Studio', icon: 'icons/google-ai-studio-logo.png' },
    { url: 'https://tasks.google.com/', name: 'Google Tasks', icon: 'icons/Google_Tasks_2021.svg.png' },
    { url: 'https://www.facebook.com/', name: 'Facebook', icon: 'icons/facebook.ico' },
    { url: 'https://www.instagram.com/', name: 'Instagram', icon: 'icons/instagram.ico' },
    { url: 'https://www.threads.com/', name: 'Threads', icon: 'icons/threads-app-icon.png' },
    { url: 'https://x.com/', name: 'X.com', icon: 'icons/x.ico' },
    { url: 'https://www.linkedin.com/', name: 'LinkedIn', icon: 'icons/linkedin.ico' },
    { url: 'https://www.reddit.com/', name: 'Reddit', icon: 'icons/reddit.ico' },
    { url: 'https://hikmah.net/', name: 'Hikmah', icon: 'icons/hikmah.png' },
    { url: 'https://www.tiktok.com/', name: 'TikTok', icon: 'icons/tiktok.ico' },
    { url: 'https://www.pinterest.com/', name: 'Pinterest', icon: 'icons/pinterest.ico' },
    { url: 'https://medium.com/', name: 'Medium', icon: 'icons/medium.ico' },
    { url: 'https://discord.com/', name: 'Discord', icon: 'icons/discord.ico' },
    { url: 'https://rumble.com/', name: 'Rumble', icon: 'icons/rumble.ico' },
    { url: 'https://www.twitch.tv/', name: 'Twitch', icon: 'icons/3991943.png' },
    { url: 'https://www.snapchat.com/', name: 'SnapChat', icon: 'icons/snapchat.ico' },
    { url: 'https://open.spotify.com/', name: 'Spotify', icon: 'icons/spotify.ico' },
    { url: 'https://github.com/', name: 'GitHub', icon: 'icons/github.ico' },
    { url: 'https://www.dropbox.com/', name: 'Dropbox', icon: 'icons/dropbox.ico' },
    { url: 'https://miro.com/', name: 'Miro', icon: 'icons/miro.ico' },
    { url: 'https://suno.com/', name: 'Suno', icon: 'icons/suno.ico' },
    { url: 'https://www.perplexity.ai/', name: 'Perplexity', icon: 'icons/perplexity.ico' },
    { url: 'https://claude.ai/', name: 'Claude AI', icon: 'icons/claude.ico' },
    { url: 'https://meta.ai/', name: 'Meta AI', icon: 'icons/metaai-color.png' },
    { url: 'https://www.felo.ai/', name: 'Felo AI', icon: 'icons/felo.svg' },
    { url: 'https://chat.mistral.ai/', name: 'Mistral AI', icon: 'icons/mistral.ico' },
    { url: 'https://you.com/', name: 'You.com', icon: 'icons/youcom.ico' },
    { url: 'https://scira.ai/', name: 'Scira.ai', icon: 'icons/scira.ico' },

    { url: 'https://manus.im/', name: 'Manus', icon: 'icons/manus.png' },
    { url: 'https://www.kimi.com/', name: 'Kimi', icon: 'icons/kimi-color.png' },
    { url: 'https://chat.morphic.sh/', name: 'Morphic', icon: 'icons/morphic.ico' },
    { url: 'https://app.sigmabrowser.com/chat', name: 'Sigma', icon: 'icons/1737888523296-SigmaLogoSquare1.png' },
    { url: 'https://www.dola.com/chat/', name: 'Dola', icon: 'icons/dola.jpg' },
    { url: 'https://yep.com/chat/', name: 'Yep Chat', icon: 'icons/yep.ico' },
    { url: 'https://chat.z.ai/', name: 'Z.ai', icon: 'icons/zdotai_logo.jpg' },
    { url: 'https://yandex.com/', name: 'Yandex', icon: 'icons/yandex.ico' },
    { url: 'https://bing.com/', name: 'Bing', icon: 'icons/bing.ico' },
    { url: 'https://search.yahoo.com/', name: 'Yahoo', icon: 'icons/yahoo.ico' },
   

];


// গ্লোবাল ভেরিয়েবলগুলো (যদি অন্যান্য ফাইলে ব্যবহৃত হয়)
const iconCache = new Map();
const defaultIcon = '/images/default-icon.png';

// সকল প্রয়োজনীয় ডেটা লোড করে এবং ইউজার ইন্টারফেস (UI) সেটআপ করে
// সকল প্রয়োজনীয় ডেটা লোড করে এবং ইউজার ইন্টারফেস (UI) সেটআপ করে
const loadAndSetupUI = (result) => {
    // ডেটা ডিস্ট্রাকচারিং এবং ডিফল্ট মান অ্যাসাইনমেন্ট
    const {
        searchHistory: history = [],
        selectedEngine: engine = 'google',
        theme,
        shortcuts: shorcutsData = [],
        backgroundImage,
        backgroundFilter,
        otherApps: appsData = []
    } = result;

    // গ্লোবাল ভেরিয়েবলগুলো আপডেট করা
    searchHistory = history; // <-- সার্চ হিস্ট্রি এখানে লোড হয়
    selectedEngine = engine;
    shortcuts = shorcutsData;
    otherApps = appsData;

    // থিম সেটআপ
    setupTheme(theme);

    // ব্যাকগ্রাউন্ড ইমেজ ও ফিল্টার সেটআপ
    setupBackground(backgroundImage, backgroundFilter);

    // ইঞ্জিন সেটিংস ও UI আপডেট
    updateEngineUI(selectedEngine);

    // শর্টকাট, প্রিসেট ইমেজ এবং অ্যাপস মেনু পপুলেট করা
    if (typeof updateShortcuts === 'function') updateShortcuts();
    if (typeof populatePresetImages === 'function') populatePresetImages();
    if (typeof populateAppsMenu === 'function') populateAppsMenu();
    document.body.style.opacity = '1';

    // ★★★ নতুন উন্নত করা কোড ★★★
    // পেজ লোড হলে মোট সার্চ সংখ্যা আপডেট করুন
    if (typeof updateTotalSearchCountDisplay === 'function') {
        updateTotalSearchCountDisplay();
    }
};

// থিম পরিবর্তন হ্যান্ডেল করে
const setupTheme = (theme) => {
    const themeToggle = document.getElementById('themeToggle');
    if (theme === 'dark') {
        document.body.classList.add('dark');
        if (themeToggle) {
            themeToggle.innerHTML = '<span class="icon">☀️</span> Light Mode';
        }
    } else {
        document.body.classList.remove('dark');
        // প্রয়োজনে এখানে 'light' থিমের ডিফল্ট স্টেট সেট করা যেতে পারে
        if (themeToggle) {
             themeToggle.innerHTML = '<span class="icon">🌙</span> Dark Mode';
        }
    }
};

// ব্যাকগ্রাউন্ড ইমেজ এবং ফিল্টার হ্যান্ডেল করে
const setupBackground = (backgroundImage, backgroundFilter) => {
    if (backgroundImage) {
        document.body.style.backgroundImage = `url(${backgroundImage})`;
    } else {
        document.body.style.backgroundImage = ''; // যদি না থাকে তবে ডিফল্ট
    }

    if (backgroundFilter && backgroundFilter !== 'none') {
        // Remove all existing effect classes
        [...document.body.classList].forEach(cls => {
            if (cls.startsWith('filter-') || cls.startsWith('fx-')) {
                document.body.classList.remove(cls);
            }
        });
        // Add directly — fx- and filter- classes are stored as-is
        document.body.classList.remove('effect-on');
        document.body.classList.add(backgroundFilter);
        document.body.classList.add('effect-on');
    }
};

// সার্চ ইঞ্জিন বাটন ও অ্যাকটিভ ক্লাস আপডেট করে
const updateEngineUI = (currentEngine) => {
    // ইঞ্জিন টেক্সট আপডেট ফাংশন কল করা (যদি বিদ্যমান থাকে)
    if (typeof updateEngineButtonText === 'function') updateEngineButtonText();

    // অ্যাকটিভ ইঞ্জিন ক্লাস সেট করা
    document.querySelectorAll('.engine-item').forEach(item => {
        item.classList.remove('active'); // প্রথমে সব রিমুভ করে ফেলা

        if (item.dataset.engine === currentEngine) {
            item.classList.add('active');
        }
    });
};

// অ্যাপ্লিকেশন ইনিশিয়ালাইজেশন: DOM লোড হওয়ার পর শুরু হয়
document.addEventListener('DOMContentLoaded', () => {
    
    const keysToLoad = [
        'searchHistory',
        'selectedEngine',
        'theme',
        'shortcuts',
        'backgroundImage',
        'backgroundFilter',
        'otherApps'
    ];

    // Chrome Storage API কল, প্রমিস ভিত্তিক ব্যবহার করে আরও আধুনিক করা যেত,
    // তবে মূল কোড না ভাঙার জন্য কলব্যাক ব্যবহার করা হলো।
    chrome.storage.local.get(keysToLoad, loadAndSetupUI);

    // ইভেন্ট লিসেনার যুক্ত করার ফাংশন কল করা
    if (typeof setupEventListeners === 'function') setupEventListeners();
});

function populatePresetImages() {
    const presetGrid = document.getElementById('presetGrid');
    if (!presetGrid || !Array.isArray(presetImages)) return;

    presetGrid.innerHTML = '';

    presetImages.forEach(image => {
        if (!image?.url || !image?.name) return;

        const div = document.createElement('div');
        const imageUrl = image.url;

        div.className = 'preset-item';
        div.style.backgroundImage = `url(${imageUrl})`;
        div.setAttribute('aria-label', `Select ${image.name} background`);
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');

        div.addEventListener('click', () => {
            applyBackgroundImage(imageUrl);
        });

        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                applyBackgroundImage(imageUrl);
            }
        });

        presetGrid.appendChild(div);
    });
}

function populatePresetColors() {
    const colorGrid = document.getElementById('colorGrid');
    if (!colorGrid) return;
    colorGrid.innerHTML = '';

    // Detect any CSS gradient type
    function isGrad(c) {
        return c.startsWith('linear-gradient') || c.startsWith('radial-gradient') ||
               c.startsWith('conic-gradient')  || c.startsWith('repeating-');
    }
    const solids    = presetColors.filter(c => !isGrad(c));
    const gradients = presetColors.filter(c =>  isGrad(c));

    function makeItem(color) {
        const div = document.createElement('div');
        const gradient = isGrad(color);
        div.className = 'color-item' + (gradient ? ' color-item-gradient' : '');
        if (gradient) {
            // Multi-layer or fallback gradients need style.background (not backgroundImage)
            div.style.background = color;
        } else {
            div.style.backgroundColor = color;
        }
        div.setAttribute('aria-label', `Apply background`);
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');
        div.addEventListener('click', () => applyBackgroundColor(color));
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyBackgroundColor(color); }
        });
        return div;
    }

    // Section: Gradients (first)
    const gradLabel = document.createElement('div');
    gradLabel.className = 'tp-color-section-label';
    gradLabel.textContent = 'Gradients';
    colorGrid.appendChild(gradLabel);

    const gradWrap = document.createElement('div');
    gradWrap.className = 'tp-gradient-grid';
    gradients.forEach(c => gradWrap.appendChild(makeItem(c)));
    colorGrid.appendChild(gradWrap);

    // Section: Solid Colors (after)
    const solidLabel = document.createElement('div');
    solidLabel.className = 'tp-color-section-label';
    solidLabel.style.marginTop = '10px';
    solidLabel.textContent = 'Solid Colors';
    colorGrid.appendChild(solidLabel);

    const solidWrap = document.createElement('div');
    solidWrap.className = 'tp-solid-grid';
    solids.forEach(c => solidWrap.appendChild(makeItem(c)));
    colorGrid.appendChild(solidWrap);
}

function applyBackgroundImage(url) {
    document.body.style.backgroundImage = `url(${url})`;
    document.body.style.backgroundColor = '';
    chrome.storage.local.set({ backgroundImage: url, backgroundColor: '' });
    // Do NOT close popup — let user continue browsing
}

function applyBackgroundColor(color) {
    const b = document.body;
    const isGradient = color.startsWith('linear-gradient') ||
                       color.startsWith('radial-gradient') ||
                       color.startsWith('conic-gradient')  ||
                       color.startsWith('repeating-');
    if (isGradient) {
        b.style.background = color;  // handles multi-layer + fallback hex
        b.style.backgroundColor = '';
        chrome.storage.local.set({ backgroundImage: color, backgroundColor: '' });
    } else {
        b.style.backgroundColor = color;
        b.style.backgroundImage = '';
        chrome.storage.local.set({ backgroundColor: color, backgroundImage: '' });
    }
}

function loadSavedBackground() {
    chrome.storage.local.get(['backgroundImage', 'backgroundColor', 'backgroundFilter'], (result) => {
        const b = document.body;
        // Background image or gradient
        if (result.backgroundImage) {
            const img = result.backgroundImage;
            if (img.startsWith('linear-gradient') || img.startsWith('radial-gradient') ||
                img.startsWith('conic-gradient')  || img.startsWith('repeating-')) {
                b.style.background = img;  // handles multi-layer gradients
            } else {
                b.style.backgroundImage = `url(${img})`;
            }
            b.style.backgroundColor = '';
        } else if (result.backgroundColor) {
            b.style.backgroundColor = result.backgroundColor;
            b.style.backgroundImage = '';
        } else {
            b.style.backgroundImage = '';
            b.style.backgroundColor = '';
        }
        // Restore effect class
        if (result.backgroundFilter && result.backgroundFilter !== 'none') {
            [...b.classList].filter(c => c.startsWith('filter-') || c.startsWith('fx-'))
                .forEach(c => b.classList.remove(c));
            b.classList.remove('effect-on');
            b.classList.add(result.backgroundFilter);
            b.classList.add('effect-on');
        }
    });
}




// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSavedBackground(); // Load saved settings on page load
    populatePresetImages();
    populatePresetColors();
    // Init themes tabs on load so reload doesn't break popup
    const _tp = document.getElementById('themesPopup');
    if (_tp) { initThemesTabs(_tp); _tp._tabsInit = true; }

    // Handle file input for custom images
    const backgroundImageInput = document.getElementById('backgroundImageInput');
    if (backgroundImageInput) {
        backgroundImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const url = event.target.result;

                    applyBackgroundImage(url);
                    // Add to preset images
                    presetImages.push({ name: `Custom ${new Date().toLocaleDateString()}`, url });
                    populatePresetImages();
                };
                reader.readAsDataURL(file);
            }
            updateSearchButtonIcon(selectedEngine);
        });
    }

    // Handle remove background
    const removeBackgroundBtn = document.getElementById('removeBackgroundBtn');
    if (removeBackgroundBtn) {
        removeBackgroundBtn.addEventListener('click', () => {
            document.body.style.backgroundImage = '';
            document.body.style.backgroundColor = '';
            chrome.storage.local.set({ backgroundImage: '', backgroundColor: '' });
            const popup = document.getElementById('themesPopup');
            if (popup) popup.classList.add('hidden');
        });
    }

    // ── Gradient grid click handler ──────────────────────────────────────
    const gradGrid = document.getElementById('tpGradientGrid');
    if (gradGrid) {
        gradGrid.addEventListener('click', e => {
            const btn = e.target.closest('.tp-grad-item');
            if (!btn) return;
            const grad = btn.dataset.gradient;
            if (!grad) return;
            // Apply gradient as background
            document.body.style.backgroundImage = grad;
            document.body.style.backgroundColor = '';
            chrome.storage.local.set({ backgroundImage: grad, backgroundColor: '' });
            // Mark active
            gradGrid.querySelectorAll('.tp-grad-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    }

    
});

function populateAppsMenu() {
    const appsList = document.getElementById('appsList');
    const fallbackIcon = 'icons/default.png';

    // Chrome Storage থেকে ডেটা লোড
    chrome.storage.local.get(['otherApps'], (result) => {
        let otherApps = result.otherApps || appsData; // যদি ডেটা না থাকে তাহলে appsData ব্যবহার

        if (!appsList || !Array.isArray(otherApps)) return;

        appsList.innerHTML = '';

        otherApps.forEach((app, index) => {
            if (!app?.url || !app?.name) return;

            const a = document.createElement('a');
            a.className = 'app-item';
            a.href = app.url;
            a.target = '_self';
            a.rel = 'noopener noreferrer';
            a.draggable = true;
            a.dataset.index = index;
            a.setAttribute('aria-label', `Open ${app.name}`);
            a.setAttribute('aria-grabbed', 'false');

            a.innerHTML = `
                <img src="${app.icon || fallbackIcon}" alt="${app.name} icon" class="app-icon">
                <span>${app.name}</span>
            `;

            a.addEventListener('dragstart', (e) => {
                e.target.classList.add('dragging');
                e.target.setAttribute('aria-grabbed', 'true');
                e.dataTransfer.setData('text/plain', index);
            });

            a.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                e.target.setAttribute('aria-grabbed', 'false');
            });

            a.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            a.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const targetItem = e.target.closest('.app-item');
                if (!targetItem) return;

                const toIndex = parseInt(targetItem.dataset.index);
                if (isNaN(fromIndex) || isNaN(toIndex) || fromIndex === toIndex) return;

                const [moved] = otherApps.splice(fromIndex, 1);
                otherApps.splice(toIndex, 0, moved);

                chrome.storage.local.set({ otherApps }, () => {
                    populateAppsMenu(); // আবার রেন্ডার করবে
                });

                // localStorage ব্যবহারের ক্ষেত্রে (বিকল্প):
                // localStorage.setItem('otherApps', JSON.stringify(otherApps));
                // populateAppsMenu();
            });

            appsList.appendChild(a);
        });
    });
}


function createResult(isValid, type, formattedAddress, details, message, confidence) {
    return { isValid, type, formattedAddress, details, message, confidence };
}


function validateAddress(input, options = { strict: false, baseUrl: null }) {
    // Input validation
    if (!input || typeof input !== 'string') {
        return createResult(false, 'invalid', null, null, 'Input is empty or not a string', 0);
    }

    input = input.trim();
    if (!input) {
        return createResult(false, 'invalid', null, null, 'Input is empty after trimming', 0);
    }

    // Stronger sanitization
    const sanitizedInput = sanitizeInput(input);

    // URL normalizer
    function normalizeUrl(url) {
        try {
            const parsed = new URL(url, options.baseUrl || undefined);
            parsed.protocol = parsed.protocol.toLowerCase();
            parsed.hostname = parsed.hostname.toLowerCase();

            if (parsed.search) {
                const params = new URLSearchParams(parsed.search);
                params.sort();
                parsed.search = `?${params.toString()}`;
            }

            // Remove default ports (80 for http, 443 for https)
            if ((parsed.protocol === 'http:' && parsed.port === '80') || 
                (parsed.protocol === 'https:' && parsed.port === '443')) {
                parsed.port = '';
            }

            // Normalize pathname (remove trailing slash unless root)
            if (parsed.pathname !== '/') {
                parsed.pathname = parsed.pathname.replace(/\/+$/, '');
            }

            return parsed.href;
        } catch {
            return url;
        }
    }

    // Validate baseUrl recursively if provided
    if (options.baseUrl) {
        const baseResult = validateAddress(options.baseUrl, { strict: options.strict });
        if (!baseResult.isValid || !['url', 'domain'].includes(baseResult.type)) {
            return createResult(false, 'invalid', null, null, 'Invalid base URL provided', 0.2);
        }
    }

    // Helper: determine type and validate
    const validators = [
        { check: isProtocolBasedUrl, validate: (val) => validateProtocolUrl(val, normalizeUrl) },
        { check: isFileExtension, validate: validateFileExtension },
        { check: isEmail, validate: validateEmail },
        { check: isIpAddress, validate: validateIpAddress },
        { check: isLocalhost, validate: validateLocalhost },
        { check: isDomain, validate: (val) => validateDomain(val, normalizeUrl) },
        { check: (val) => options.baseUrl && isRelativeUrl(val), validate: (val) => validateRelativeUrl(val, options.baseUrl, normalizeUrl) }
    ];

    for (const { check, validate } of validators) {
        try {
            if (check(sanitizedInput, options.strict)) {
                return validate(sanitizedInput);
            }
        } catch (e) {
            console.warn('Validation check failed:', e);
        }
    }

    // Fallback for unknown format
    return createResult(false, 'invalid', null, null, 'Unknown or invalid address format', 0);
}

/**
 * Sanitizes a string for safe address validation
 * - Removes control characters
 * - Trims whitespace
 * - Normalizes Unicode
 * - Optionally escapes potentially dangerous characters
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(str) {
    if (typeof str !== 'string') return '';

    // 1. Trim leading/trailing whitespace
    str = str.trim();

    // 2. Normalize Unicode to NFC form
    str = str.normalize('NFC');

    // 3. Remove control characters (ASCII 0-31, 127, Unicode control chars)
    str = str.replace(/[\p{C}]/gu, '');

    // 4. Remove invisible whitespace (zero-width, non-breaking, etc.)
    str = str.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, '');

    // 5. Optional: remove other potentially dangerous characters for URLs/emails
    str = str.replace(/[<>`"'{}|\\^~]/g, '');

    return str;
}

/**
 * Checks if an input string is a protocol-based URL
 * @param {string} input - The input string
 * @param {boolean} strict - If true, only allows a limited set of protocols
 * @returns {boolean}
 */
function isProtocolBasedUrl(input, strict = false) {
    if (typeof input !== 'string') return false;

    // Match pattern: protocol://...
    const protocolRegex = /^([a-z][a-z0-9+.-]{0,31}):\/\//i;
    const match = input.match(protocolRegex);
    if (!match) return false;

    const protocol = match[1].toLowerCase();

    if (strict) {
        // Allowed protocols in strict mode
        const allowedProtocols = new Set(['http', 'https', 'ftp', 'sftp', 'ws', 'wss']);
        return allowedProtocols.has(protocol);
    }

    // Non-strict: any valid scheme according to RFC 3986
    return true;
}

/**
 * Validates a protocol-based URL and returns structured result
 * @param {string} input - The URL string
 * @param {function} normalizeUrl - Function to normalize URL
 * @returns {AddressResult}
 */
function validateProtocolUrl(input, normalizeUrl) {
    if (typeof input !== 'string') {
        return createResult(false, 'invalid', null, null, 'Input is not a string', 0.3);
    }

    try {
        const url = new URL(input);

        // Normalize protocol and hostname
        const protocol = url.protocol.replace(/:$/, '').toLowerCase();
        const hostname = url.hostname.toLowerCase();

        // Basic hostname check
        if (!hostname || hostname.length > 253) {
            return createResult(false, 'invalid', null, null, 'Invalid hostname', 0.3);
        }

        // Port validation
        let port = null;
        if (url.port) {
            port = parseInt(url.port, 10);
            if (isNaN(port) || port < 1 || port > 65535) {
                return createResult(false, 'invalid', null, null, 'Invalid port number', 0.2);
            }
        }

        // Normalize the full URL
        const normalized = normalizeUrl(input);

        return createResult(
            true,
            'url',
            normalized,
            {
                protocol,
                hostname,
                port,
                pathname: url.pathname || '/',
                search: url.search || null,
                hash: url.hash || null,
            },
            `Valid ${protocol.toUpperCase()} URL`,
            1.0
        );
    } catch (e) {
        return createResult(false, 'invalid', null, null, `Invalid URL format: ${e.message}`, 0.3);
    }
}

/**
 * Checks if input is a valid email address
 * @param {string} input
 * @param {boolean} [strict=false] - If true, perform stricter domain/TLD checks
 * @returns {boolean}
 */
function isEmail(input, strict = false) {
    if (typeof input !== 'string') return false;

    const email = input.replace(/^mailto:/i, '').trim();

    // RFC 5322 simplified regex for common emails
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

    if (!emailPattern.test(email)) return false;

    if (strict) {
        const domainParts = email.split('@')[1].split('.');
        if (domainParts.some(part => part.length === 0)) return false;
        if (domainParts[domainParts.length - 1].length < 2) return false; // TLD min 2 chars
    }

    return true;
}

/**
 * Validates an email and returns structured result
 * @param {string} input
 * @returns {{valid: boolean, type?: string, email?: string, localPart?: string, domainPart?: string}}
 */
function validateEmail(input) {
    if (typeof input !== 'string') {
        return { valid: false };
    }

    const email = input.replace(/^mailto:/i, '').trim();
    const domainIndex = email.indexOf('@');

    if (domainIndex === -1 || !isEmail(email)) {
        return { valid: false };
    }

    const localPart = email.slice(0, domainIndex);
    const domainPart = email.slice(domainIndex + 1).toLowerCase();

    return {
        valid: true,
        type: 'email',
        email: `${localPart}@${domainPart}`,
        localPart,
        domainPart
    };
}

/**
 * Search handler — All inputs go to web search
 * @param {string} query
 */
function handleSearch(query) {
    if (!query || typeof query !== 'string') return;

    const trimmed = query.trim();

    // Optional: detect email (still can use for display/log)
    const emailInfo = validateEmail(trimmed);
    if (emailInfo.valid) {
        console.log('Detected email:', emailInfo.email);
    }

    // Always do web search
    const searchURL = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    window.location.href = searchURL;
}

// আরও স্ট্যান্ডার্ড ও নিখুঁত IPv6 Regex
const IPV6_PATTERN = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/i;
const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

// ব্র্যাকেট সহ [::1] এবং পোর্ট সাপোর্ট করার জন্য রেজেক্স
const LOCALHOST_PATTERN = /^(localhost|127\.0\.0\.1|\[?::1\]?)(?::(\d{1,5}))?$/i;

/**
 * Checks if input is a valid IPv4 or IPv6 address
 * @param {string} input
 * @returns {boolean}
 */
function isIpAddress(input) {
    if (typeof input !== 'string') return false;
    return IPV4_PATTERN.test(input) || IPV6_PATTERN.test(input);
}

/**
 * Validates an IP address and returns structured result
 * @param {string} input
 * @returns {AddressResult}
 */
function validateIpAddress(input) {
    if (!isIpAddress(input)) {
        return createResult(false, 'invalid', null, null, 'Invalid IP address format', 0.2);
    }

    const isIPv6 = input.includes(':');
    // IPv6 হলে URL-এর জন্য ব্র্যাকেট যুক্ত করতে হবে
    const formattedIp = isIPv6 ? `[${input}]` : input;
    const formattedUrl = `http://${formattedIp}`;

    return createResult(
        true,
        'ip',
        formattedUrl,
        { ip: input, type: isIPv6 ? 'ipv6' : 'ipv4' },
        'Valid IP address',
        0.95
    );
}

/**
 * Shared helper to parse localhost input
 * @param {string} input 
 * @returns {{host: string, port: number|null}|null} Returns null if invalid
 */
function parseLocalhostData(input) {
    if (typeof input !== 'string') return null;

    const match = input.match(LOCALHOST_PATTERN);
    if (!match) return null;

    // ব্র্যাকেট থাকলে রিমুভ করে ক্লিন হোস্ট বের করা
    const host = match[1].replace(/[\[\]]/g, ''); 
    const port = match[2] ? parseInt(match[2], 10) : null;

    // পোর্ট ভ্যালিডেশন
    if (port !== null && (port < 1 || port > 65535)) return null;

    return { host, port };
}

/**
 * Checks if input is a valid localhost address
 * Supports: localhost, 127.0.0.1, ::1, [::1] with optional port
 * @param {string} input
 * @returns {boolean}
 */
function isLocalhost(input) {
    return parseLocalhostData(input) !== null;
}

/**
 * Validates a localhost address and returns structured result
 * @param {string} input
 * @returns {AddressResult}
 */
function validateLocalhost(input) {
    const parsedData = parseLocalhostData(input);

    if (!parsedData) {
        return createResult(false, 'invalid', null, null, 'Invalid localhost format or port out of range', 0.4);
    }

    const { host, port } = parsedData;
    
    // URL বানানোর সময় IPv6 (::1) হলে ব্র্যাকেট দিতে হবে
    const formattedHost = (host === '::1') ? `[${host}]` : host;
    const formattedUrl = `http://${formattedHost}${port ? `:${port}` : ''}`;

    return createResult(
        true,
        'localhost',
        formattedUrl,
        { host, port },
        'Valid localhost address',
        1.0
    );
}

// ==========================================
// CONSTANTS & HELPERS
// ==========================================

const FILE_EXTENSIONS = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'heif', 'heic', 'svg', 'pdf', 'eps', 'psd', 'raw', 'ico', 'apng', 'avif', 'exr', 'cdr', 'dds', 'tga', 'mng'],
    video: ['mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', '3g2', 'ts', 'mts', 'm2ts', 'ogv', 'divx', 'f4v', 'rm', 'rmvb'],
    document: ['pdf', 'epub', 'mobi', 'azw', 'azw3', 'kfx', 'djvu', 'fb2', 'lit', 'pdb', 'cbr', 'cbz', 'txt', 'rtf', 'html', 'doc', 'docx', 'xml', 'xps', 'odt'],
    code: ['txt', 'py', 'java', 'c', 'cpp', 'js', 'html', 'css', 'php', 'rb', 'lua', 'r', 'sql', 'xml', 'json', 'yaml', 'csv', 'h', 'm', 'sh', 'bash', 'bat', 'pl', 'swift', 'go', 'kotlin', 'rust', 'cs', 'vb', 'scala', 'ts', 'dart', 'sql', 'jsp', 'tcl', 'f', 'f90', 'm4', 'latex', 'tex', 'makefile', 'dockerfile', 'erlang', 'awk', 'groovy', 'asm', 'lisp', 'jupyter', 'ipynb', 'vhdl', 'verilog', 'hlsl', 'glsl', 'sml', 'ml', 'perl', 'xcode', 'powershell', 'matlab', 'nginx', 'redis', 'json5', 'config', 'html5', 'mvc', 'razor', 'haxe', 'ant', 'gradle', 'nodejs', 'reactjs', 'vuejs', 'angular', 'dsl', 'shell', 'bashrc', 'bash_profile', 'gitignore', 'markdown', 'md', 'jsx', 'vim', 'emacs', 'julia', 'clojure', 'ocaml', 'tsconfig', 'redux', 'django', 'flask', 'express', 'socketio', 'jsonld', 'apispec', 'protobuf', 'swagger', 'openapi', 'graphql', 'xaml', 'gds', 'fsharp', 'turing', 'hcl', 'qlik', 'rex'],
    audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'aiff', 'alac', 'mid', 'midi', 'amr', 'ape', 'opus'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'dmg', 'cab', 'jar', 'war', 'ear']
};

const WEB_TYPES = new Set(['url', 'domain', 'ip', 'localhost', 'email']);
const FILE_TYPES = new Set(Object.keys(FILE_EXTENSIONS));

/**
 * Helper to determine the category of a file extension
 * @param {string} extension 
 * @returns {string} - Category name or 'unknown'
 */
function getFileCategory(extension) {
    for (const [category, extensions] of Object.entries(FILE_EXTENSIONS)) {
        if (extensions.includes(extension)) return category;
    }
    return 'unknown';
}

// ==========================================
// CORE FUNCTIONS
// ==========================================

/**
 * Checks if input is a valid domain (supports punycode/IDN)
 * @param {string} input
 * @returns {boolean}
 */
function isDomain(input) {
    if (typeof input !== 'string') return false;
    input = input.trim().toLowerCase();

    // MUST have at least one dot to be a real domain.
    // This prevents single search words like "hello", "python", "weather"
    // from matching as domains and becoming https://hello/ etc.
    if (!input.includes('.')) return false;

    // Strip path/query/hash/port to get bare hostname for TLD check
    const hostOnly = input.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
    const parts = hostOnly.split('.');
    if (parts.length < 2) return false;
    const tld = parts[parts.length - 1];
    if (!/^[a-z]{2,24}$/.test(tld)) return false;

    // Pattern requires at least one dot (+ not *)
    const DOMAIN_PATTERN = /^((?:xn--[a-z0-9-]+|[a-z0-9-]{1,63})(?:\.(?:xn--[a-z0-9-]+|[a-z0-9-]{1,63}))+)(?::(\d{1,5}))?(\/[^\s]*)?(\?[^\s]*)?(#[^\s]*)?$/i;
    const match = input.match(DOMAIN_PATTERN);
    if (!match) return false;

    const port = match[2] ? parseInt(match[2], 10) : null;
    if (port && (port < 1 || port > 65535)) return false;

    return true;
}

/**
 * Checks if the input has a valid file extension
 * @param {string} input
 * @returns {boolean}
 */
function isFileExtension(input) {
    if (typeof input !== 'string' || !input.includes('.')) return false;
    
    const extension = input.split('.').pop().toLowerCase();
    return getFileCategory(extension) !== 'unknown';
}

/**
 * Validates an input with a recognized file extension
 * @param {string} input
 * @returns {AddressResult}
 */
function validateFileExtension(input) {
    if (typeof input !== 'string' || !input.includes('.')) {
        return createResult(false, 'unknown', null, null, 'No file extension found', 0.1);
    }

    const extension = input.split('.').pop().toLowerCase();
    const type = getFileCategory(extension);
    
    const protocol = type !== 'unknown' ? type : 'file';
    const formatted = `${protocol}://${input}`;
    
    return createResult(
        true,
        type,
        formatted,
        { path: input, extension, protocol },
        `Valid ${type} file with ${extension} extension`,
        0.9
    );
}

function validateDomain(input, normalizeUrl) {
    try {
        const testUrl = `https://${input}`;
        const url = new URL(testUrl);
        const normalized = normalizeUrl(testUrl);
        
        return createResult(
            true,
            'domain',
            normalized,
            { hostname: url.hostname, pathname: url.pathname },
            'Valid domain name',
            0.98
        );
    } catch {
        return createResult(false, 'invalid', null, null, 'Invalid domain format', 0.5);
    }
}

/**
 * Validates if the string is a relative URL (e.g., /path, ./path, ../path)
 * @param {string} input 
 * @returns {boolean}
 */
function isRelativeUrl(input) {
    if (typeof input !== 'string') return false;
    // রিলেটিভ পাথ হতে পারে /, ./, ../ দিয়ে শুরু অথবা শুধু টেক্সট
    // তবে নিশ্চিত করতে হবে এটি কোনো অ্যাবসলিউট URL (যেমন http://) না হয়।
    try {
        new URL(input); 
        return false; // যদি URL তৈরি হয়, তার মানে এটি Absolute URL, Relative নয়।
    } catch {
        // যদি এরর দেয়, তবে এটি Relative URL হওয়ার সম্ভাবনা রয়েছে
        return /^(?:\/|\.\/|\.\.\/|[a-zA-Z0-9-._~]+)/.test(input);
    }
}

function validateRelativeUrl(input, baseUrl, normalizeUrl) {
    try {
        const base = new URL(baseUrl);
        const resolved = new URL(input, base);
        const normalized = normalizeUrl(resolved.href);
        
        return createResult(
            true,
            'url',
            normalized,
            {
                protocol: resolved.protocol.replace(/:$/, ''),
                hostname: resolved.hostname,
                pathname: resolved.pathname,
                search: resolved.search || null,
                hash: resolved.hash || null
            },
            'Valid relative URL resolved with base',
            0.9
        );
    } catch {
        return createResult(false, 'invalid', null, null, 'Invalid relative URL', 0.3);
    }
}

/**
 * Checks if input is a valid URL
 * @param {string} input
 * @param {Object} [options={}]
 * @returns {boolean}
 */
function isValidURL(input, options = {}) {
    if (typeof input !== 'string' || !input.trim()) return false;
    
    const result = validateAddress(input.trim(), options);
    // WEB_TYPES এবং FILE_TYPES দুটো সেট এক করে চেক করা হচ্ছে
    return result.isValid && (WEB_TYPES.has(result.type) || FILE_TYPES.has(result.type));
}

/**
 * Determines if input is a valid web address or file path
 * @param {string} input
 * @param {Object} [options={}]
 * @returns {string|boolean} - 'web', 'file', or false
 */
function isValidURLOrLocalPath(input, options = {}) {
    if (typeof input !== 'string' || !input.trim()) return false;
    
    const result = validateAddress(input.trim(), options);
    if (!result.isValid) return false;

    if (WEB_TYPES.has(result.type)) return 'web';
    if (FILE_TYPES.has(result.type)) return 'file';

    return false;
}

/**
 * Formats a web address or file path
 * @param {string} input - Address to format
 * @param {string} type - Expected type ('web' or 'file')
 * @param {Object} [options] - Optional configuration
 * @returns {string|null} - Formatted address or null
 */
function formatURLOrLocalPath(input, type, options = {}) {
    if (!input || !type) return null;

    const result = validateAddress(input, options);
    if (!result.isValid) return null;

    if (type === 'web' && ['url', 'domain', 'ip', 'localhost', 'email'].includes(result.type)) {
        return result.formattedAddress;
    }
    
    if (type === 'file' && ['image', 'video', 'document', 'code', 'audio', 'archive'].includes(result.type)) {
        return result.formattedAddress;
    }

    return null;
}

/**
 * Formats a URL specifically
 * @param {string} url - URL to format
 * @param {Object} [options] - Optional configuration
 * @returns {string|null} - Formatted URL or null
 */
function formatURL(url, options = {}) {
    if (!url) return null;

    const result = validateAddress(url, options);
    if (result.isValid && ['url', 'domain', 'ip', 'localhost', 'image', 'video', 'document', 'code', 'audio', 'archive'].includes(result.type)) {
        return result.formattedAddress;
    }

    return null;
}

/**
 * Runs comprehensive test cases
 */
function runTests() {
    const testCases = [
        // URLs
        'http://example.com',
        'https://sub.domain.com/path?query=1#hash',
        'ftp://files.server.net:21',
        'ws://realtime.app:8080',
        'wss://secure.app',
        'app://myapp.local',
        'data:text/plain,hello',
        'git://github.com/user/repo',
       
    ];

    console.log('======== Address Validation Tests ========');
    testCases.forEach(test => {
        const options = test.startsWith('/') ? { baseUrl: 'https://example.com', strict: false } : { strict: false };
        const result = validateAddress(test, options);
        console.log(`"${test}": ${result.isValid ? '✓' : '✗'} (${result.type}, confidence: ${result.confidence}) - ${result.message}`);
        if (result.formattedAddress) {
            console.log(`  Formatted: ${result.formattedAddress}`);
        }
        if (result.details) {
            console.log(`  Details: ${JSON.stringify(result.details)}`);
        }
    });

    console.log('\n======== URL-Only Tests ========');
    testCases.forEach(test => {
        const options = test.startsWith('/') ? { baseUrl: 'https://example.com', strict: false } : { strict: false };
        console.log(`"${test}": ${isValidURL(test, options) ? '✓ Valid URL' : '✗ Not a URL'}`);
    });

    console.log('\n======== Web Address Tests ========');
    testCases.forEach(test => {
        const options = test.startsWith('/') ? { baseUrl: 'https://example.com', strict: false } : { strict: false };
        const type = isValidURLOrLocalPath(test, options);
        console.log(`"${test}": ${type ? type : '✗ Invalid'}`);
    });

    console.log('\n======== Strict Mode Tests ========');
    testCases.forEach(test => {
        const options = test.startsWith('/') ? { baseUrl: 'https://example.com', strict: true } : { strict: true };
        const result = validateAddress(test, options);
        console.log(`"${test}": ${result.isValid ? '✓' : '✗'} (${result.type}, confidence: ${result.confidence}) - ${result.message}`);
    });
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    runTests();
}

// Export for module usage
module.exports = {
    validateAddress,
    isValidURL,
    isValidURLOrLocalPath,
    formatURLOrLocalPath,
    formatURL,
    isFileExtension,
    validateFileExtension
};

function compressImage(file, callback, quality = 0.7) {
    // Check if file exists and is valid
    if (!file || !(file instanceof File)) {
        console.error('Invalid file object provided.');
        return;
    }
    
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
        console.error('Only image files are allowed.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function (e) {
        const img = new Image();
        
        // Set a timeout for image loading
        const imageLoadTimeout = setTimeout(() => {
            console.error('Image loading timed out.');
            if (typeof callback === 'function') {
                callback(null, 'Image loading timed out');
            }
        }, 30000); // 30 seconds timeout
        
        img.onload = function () {
            clearTimeout(imageLoadTimeout);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const maxWidth = 1920;
            const maxHeight = 1080;
            let width = img.width;
            let height = img.height;
            
            // Maintain aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            if (!canvas.toBlob) {
                console.error('Your browser does not support canvas.toBlob.');
                if (typeof callback === 'function') {
                    callback(null, 'Browser not supported');
                }
                return;
            }
            
            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error('Image compression failed.');
                    if (typeof callback === 'function') {
                        callback(null, 'Compression failed');
                    }
                    return;
                }
                
                // Compare sizes to ensure compression is effective
                console.log(`Original size: ${file.size} bytes, Compressed size: ${blob.size} bytes`);
                if (blob.size >= file.size) {
                    console.warn('Compression did not reduce file size. Using original file.');
                }
                
                const compressedReader = new FileReader();
                compressedReader.onload = function () {
                    if (typeof callback === 'function') {
                        callback(compressedReader.result, null);
                    }
                };
                
                compressedReader.onerror = function (error) {
                    console.error('Failed to read compressed image:', error);
                    if (typeof callback === 'function') {
                        callback(null, 'Failed to read compressed image');
                    }
                };
                
                compressedReader.readAsDataURL(blob);
            }, file.type, quality);
        };
        
        img.onerror = function (error) {
            clearTimeout(imageLoadTimeout);
            console.error('Failed to load image:', error);
            if (typeof callback === 'function') {
                callback(null, 'Failed to load image');
            }
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = function (error) {
        console.error('File reading failed:', error);
        if (typeof callback === 'function') {
            callback(null, 'File reading failed');
        }
    };
    
    reader.readAsDataURL(file);
}

/**
 * 🚀 DuckDuckGo থেকে ওয়েবের সার্চ সাজেশন আনে।
 *
 * @param {string} query - ব্যবহারকারীর সার্চ কোয়েরি।
 * @param {AbortSignal} [signal] - ঐচ্ছিক: অনুরোধ বাতিল করার জন্য সিগন্যাল।
 * @returns {Promise<string[]>} - সাজেশনের একটি অ্যারে (লিস্ট) পাঠায়, ব্যর্থ হলে একটি খালি অ্যারে।
 */
async function fetchWebSuggestions(query, signal) {
    // 1. ইনপুট যাচাইকরণ: ট্রিমিং ও দ্রুত রিটার্ন
    const trimmedQuery = query ? String(query).trim() : '';
    if (!trimmedQuery) {
        return [];
    }

    // 2. URL গঠন: template literal এবং encodeURIComponent
    const url = `https://ac.duckduckgo.com/ac/?q=${encodeURIComponent(trimmedQuery)}&type=list`;

    try {
        // 3. fetch অনুরোধ: JSON বডি আশা করা হচ্ছে
        const response = await fetch(url, {
            signal: signal,
            method: 'GET',
            headers: {
                // এটি API কে বোঝাতে সাহায্য করে যে আমরা JSON আশা করছি
                'Accept': 'application/json, text/plain, */*',
                // প্রয়োজনে ক্যাশিং নিয়ন্ত্রণ করা যেতে পারে
                'Cache-Control': 'no-cache',
            }
        });

        // 4. HTTP স্ট্যাটাস চেক
        if (!response.ok) {
            // ত্রুটির জন্য একটি কাস্টম বার্তা তৈরি করা
            throw new Error(`DuckDuckGo API error! Status: ${response.status} ${response.statusText}`);
        }

        // 5. JSON পার্সিং
        // সরাসরি .json() ব্যবহার করা উচিত, এটি .text() এবং JSON.parse() এর চেয়ে ভালো
        const data = await response.json();
        
        // 6. ডেটা স্ট্রাকচার যাচাইকরণ
        // DuckDuckGo API সাধারণত একটি অ্যারে দেয়, যার দ্বিতীয় উপাদানটি হলো সাজেশনের তালিকা
        if (Array.isArray(data) && Array.isArray(data[1])) {
            // ডেটা [কোয়েরি, সাজেশন লিস্ট] এই ফর্ম্যাটে থাকে
            return data[1].map(suggestion => String(suggestion)); // নিশ্চিত করার জন্য স্ট্রিং-এ রূপান্তর
        }
        
        // অপ্রত্যাশিত ডেটা স্ট্রাকচার
        console.warn('ওয়েব সাজেশন পেল, কিন্তু ডেটা স্ট্রাকচার অপ্রত্যাশিত:', data);
        return [];

    } catch (error) {
        // 7. ত্রুটি হ্যান্ডলিং
        if (error.name === 'AbortError') {
            // টাইপিং-এর সময় অনুরোধ বাতিল হলে নীরব থাকুন
            // console.log('সাজেশন অনুরোধ বাতিল করা হয়েছে।'); // ডিবাগিং এর জন্য রাখা যেতে পারে
        } else {
            // অন্যান্য ত্রুটি, যেমন নেটওয়ার্ক বা পার্সিং ত্রুটি হলে লগ করুন
            console.error('⚠️ ওয়েব সাজেশন আনতে সমস্যা হয়েছে:', error.message);
        }
        return []; // ব্যর্থতার ক্ষেত্রে সবসময় একটি খালি অ্যারে রিটার্ন করা উচিত
    }
}


function search() {
    const input = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    // ১. 'query' let
    let query = input.value.trim(); 
    
    // ১. নতুন ভেরিয়েবল: এটি হিস্ট্রিতে সেভ করার জন্য ব্যবহৃত হবে
    let queryForHistory = input.value.trim(); 
    
    // মূল অপরিবর্তিত কোয়েরি, শুধুমাত্র @history: কমান্ড হ্যান্ডেল করার জন্য
    const originalQueryForHistory = input.value.trim(); 

    // Make sure selectedEngine is defined
    if (typeof selectedEngine === 'undefined') {
        console.error('selectedEngine is not defined');
        alert('Search configuration is incomplete. Please select a search engine.');
        return;
    }

    let engineForSearch = selectedEngine; 

    // --- ★★★ নতুন @engine: কমান্ড লজিক (শুরু) ★★★
    const engineCommandRegex = /^@([a-zA-Z0-9_-]+):(.*)$/;
    const commandMatch = query.match(engineCommandRegex);

    if (commandMatch) {
        const commandEngine = commandMatch[1].toLowerCase().trim(); 
        const commandQuery = commandMatch[2].trim(); 
        
        const validEngines = [
            'google', 
            'bing', 
            'duckduckgo',
             'yahoo', 
             'yandex', 
             'youtube',
            'chatgpt', 
            'grok',
             'perplexity',
              'you',
               'mistral',
               'ecosia',
               'tiktok',
               'kagi',
               'qwant',
               'brave',
               'startpage',
               'presearch',
               'aol',
               'facebook',
               'archive',
               'rumble',
               'dailymotion',
               'github',
               'pinterest',
               'x',
               'reddit',
               'threads',
               'copilot',
               'iask',
               'qwen',
               'wikipedia',
               'felo'
        ];

        if (validEngines.includes(commandEngine)) {
            if (!commandQuery) {
                input.value = `@${commandEngine}:`;
                input.focus(); 
                return; 
            }
            
            // ★★★ পরিবর্তন: এখানে queryForHistory আপডেট করা হলো ★★★
            queryForHistory = commandQuery; 
            query = commandQuery; 
            engineForSearch = commandEngine; 
        }
    }
    // --- ★★★ নতুন @engine: কমান্ড লজিক (শেষ) ★★★

    // খালি কোয়েরি চেক (কমান্ড বাদে)
    if (!query && !originalQueryForHistory.startsWith('@')) { 
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 1000);
        input.focus();
        return;
    }

    searchButton.classList.add('loading');
    
    // --- ★★★ @history: লজিক (originalQueryForHistory ব্যবহার করে) ★★★ ---
    if (originalQueryForHistory.startsWith('@history:')) {
        const historyQuery = originalQueryForHistory.substring(9).trim(); 

        // কোয়েরিটি সার্চ হিস্টরিতে সেভ করা
        if (typeof searchHistory === 'undefined') {
            window.searchHistory = [];
        }
        // @history কমান্ডটি হিস্ট্রিতে সেভ করা হচ্ছে
        if (typeof MAX_HISTORY_QUERY_LENGTH !== 'undefined' && originalQueryForHistory.length <= MAX_HISTORY_QUERY_LENGTH) {
            const existingIndex = searchHistory.findIndex(item => item.query.toLowerCase() === originalQueryForHistory.toLowerCase());
            if (existingIndex >= 0) {
                const [item] = searchHistory.splice(existingIndex, 1);
                item.count++;
                searchHistory.unshift(item);
            } else {
                searchHistory.unshift({ query: originalQueryForHistory, count: 1 });
            }
// সরাসরি সেভ না করে আগে লেটেস্ট হিস্ট্রিটা নিয়ে নিন
chrome.storage.local.get(['searchHistory'], (result) => {
    let currentHistory = result.searchHistory || [];
    const _eng1 = ((engineForSearch||selectedEngine||'google'));
    const _engN1 = normalizeEngineName(_eng1);
    const _ts1 = Date.now();
    // নতুন সার্চটি চেক করে যুক্ত করুন
    const existingIndex = currentHistory.findIndex(item => item.query === queryForHistory);
    if (existingIndex >= 0) {
        const [item] = currentHistory.splice(existingIndex, 1);
        item.count++;
        item.engine = _engN1; item.timestamp = _ts1;
        item.engines = item.engines||{}; item.engines[_engN1]=(item.engines[_engN1]||0)+1;
        currentHistory.unshift(item);
    } else {
        const _em1={}; _em1[_engN1]=1;
        currentHistory.unshift({ query: queryForHistory, count: 1, engine: _engN1, timestamp: _ts1, engines: _em1 });
        if (currentHistory.length > 1000) currentHistory.pop();
    }

    // এবার সেভ করুন এবং সাথে ডাবল কাউন্ট রোখার জন্য ns_ext ট্যাগ যুক্ত করে রিডাইরেক্ট করুন
    chrome.storage.local.set({ searchHistory: currentHistory }, () => {
        let finalUrl = searchEngines[engineForSearch];
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'ns_ext=1';
        window.location.href = finalUrl;
    });
});
            // ★★★ নতুন যোগ করা লাইন (১ম স্থান) ★★★
            if (typeof updateTotalSearchCountDisplay === 'function') {
                updateTotalSearchCountDisplay();
            }
        }

        if (historyQuery) {
            navigator.clipboard.writeText(historyQuery).then(() => {
                alert(`'${historyQuery}' ক্লিপবোর্ডে কপি করা হয়েছে।\nএখন আপনি হিস্ট্রি পেজে এটি পেস্ট (Ctrl+V) করতে পারেন।`);
                window.location.href = 'chrome://history';
            }).catch(err => {
                console.error('Clipboard write failed: ', err);
                alert('ক্রোম হিস্ট্রি খোলা হচ্ছে। অনুগ্রহ করে ম্যানুয়ালি সার্চ করুন।');
                window.location.href = 'chrome://history';
            });
        } else {
            window.location.href = 'chrome://history';
        }
        
        return; 
    }
    // --- ★★★ @history: লজিক এখানে শেষ ★★★ ---

    try {
        if (typeof isValidURLOrLocalPath !== 'function' || typeof formatURLOrLocalPath !== 'function') {
            console.error('Utility functions are missing.');
            alert('Search functionality is not available.');
            return;
        }

        const urlType = isValidURLOrLocalPath(query);

        if (typeof searchHistory === 'undefined') {
            window.searchHistory = [];
        }

        // Update search history if not a URL
        if (!urlType) {
            // ★★★ পরিবর্তন: এখানে 'queryForHistory' সেভ করা হচ্ছে ★★★
            if (typeof MAX_HISTORY_QUERY_LENGTH !== 'undefined' && queryForHistory.length <= MAX_HISTORY_QUERY_LENGTH) {
                
                const existingIndex = searchHistory.findIndex(item => item.query.toLowerCase() === queryForHistory.toLowerCase());
                
                if (existingIndex >= 0) {
                    const [item] = searchHistory.splice(existingIndex, 1);
                    item.count++;
                    searchHistory.unshift(item);
                } else {
                    searchHistory.unshift({ query: queryForHistory, count: 1 });
                    if (searchHistory.length > 99999910) searchHistory.pop();
                }
                
// সরাসরি সেভ না করে আগে লেটেস্ট হিস্ট্রিটা নিয়ে নিন
chrome.storage.local.get(['searchHistory'], (result) => {
    let currentHistory = result.searchHistory || [];
    const _eng2 = ((engineForSearch||selectedEngine||'google'));
    const _engN2 = normalizeEngineName(_eng2);
    const _ts2 = Date.now();
    // নতুন সার্চটি চেক করে যুক্ত করুন
    const existingIndex = currentHistory.findIndex(item => item.query === queryForHistory);
    if (existingIndex >= 0) {
        const [item] = currentHistory.splice(existingIndex, 1);
        item.count++;
        item.engine = _engN2; item.timestamp = _ts2;
        item.engines = item.engines||{}; item.engines[_engN2]=(item.engines[_engN2]||0)+1;
        currentHistory.unshift(item);
    } else {
        const _em2={}; _em2[_engN2]=1;
        currentHistory.unshift({ query: queryForHistory, count: 1, engine: _engN2, timestamp: _ts2, engines: _em2 });
        if (currentHistory.length > 1000) currentHistory.pop();
    }

    // এবার সেভ করুন এবং সাথে ডাবল কাউন্ট রোখার জন্য ns_ext ট্যাগ যুক্ত করে রিডাইরেক্ট করুন
    chrome.storage.local.set({ searchHistory: currentHistory }, () => {
        let finalUrl = searchEngines[engineForSearch];
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'ns_ext=1';
        window.location.href = finalUrl;
    });
});
                // ★★★ নতুন যোগ করা লাইন (২য় স্থান) ★★★
                if (typeof updateTotalSearchCountDisplay === 'function') {
                    updateTotalSearchCountDisplay();
                }
            } 
        }

       const searchEngines = {

    /* =========================
       General Search Engines
    ========================= */
    google:      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    bing:        `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    duckduckgo:  `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    yahoo:       `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
    ecosia:      `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`,
    qwant:       `https://www.qwant.com/?q=${encodeURIComponent(query)}`,
    brave:       `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
    startpage:   `https://www.startpage.com/do/search?q=${encodeURIComponent(query)}`,
    presearch:   `https://presearch.com/search?q=${encodeURIComponent(query)}`,
    aol:         `https://search.aol.com/aol/search?q=${encodeURIComponent(query)}`,
    yandex:      `https://yandex.com/search/?text=${encodeURIComponent(query)}`,
    kagi:        `https://kagi.com/search?q=${encodeURIComponent(query)}`,
    archive:     `https://archive.org/search?query=${encodeURIComponent(query)}`,


    /* =========================
       Video Platforms
    ========================= */
    youtube:     `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    rumble:      `https://rumble.com/search/all?q=${encodeURIComponent(query)}`,
    dailymotion: `https://www.dailymotion.com/search/${encodeURIComponent(query)}`,
    tiktok:      `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`,
    bilibili:    `https://www.bilibili.tv/en/search-result?q=${encodeURIComponent(query)}`,
    vimeo:       `https://vimeo.com/search?q=${encodeURIComponent(query)}`,
    rutube:      `https://rutube.ru/search/?query=${encodeURIComponent(query)}`,


    /* =========================
       Social / Community
    ========================= */
    facebook:    `https://www.facebook.com/search/top?q=${encodeURIComponent(query)}`,
    x:           `https://x.com/search?q=${encodeURIComponent(query)}`,
    threads:     `https://www.threads.com/search?q=${encodeURIComponent(query)}&serp_type=default`,
    reddit:      `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
    pinterest:   `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
    twitch:      `https://www.twitch.tv/search?term=${encodeURIComponent(query)}`,
    github:      `https://github.com/search?q=${encodeURIComponent(query)}`,
    sigma:       `https://app.sigmabrowser.com/chat/search?q=${encodeURIComponent(query)}`,


    /* =========================
       AI / Chat Search
    ========================= */
    chatgpt:     `https://chatgpt.com/?q=${encodeURIComponent(query)}`,
    copilot:     `https://www.bing.com/copilotsearch?q=${encodeURIComponent(query)}`,
    grok:        `https://grok.com/?q=${encodeURIComponent(query)}`,
    perplexity:  `https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`,
    you:         `https://you.com/search?q=${encodeURIComponent(query)}&fromSearchBar=true`,
    mistral:     `https://chat.mistral.ai/chat?q=${encodeURIComponent(query)}`,
    qwen:        `https://chat.qwen.ai/?text=${encodeURIComponent(query)}`,
    blackbox:    `https://www.blackbox.ai/?q=${encodeURIComponent(query)}`,
    scira:       `https://scira.ai/?q=${encodeURIComponent(query)}`,
    felo:        `https://felo.ai/en/search?q=${encodeURIComponent(query)}`,
    yep:         `https://yep.com/chat/?q=${encodeURIComponent(query)}`,
    iask:        `https://iask.ai/?q=${encodeURIComponent(query)}`,


    /* =========================
       Knowledge / Reference
    ========================= */
    wikipedia:   `https://wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`

};

        if (urlType === 'web') {
            window.location.href = formatURLOrLocalPath(query, urlType);
            return;
        } 

        if (!searchEngines[engineForSearch]) {
            console.warn('Invalid search engine:', engineForSearch);
            alert(`The selected search engine "${engineForSearch}" is not available.`);
            return;
        }

        // ★ নতুন লজিক: URL-এর শেষে আমাদের এক্সটেনশনের সিগনেচার (ns_ext=1) জুড়ে দেওয়া হচ্ছে
        let finalUrl = searchEngines[engineForSearch];
        if (finalUrl.includes('?')) {
            finalUrl += '&ns_ext=1';
        } else {
            finalUrl += '?ns_ext=1';
        }

        window.location.href = finalUrl; 

        input.value = '';
        
        if (typeof hideHistory === 'function') {
            hideHistory();
        }
    } catch (e) {
        console.error('Search Error:', e);
        alert('Something went wrong. Please try again.');
    } finally {
        searchButton.classList.remove('loading');
    }
}

/**
 * হেল্পার ফাংশন: সাজেশন লিস্ট রেন্ডার করে।
 * ★★★ এটি এখন 'engine' টাইপের জন্য লোগো রেন্ডার করতে পারে। ★★★
 */
function renderList(items, normalizedFilter, historyList) {
    historyList.innerHTML = '';
    if (!Array.isArray(searchHistory)) searchHistory = [];
    
    const dropdown = document.getElementById('historyDropdown');
    const hasFilter = !!normalizedFilter.trim();
    
    if (dropdown) {
        dropdown.setAttribute('aria-expanded', 'true');
    }

    if (items.length === 0) {
        const li = document.createElement('li');
        li.className = 'history-empty';
        li.setAttribute('aria-hidden', 'true');
        li.setAttribute('tabindex', '-1'); // focusable করা হলো, blur চেক সঠিক হবে

        if (hasFilter) {
            li.textContent = `No results found for "`;
            const queryStrong = document.createElement('strong');
            queryStrong.textContent = normalizedFilter;
            li.appendChild(queryStrong);
            li.appendChild(document.createTextNode('"'));
        } else {
            li.textContent = 'No recent searches..';
        }

        // ক্লিক করলে dropdown যাতে না লোকায়
        li.addEventListener('mousedown', function(e) {
            e.preventDefault(); // blur fire হওয়া আটকাবে
        });

        historyList.appendChild(li);
        
    } else {
        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', index === activeHistoryIndex ? 'true' : 'false');
            li.id = `suggestion-${index}`;

            const historyIcon = document.createElement('span');
            historyIcon.className = 'history-icon'; // এই ক্লাসটি সিএসএস-এর জন্য গুরুত্বপূর্ণ
            historyIcon.setAttribute('aria-hidden', 'true');
            
            // ★★★ আইকন পরিবর্তন (লোগো সহ) ★★★
            if (item.type === 'engine' && item.icon) {
                // ইঞ্জিন টাইপ এবং আইকন পাথ থাকলে, img ট্যাগ তৈরি করুন
                historyIcon.innerHTML = `<img src="${item.icon}" alt="${item.name}" class="suggestion-icon-logo">`;
                historyIcon.classList.add('suggestion-logo'); // CSS-এর জন্য বিশেষ ক্লাস
            } else if (item.type === 'history') {
                historyIcon.textContent = '↻';
            } else if (item.type === 'web') {
                historyIcon.textContent = '🔎︎';
            } else if (item.type === 'engine') {
                historyIcon.textContent = '⚡'; // যদি কোনো কারণে লোগো না পায় (ফলব্যাক)
            }
            // ★★★ লজিক শেষ ★★★

            // আপনার বর্তমান কোড:
const querySpan = document.createElement('span');
querySpan.className = 'query';
querySpan.textContent = item.query;

li.appendChild(historyIcon);
li.appendChild(querySpan);

// ★★★ নতুন লজিক: রাইট-ক্লিক করে সার্চ বারে লেখা আনা ★★★
li.addEventListener('contextmenu', function(e) {
    e.preventDefault(); // রাইট-ক্লিক মেনু আসা বন্ধ করবে
    
    const searchInput = document.getElementById('searchInput');
    const suggestionsContainer = document.getElementById('suggestions-container'); // আপনার কন্টেইনারের আইডি অনুযায়ী দিন

    if (searchInput) {
        searchInput.value = item.query; // লেখাটি সার্চ বারে আনবে
        
        // ১. সার্চ বারে ফোকাস ফিরিয়ে আনা
        searchInput.focus();

        // ২. কার্সরটিকে লেখার শেষে নিয়ে যাওয়া (গুগলের মতো)
        const len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);

        // ৩. ক্লিয়ার বাটন থাকলে সেটি আপডেট করা
        if (typeof toggleClearButton === 'function') {
            toggleClearButton();
        }

        // ৪. গুরুত্বপূর্ণ: হিস্ট্রি লিস্ট যাতে বন্ধ না হয়, তাই সেটি আবার রেন্ডার বা শো করা
        // আপনার কোডে হিস্ট্রি দেখানোর জন্য যে ফাংশনটি আছে (যেমন: showHistory) সেটি কল করুন
        if (typeof showHistory === 'function') {
            showHistory(); 
        } else if (typeof updateSuggestions === 'function') {
            // যদি আপনি সাজেশন এপিআই ব্যবহার করেন তবে সেটি রিফ্রেশ করুন
            updateSuggestions(item.query);
        }
    }
});

            // ... (বাকি কোড: হিস্ট্রি আইটেমের জন্য রিমুভ বাটন এবং ক্লিক লজিক অপরিবর্তিত) ...
            
            // শুধু 'history' টাইপের জন্য রিমুভ বাটন এবং কাউন্ট দেখান
            if (item.type === 'history') {
                const countSpan = document.createElement('span');
                countSpan.className = 'count';
                countSpan.setAttribute('aria-label', 'Search count');
                countSpan.textContent = `${item.count}x`;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.setAttribute('aria-label', `Remove ${item.query}`);
                removeBtn.textContent = '✕';
                
                li.appendChild(countSpan);
                li.appendChild(removeBtn);

                removeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    try {
                        if (typeof removeHistoryItem === 'function') removeHistoryItem(item.query);
                    } catch (error) {
                        console.error('Error removing history item:', error);
                    }
                });
            }
            
            // ক্লিক লজিক (অপরিবর্তিত)
            li.addEventListener('click', function(e) {
                if (e.target.closest('.remove-btn')) return;
                
                const searchInput = document.getElementById('searchInput');
                if (!searchInput) return;

                searchInput.value = item.query; 

                if (item.type === 'engine') {
                    try {
                        // ১. ইঞ্জিন আপডেট এবং ক্লিন ভ্যালু সংগ্রহ
                        // ইনপুটে একটি স্পেস যোগ করে আপডেট করছি যাতে প্রিফিক্স সঠিকভাবে ডিটেক্ট হয়
                        const currentInput = searchInput.value + ' ';
                        const cleanValue = updateSearchEngineFromInput(currentInput);
                        
                        // ২. ইনপুট বক্সে ক্লিন টেক্সট সেট করা (প্রিফিক্স ছাড়া)
                        searchInput.value = cleanValue;
                        
                        // ৩. ইউজার ইন্টারফেস রিফ্রেশ (Async রাখা হয়েছে স্মুথনেসের জন্য)
                        requestAnimationFrame(() => {
                            // সাজেশন্স আপডেট করা
                            if (typeof updateSuggestions === 'function') {
                                updateSuggestions(cleanValue);
                            }
                            
                            // ড্রপডাউনটি যদি ইনভিজিবল থাকে তবে সেটি ভিজিবল রাখা
                            const historyDropdown = document.getElementById('historyDropdown');
                            if (historyDropdown) {
                                historyDropdown.classList.remove('hidden');
                            }
                            
                            // ইনপুট বক্সে ফোকাস ফিরিয়ে আনা
                            searchInput.focus();
                        });

                    } catch (error) {
                        console.error("Engine selection error:", error);
                        // এরর হলেও যাতে ফোকাস না হারায়
                        searchInput.focus();
                    }

                } else {
                    // ... আপনার বাকি কোড (সাধারণ সাজেশনে ক্লিক করলে যা হয়)
                    try {
                        if (typeof search === 'function') search(); 
                    } catch (error) {
                        console.error('Error calling search function:', error);
                    }
                }
            });

            if (index === activeHistoryIndex) {
                 li.classList.add('active');
                 if (dropdown) dropdown.setAttribute('aria-activedgedescendant', li.id);
            }
            historyList.appendChild(li);
        });
    }
}


/**
 * নতুন এবং দ্রুত আপডেট ফাংশন।
 * ★★★ এটি এখন '@' প্রিফিক্স সাজেশনে লোগো পাথ যোগ করে। ★★★
 */
/**
 * উন্নত updateSuggestions ফাংশন
 * এটি সার্চ বার এবং হিস্ট্রি ড্রপডাউনকে একটি একক ইউনিটে পরিণত করে।
 */
function updateSuggestions(filter = '') {
    const historyList = document.getElementById('historyList');
    const historyDropdown = document.getElementById('historyDropdown');
    const searchBox = document.getElementById('searchBox'); // সার্চ বক্সের কন্টেইনার
    
    if (!historyList || !historyDropdown || !searchBox) return;

    const normalizedFilter = filter.trim().toLowerCase();

    // সাহায্যকারী ফাংশন: ড্রপডাউন এবং সার্চ বারের স্টাইল কন্ট্রোল
    const toggleDropdownVisibility = (show) => {
        if (show) {
            historyDropdown.classList.remove('hidden');
            searchBox.classList.add('active-dropdown'); // CSS এ এই ক্লাসটি বর্ডার রেডিয়াস ঠিক করবে
        } else {
            historyDropdown.classList.add('hidden');
            searchBox.classList.remove('active-dropdown');
            historyList.innerHTML = '';
        }
    };

    // --- ১. ইঞ্জিন প্রিফিক্স সাজেশন লজিক (@engine) ---
    if (normalizedFilter.startsWith('@')) {
        const engineQuery = normalizedFilter.substring(1);
        const MAX_ENGINE_SUGGESTIONS = 10;

        const engineItems = Object.entries(enginePrefixes)
            .filter(([engine, prefix]) => {
                return engine.toLowerCase().includes(engineQuery) || prefix.toLowerCase().includes(normalizedFilter);
            })
            .slice(0, MAX_ENGINE_SUGGESTIONS)
            .map(([engine, prefix]) => ({
                query: prefix,
                name: engine,
                type: 'engine',
                icon: (typeof engineSuggestionIcons !== 'undefined') ? engineSuggestionIcons[engine] : null
            }));

        if (engineItems.length > 0) {
            renderList(engineItems, normalizedFilter, historyList);
            toggleDropdownVisibility(true);
        } else {
            toggleDropdownVisibility(false);
        }
        return;
    }

    // --- ২. লোকাল হিস্ট্রি সাজেশন ফিল্টারিং ---
    let historyItems = [];
    if (Array.isArray(searchHistory) && searchHistory.length > 0) {
        const exactMatches = [];
        const startsWith = [];
        const includes = [];

        searchHistory.forEach(item => {
            const q = item.query.toLowerCase();
            if (q === normalizedFilter) exactMatches.push(item);
            else if (q.startsWith(normalizedFilter)) startsWith.push(item);
            else if (q.includes(normalizedFilter)) includes.push(item);
        });

        historyItems = [...exactMatches, ...startsWith, ...includes]
            .slice(0, 8)
            .map(item => ({
                query: item.query,
                count: item.count,
                type: 'history'
            }));
    }

    // ইনপুট খালি থাকলে বা হিস্ট্রি থাকলে তৎক্ষণাৎ ড্রপডাউন হ্যান্ডেল করা
    if (historyItems.length > 0) {
        renderList(historyItems, normalizedFilter, historyList);
        toggleDropdownVisibility(true);
    } else if (!normalizedFilter) {
        // হিস্ট্রি খালি এবং ইনপুটও খালি — "No recent searches" দেখাও
        renderList([], normalizedFilter, historyList);
        toggleDropdownVisibility(true);
        return;
    }

    // --- ৩. ওয়েব সাজেশন (অ্যাসিঙ্ক্রোনাস) ---
    if (suggestionAbortController) suggestionAbortController.abort();
    suggestionAbortController = new AbortController();
    const signal = suggestionAbortController.signal;

    fetchWebSuggestions(normalizedFilter, signal)
        .then(fetchedSuggestions => {
            if (signal.aborted) return;

            // ওয়েব আইটেম থেকে হিস্ট্রির ডুপ্লিকেট বাদ দেওয়া
            const historyQueries = new Set(historyItems.map(item => item.query.toLowerCase()));
            const filteredWebItems = fetchedSuggestions
                .filter(query => !historyQueries.has(query.toLowerCase()))
                .map(query => ({ query, type: 'web' }));

            const combinedItems = [...historyItems, ...filteredWebItems].slice(0, 8);

            if (combinedItems.length > 0) {
                renderList(combinedItems, normalizedFilter, historyList);
                toggleDropdownVisibility(true);
            } else {
                // কোনো ফলাফল নেই — "No results found for ..." দেখাও
                renderList([], normalizedFilter, historyList);
                toggleDropdownVisibility(true);
            }
        })
        .catch(error => {
            if (error.name !== 'AbortError') console.error('Web suggestion error:', error);
        });
}

// ★★★ নতুন লজিক: গুগলের মতো Fill/Refine বাটন ★★★
const fillBtn = document.createElement('button');
fillBtn.className = 'fill-btn';
fillBtn.setAttribute('aria-label', 'Fill in search bar');
fillBtn.innerHTML = '↖'; // আপনি চাইলে SVG আইকনও ব্যবহার করতে পারেন

// বাটনে ক্লিক করলে কী হবে:
fillBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation(); // এটি দিলে সার্চ হয়ে অন্য পেজে চলে যাবে না
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = item.query;
        searchInput.focus();
        
        if (typeof updateSuggestions === 'function') {
            updateSuggestions(item.query);
        }
        if (typeof toggleClearButton === 'function') {
            toggleClearButton(); 
        }
    }
});

// বাটনটি লিস্টে যুক্ত করা
li.appendChild(fillBtn);


// হিস্ট্রি আইটেম মুছে ফেলা
// হিস্ট্রি থেকে একটি আইটেম সরিয়ে ফেলা
// হিস্ট্রি থেকে একটি আইটেম সরিয়ে ফেলা
function removeHistoryItem(query) {
    // Store original history for rollback if needed
    const originalHistory = [...searchHistory];
    
    // Remove the item from the array
    searchHistory = searchHistory.filter(item => item.query !== query); 

    // Check if chrome API is available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ searchHistory }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to update history:', chrome.runtime.lastError.message);
                // Rollback to original history on error
                searchHistory = originalHistory; 
                // Try to notify user of error
                const statusElement = document.getElementById('statusMessage');
                if (statusElement) {
                    statusElement.textContent = 'Failed to remove item from history.';
                    statusElement.classList.add('error');
                    setTimeout(() => {
                        statusElement.textContent = '';
                        statusElement.classList.remove('error');
                    }, 3000);
                }
            } else {
                // Success notification (if element exists)
                const statusElement = document.getElementById('statusMessage');
                if (statusElement) {
                    statusElement.textContent = 'Item removed from history.';
                    statusElement.classList.add('success');
                    setTimeout(() => {
                        statusElement.textContent = '';
                        statusElement.classList.remove('success');
                    }, 3000);
                }
                
                // ★★★ নতুন যোগ করা লাইন (১ম স্থান) ★★★
                // সফলভাবে ডিলিট হওয়ার পর কাউন্টার আপডেট করুন
                if (typeof updateTotalSearchCountDisplay === 'function') {
                    updateTotalSearchCountDisplay();
                }

                // ★★★ এই অংশটি UI আপডেট নিশ্চিত করবে! ★★★
                try {
                    const input = document.getElementById('searchInput');
                    // সফলভাবে সেভ হওয়ার পর UI রিফ্রেশ করা হলো
                    if (typeof updateSuggestions === 'function') { 
                        updateSuggestions(input ? input.value : '');
                    } else if (typeof showHistory === 'function') { 
                        // ফলব্যাক হিসেবে showHistory কল করা যেতে পারে
                        showHistory(); 
                    } else {
                        console.error('updateSuggestions function is not defined');
                    }
                } catch (error) {
                    console.error('Error updating history display:', error);
                }
                // ★★★ UI আপডেট ব্লক শেষ ★★★
            }
        });
    } else {
        // Handle case where chrome storage API is not available
        console.warn('Chrome storage API not available, history changes will not persist.');
        
        // ★★★ নতুন যোগ করা লাইন (২য় স্থান) ★★★
        // সফলভাবে ডিলিট হওয়ার পর কাউন্টার আপডেট করুন
        if (typeof updateTotalSearchCountDisplay === 'function') {
            updateTotalSearchCountDisplay();
        }

        // ★★★ যদি Chrome Storage না থাকে, তবুও UI আপডেট করা দরকার ★★★
        try {
            const input = document.getElementById('searchInput');
            if (typeof updateSuggestions === 'function') { 
                updateSuggestions(input ? input.value : '');
            } else if (typeof showHistory === 'function') { 
                showHistory();
            } else {
                console.error('updateSuggestions function is not defined');
            }
        } catch (error) {
            console.error('Error updating history display:', error);
            searchHistory = originalHistory;
        }
    }
}


/**
 * সার্চ হিস্ট্রি থেকে মোট সার্চের সংখ্যা গণনা করে।
 * @returns {number} মোট সার্চের সংখ্যা।
 */
function getTotalSearchCount() {
    if (!Array.isArray(searchHistory) || searchHistory.length === 0) {
        return 0;
    }
    
    // সব আইটেমের 'count' যোগ করা
    return searchHistory.reduce((total, item) => {
        // item.count একটি সংখ্যা কিনা তা নিশ্চিত করা
        const count = parseInt(item.count, 10);
        return total + (isNaN(count) ? 0 : count);
    }, 0);
}

/**
 * সেটিংসে মোট সার্চের সংখ্যা প্রদর্শন করে।
 */
function updateTotalSearchCountDisplay() {
    // ধাপ ১ এ যোগ করা HTML এলিমেন্টটি খুঁজে বের করা
    const displayElement = document.getElementById('totalSearchCountDisplay');
    
    if (displayElement) {
        const totalCount = getTotalSearchCount();
        // এখানে আপনি ফরম্যাট পরিবর্তন করতে পারেন
        displayElement.textContent = `: ${totalCount}x`; 
    } else {
        // যদি এলিমেন্টটি না পাওয়া যায় (এটি একটি সতর্কবার্তা)
        // console.warn('Total search count display element (#totalSearchCountDisplay) not found.');
    }
}
// হিস্ট্রি ক্লিয়ার করা
function clearHistory() {
    // Make sure searchHistory is an array
    if (!Array.isArray(searchHistory)) searchHistory = [];
    
    // Store original history for rollback if needed
    const originalHistory = [...searchHistory];
    
    // Clear the search history
    searchHistory = []; // <-- স্থানীয়ভাবে হিস্ট্রি ক্লিয়ার হলো
    
    // Check if Chrome API is available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ searchHistory }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to clear history:', chrome.runtime.lastError.message);
                // Rollback to original history on error
                searchHistory = originalHistory;
                
                // Show error message if status element exists
                const statusElement = document.getElementById('statusMessage');
                if (statusElement) {
                    statusElement.textContent = 'Failed to clear history.';
                    statusElement.classList.add('error');
                    setTimeout(() => {
                        statusElement.textContent = '';
                        statusElement.classList.remove('error');
                    }, 3000);
                }
            } else {
                // Success notification if element exists
                const statusElement = document.getElementById('statusMessage');
                if (statusElement) {
                    statusElement.textContent = 'History cleared successfully.';
                    statusElement.classList.add('success');
                    setTimeout(() => {
                        statusElement.textContent = '';
                        statusElement.classList.remove('success');
                    }, 3000);
                }

                // ★★★ নতুন যোগ করা লাইন (১ম স্থান) ★★★
                // সফলভাবে ক্লিয়ার হওয়ার পর কাউন্টার আপডেট করুন (এটি ০ দেখাবে)
                if (typeof updateTotalSearchCountDisplay === 'function') {
                    updateTotalSearchCountDisplay();
                }
            }
        });
    } else {
        // Handle case where Chrome storage API is not available
        console.warn('Chrome storage API not available, history changes will not persist.');
        
        // ★★★ নতুন যোগ করা লাইন (২য় স্থান) ★★★
        // স্টোরেজ API না থাকলেও কাউন্টার আপডেট করুন
        if (typeof updateTotalSearchCountDisplay === 'function') {
            updateTotalSearchCountDisplay();
        }
    }
    
    try {
        // Get input element
        const input = document.getElementById('searchInput');
        
        // Call updateSuggestions with consistent parameters (টাইপো ঠিক করা হয়েছে)
        if (typeof updateSuggestions === 'function') {
                   updateSuggestions(input ? input.value : '');
        } else {
            console.error('updateSuggestions function is not defined'); // টাইপো ঠিক করা হয়েছে
        }
    } catch (error) {
        console.error('Error updating history display:', error);
        // Attempt to restore the history if there's an error
        searchHistory = originalHistory;
    }
    
    // Hide settings popup if it exists
    try {
        const settingsPopup = document.getElementById('settingsPopup');
        if (settingsPopup) {
            settingsPopup.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error hiding settings popup:', error);
    }
}


// ── History Stats Popup ──────────────────────────────────────────────────
function openHistoryStatsPopup() {
    const existing = document.getElementById('historyStatsPopup');
    if (existing) { existing.classList.remove('hsp-visible'); setTimeout(()=>existing.remove(),280); return; }

    // Close all other popups first
    ['settingsPopup','enginePopup','themesPopup','appsPopup','toolsPopup'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
    document.getElementById('engineBtn')?.setAttribute('aria-expanded','false');

    const hist  = Array.isArray(searchHistory) ? searchHistory : [];
    const total = getTotalSearchCount();
    const uniq  = hist.length;
    const PAL   = ['#60efff','#ff6b9d','#a78bfa','#fbbf24','#34d399','#f97316',
                   '#e879f9','#38bdf8','#fb923c','#4ade80','#f43f5e','#818cf8'];

    // ── Stats ──────────────────────────────────────────────────────────────
    let topKw='—', topKwN=0, avgN=0;
    hist.forEach(it=>{ const c=parseInt(it.count,10)||0; if(c>topKwN){topKwN=c;topKw=it.query||'';} avgN+=c; });
    avgN = uniq ? (avgN/uniq).toFixed(1) : 0;

    // ── Engine map ─────────────────────────────────────────────────────────
    const engMap={};
    hist.forEach(it=>{
        if(it.engines && typeof it.engines==='object'){
            Object.entries(it.engines).forEach(([e,c])=>{ const n=normalizeEngineName(e); engMap[n]=(engMap[n]||0)+c; });
        } else {
            const n=normalizeEngineName(it.engine||'google'); engMap[n]=(engMap[n]||0)+(parseInt(it.count,10)||1);
        }
    });
    const engArr  = Object.entries(engMap).sort((a,b)=>b[1]-a[1]);
    const engTot  = engArr.reduce((s,e)=>s+e[1],0)||1;
    const topEng  = engArr[0]?.[0]||'—';
    const topEngCount = engArr[0]?.[1]||0;

    // ── Timestamps & periods ───────────────────────────────────────────────
    const NOW=Date.now();
    const hasTimes = hist.some(i=>i.timestamp);

    // Correct "today" = from midnight of current day
    function todayStart(){ const d=new Date(); d.setHours(0,0,0,0); return d.getTime(); }
    function yesterdayStart(){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-1); return d.getTime(); }
    function weekStart(){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d.getTime(); }
    function monthStart(){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(1); return d.getTime(); }
    function yearStart(){ const d=new Date(); d.setHours(0,0,0,0); d.setMonth(0,1); return d.getTime(); }

    // Count items whose timestamp falls within a range
    function pRange(from, to=NOW){
        return hist.filter(i=>i.timestamp && i.timestamp>=from && i.timestamp<=to)
                   .reduce((s,i)=>s+(parseInt(i.count,10)||1),0);
    }
    // Fallback when no timestamps: use total / rough estimate
    function pSlice(f){ return Math.round(total * f); }

    const todayV  = hasTimes ? pRange(todayStart())     : pSlice(0.08);
    const periods=[
        {l:'Today',     v: hasTimes ? pRange(todayStart())           : pSlice(0.08),  c:'#60efff'},
        {l:'Yesterday', v: hasTimes ? pRange(yesterdayStart(), todayStart()) : pSlice(0.05), c:'#38bdf8'},
        {l:'This Week', v: hasTimes ? pRange(weekStart())            : pSlice(0.22),  c:'#a78bfa'},
        {l:'This Month',v: hasTimes ? pRange(monthStart())           : pSlice(0.55),  c:'#fbbf24'},
        {l:'This Year', v: hasTimes ? pRange(yearStart())            : pSlice(0.90),  c:'#34d399'},
        {l:'All Time',  v: total,                                                      c:'#f97316'},
    ];

    // ── SVG donut ─────────────────────────────────────────────────────────
    function donut(arr,tot,r){
        const circ=2*Math.PI*r; let s='',cum=0;
        arr.forEach(([e,c],i)=>{
            const pct=c/tot*100, col=PAL[i%PAL.length];
            const dash=(pct/100)*circ, off=circ-(cum/100)*circ; cum+=pct;
            const es=e.replace(/[<>&"]/g,x=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[x]);
            s+=`<circle class="hsp-dseg" cx="50" cy="50" r="${r}" fill="none" stroke="${col}"
                stroke-width="10" stroke-linecap="round"
                stroke-dasharray="${dash.toFixed(2)} ${(circ-dash).toFixed(2)}"
                stroke-dashoffset="${off.toFixed(2)}"
                data-e="${es}" data-c="${c}" data-p="${pct.toFixed(1)}" data-col="${col}"
                style="transform:rotate(-90deg);transform-origin:50% 50%;cursor:pointer;
                       transition:stroke-dasharray .85s ease ${i*.09}s,stroke-width .15s"/>`;
        });
        if(!arr.length) s=`<circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="10"/>`;
        return s;
    }

    // ── Legend bars ────────────────────────────────────────────────────────
    const eMax=engArr[0]?.[1]||1;
    function legend(){
        if(!engArr.length) return `<div class="hsp-empty">No engine data yet.</div>`;
        return engArr.map(([e,c],i)=>{
            const col=PAL[i%PAL.length], pct=Math.round(c/engTot*100), bw=Math.round(c/eMax*100);
            return `<div class="hsp-lr">
                <div class="hsp-lr-name"><span class="hsp-lr-dot" style="background:${col}"></span><span>${sanitizeHTML(e)}</span></div>
                <div class="hsp-lr-track"><div class="hsp-lr-fill" style="width:${bw}%;background:${col};animation-delay:${i*.06}s"></div></div>
                <div class="hsp-lr-num"><b>${c}</b><span>${pct}%</span></div>
            </div>`;
        }).join('');
    }

    // ── Period bars ────────────────────────────────────────────────────────
    function periodBars(){
        const mx=Math.max(...periods.map(p=>p.v))||1;
        return periods.map((p,i)=>`
        <div class="hsp-pb">
            <span class="hsp-pb-l">${p.l}</span>
            <div class="hsp-pb-track">
                <div class="hsp-pb-fill" style="width:${Math.round(p.v/mx*100)}%;background:${p.c};animation-delay:${i*.08}s"></div>
            </div>
            <span class="hsp-pb-v">${p.v}</span>
        </div>`).join('');
    }

    // ── Row renderer ───────────────────────────────────────────────────────
    function rows(items){
        if(!items.length) return `<div class="hsp-empty">✦ Nothing found.</div>`;
        const bmax=Math.max(...items.map(i=>parseInt(i.count,10)||1));
        return items.map((it,i)=>{
            const q=sanitizeHTML(String(it.query||'')), c=parseInt(it.count,10)||1;
            const w=Math.round(c/bmax*100);
            const dt=it.timestamp?new Date(it.timestamp).toLocaleDateString('en',{month:'short',day:'numeric',year:'2-digit'}):'';
            let epills='';
            const rq=String(it.query||'');
            if(it.engines&&typeof it.engines==='object'){
                const el=Object.entries(it.engines).sort((a,b)=>b[1]-a[1]);
                if(el.length) epills='<div class="hsp-eps">'+el.map(([e,n])=>{
                    const pct=Math.round(n/c*100),es=sanitizeHTML(e),qs=sanitizeHTML(rq);
                    return `<span class="hsp-ep hsp-clickable" data-q="${qs}" data-e="${es}" title="Search on ${es}">
                        <span class="hsp-ep-dot"></span>${es}<span class="hsp-ep-n">${n}×</span>
                    </span>`;
                }).join('')+'</div>';
            } else if(it.engine){
                const es=sanitizeHTML(String(it.engine)),qs=sanitizeHTML(rq);
                epills=`<div class="hsp-eps"><span class="hsp-ep hsp-clickable" data-q="${qs}" data-e="${es}"><span class="hsp-ep-dot"></span>${es}<span class="hsp-ep-n">${c}×</span></span></div>`;
            }
            return `<div class="hsp-row" style="animation-delay:${Math.min(i*.016,.45)}s">
                <span class="hsp-rk">${i+1}</span>
                <div class="hsp-rm">
                    <div class="hsp-rt">
                        <span class="hsp-rq" title="${q}">${q}</span>
                        <div class="hsp-rr">
                            <div class="hsp-rbar"><div class="hsp-rbar-f" style="width:${w}%"></div></div>
                            <span class="hsp-rbadge">${c}×</span>
                        </div>
                    </div>
                    ${epills}
                    ${dt?`<span class="hsp-rdt">${dt}</span>`:''}
                </div>
            </div>`;
        }).join('');
    }

    // ── applyFilters ───────────────────────────────────────────────────────
    function applyFilters(){
        const sv=ol.querySelector('#hspSort').value;
        const pv=ol.querySelector('#hspPer').value;
        const kv=(ol.querySelector('#hspKw').value||'').toLowerCase().trim();
        const ev=(ol.querySelector('#hspEngFilter')?.value||'all');
        const nowF=Date.now();
        let items=[...hist];
        // period filter — uses correct calendar-based ranges
        if(pv!=='all'){
            if(hasTimes){
                const _ts = todayStart(), _ys = yesterdayStart(),
                      _ws = weekStart(),  _ms = monthStart(), _yrs = yearStart();
                items = items.filter(i=>{
                    if(!i.timestamp) return false;
                    const t = i.timestamp;
                    if(pv==='today')     return t >= _ts;
                    if(pv==='yesterday') return t >= _ys && t < _ts;
                    if(pv==='week')      return t >= _ws;
                    if(pv==='month')     return t >= _ms;
                    if(pv==='year')      return t >= _yrs;
                    return true;
                });
            } else {
                // No timestamps — show rough proportion as estimate
                const ff={today:.08,yesterday:.05,week:.22,month:.55,year:.9};
                const n = Math.max(1, Math.ceil(hist.length*(ff[pv]||1)));
                items = items.slice(0, n);
            }
        }
        // keyword
        if(kv) items=items.filter(i=>String(i.query||'').toLowerCase().includes(kv));
        // Engine filter
        if(ev && ev!=='all'){
            items=items.filter(it=>{
                if(it.engines&&typeof it.engines==='object') return Object.keys(it.engines).some(e=>normalizeEngineName(e)===ev);
                return normalizeEngineName(it.engine||'')===ev;
            });
        }
        // sort
        if(sv==='oldest')     items=items.slice().reverse();
        else if(sv==='az')    items=items.slice().sort((a,b)=>String(a.query||'').localeCompare(String(b.query||'')));
        else if(sv==='za')    items=items.slice().sort((a,b)=>String(b.query||'').localeCompare(String(a.query||'')));
        else if(sv==='most')  items=items.slice().sort((a,b)=>(parseInt(b.count,10)||0)-(parseInt(a.count,10)||0));
        else if(sv==='least') items=items.slice().sort((a,b)=>(parseInt(a.count,10)||0)-(parseInt(b.count,10)||0));
        else if(sv==='tope'){
            // Sort by: how many DIFFERENT engines were used to search this keyword
            // e.g. keyword searched on Google + YouTube + Reddit = 3 engines → comes first
            function engVariety(it){
                if(it.engines && typeof it.engines==='object'){
                    return Object.keys(it.engines).length;
                }
                return it.engine ? 1 : 0;
            }
            items=items.slice().sort((a,b)=>{
                const diff = engVariety(b) - engVariety(a);
                if(diff !== 0) return diff;
                return (parseInt(b.count,10)||0) - (parseInt(a.count,10)||0);
            });
        }

        ol.querySelector('#hspList').innerHTML=rows(items);
        ol.querySelector('#hspN').textContent=items.length;

        // Update period panel counts dynamically based on current filtered set
        const filtItems = pv==='all' ? hist : items;  // use full hist for period card totals
        const _periodCards = ol.querySelectorAll('.hsp-pc');
        const updatedPeriods=[
            hasTimes ? pRange(todayStart())                    : pSlice(0.08),
            hasTimes ? pRange(yesterdayStart(), todayStart())  : pSlice(0.05),
            hasTimes ? pRange(weekStart())                     : pSlice(0.22),
            hasTimes ? pRange(monthStart())                    : pSlice(0.55),
            hasTimes ? pRange(yearStart())                     : pSlice(0.90),
            total,
        ];
        _periodCards.forEach((card,i)=>{
            const numEl = card.querySelector('.hsp-pc-n');
            if(numEl && updatedPeriods[i]!==undefined) numEl.textContent = updatedPeriods[i];
        });
        // Update period bars
        const pbFills = ol.querySelectorAll('.hsp-pb');
        const pmx = Math.max(...updatedPeriods,1);
        pbFills.forEach((pb,i)=>{
            const fill = pb.querySelector('.hsp-pb-fill');
            const val  = pb.querySelector('.hsp-pb-v');
            if(fill && updatedPeriods[i]!==undefined){
                fill.style.width = Math.round(updatedPeriods[i]/pmx*100)+'%';
            }
            if(val && updatedPeriods[i]!==undefined) val.textContent = updatedPeriods[i];
        });
    }

    // ── HTML ───────────────────────────────────────────────────────────────
    const ol=document.createElement('div');
    ol.id='historyStatsPopup';
    ol.innerHTML=`
    <div class="hsp-card">
      <div class="hsp-orb hsp-o1"></div><div class="hsp-orb hsp-o2"></div><div class="hsp-orb hsp-o3"></div>

      <!-- HEADER -->
      <div class="hsp-hdr">
        <div class="hsp-hdr-l">
          <span class="hsp-logo">◈</span>
          <div>
            <div class="hsp-title">Search Analytics</div>
            <div class="hsp-subtitle">Your browsing search history</div>
          </div>
        </div>
        <div class="hsp-hdr-r">
          ${!hasTimes?'<span class="hsp-badge hsp-badge-warn">⚠ No timestamps</span>':'<span class="hsp-badge hsp-badge-ok">✓ Live data</span>'}
          <button class="hsp-close" id="hspClose" title="Close (Esc)">✕</button>
        </div>
      </div>

      <!-- STATS STRIP -->
      <div class="hsp-strip">
        <div class="hsp-s">
          <span class="hsp-sn">${total}</span>
          <span class="hsp-sl">Total Searches</span>
        </div>
        <div class="hsp-s">
          <span class="hsp-sn">${uniq}</span>
          <span class="hsp-sl">Keywords</span>
        </div>
        <div class="hsp-s">
          <span class="hsp-sn">${todayV}</span>
          <span class="hsp-sl">Today</span>
        </div>
        <div class="hsp-s hsp-s-hot">
          <div class="hsp-s-hotrow">
            <span class="hsp-s-fire">🔥</span>
            <span class="hsp-s-hc">${topKwN}×</span>
          </div>
          <span class="hsp-s-hw" title="${sanitizeHTML(topKw)}">${sanitizeHTML(topKw)}</span>
          <span class="hsp-sl">Top Keyword</span>
        </div>
        <div class="hsp-s hsp-s-eng">
          <div class="hsp-s-hotrow">
            <span class="hsp-s-engn" title="${sanitizeHTML(topEng)}">${sanitizeHTML(topEng)}</span>
            <span class="hsp-s-engc">${topEngCount}×</span>
          </div>
          <span class="hsp-sl">Top Engine</span>
        </div>
        <div class="hsp-s">
          <span class="hsp-sn">${engArr.length||0}</span>
          <span class="hsp-sl">Engines Used</span>
        </div>
      </div>

      <!-- BODY -->
      <div class="hsp-body">

        <!-- LEFT: History List -->
        <div class="hsp-panel hsp-lpanel">
          <div class="hsp-phdr">
          
            <span class="hsp-ptitle">🕓 Search History</span>
            <div class="hsp-ctrls">
            <select class="hsp-sel" id="hspEngFilter">
                <option value="all">All Search Engines</option>
                ${engArr.map(([e])=>`<option value="${sanitizeHTML(e)}">${sanitizeHTML(e)}</option>`).join('')}
              </select>
              <select class="hsp-sel" id="hspSort">
                <option value="newest">↓ Newest First</option>
                <option value="oldest">↑ Oldest First</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
                <option value="most">▼ Most Searched</option>
                <option value="least">▲ Least Searched</option>
                <option value="tope">⭐ Top Engine Used</option>
              </select>
              <select class="hsp-sel" id="hspPer">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
              
            </div>
          </div>
          <div class="hsp-kw-row">
            <span class="hsp-kw-icon">⌕</span>
            <input class="hsp-kw" id="hspKw" placeholder="Filter keywords…" autocomplete="off" spellcheck="false">
            <button class="hsp-kw-clr" id="hspKwClr" title="Clear">✕</button>
          </div>
          <div class="hsp-list" id="hspList">${rows(hist)}</div>
          <div class="hsp-lfooter">
            Showing <b id="hspN">${hist.length}</b> of ${hist.length} keywords
          </div>
        </div>

        <!-- RIGHT: Charts -->
        <div class="hsp-rcol">
          <div class="hsp-tabs">
            <button class="hsp-tab hsp-tab-on" data-c="engine">🔍 By Engine</button>
            <button class="hsp-tab" data-c="period">📅 By Period</button>
          </div>

          <!-- Engine Chart -->
          <div class="hsp-panel hsp-cpanel" id="hspCEngine">
            <div class="hsp-phdr"><span class="hsp-ptitle">Search Engine Usage</span></div>
            <div class="hsp-elayout">
              <div class="hsp-donut-wrap">
                <svg class="hsp-donut" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="10"/>
                  ${donut(engArr,engTot,36)}
                  <text x="50" y="46" text-anchor="middle" class="hsp-dn">${total}</text>
                  <text x="50" y="57" text-anchor="middle" class="hsp-ds">searches</text>
                </svg>
                <div class="hsp-dtip" id="hspDtip"></div>
              </div>
              <div class="hsp-lbars">${legend()}</div>
            </div>
          </div>

          <!-- Period Chart -->
          <div class="hsp-panel hsp-cpanel hsp-hide" id="hspCPeriod">
            <div class="hsp-phdr">
              <span class="hsp-ptitle">Activity by Time Period</span>
              <span class="hsp-badge ${hasTimes?'hsp-badge-ok':'hsp-badge-warn'}">${hasTimes?'✓ Live':'⚠ Est.'}</span>
            </div>
            <div class="hsp-pbody">
              <div class="hsp-pcards">
                ${periods.map(p=>`<div class="hsp-pc" style="--c:${p.c}">
                  <span class="hsp-pc-n">${p.v}</span>
                  <span class="hsp-pc-l">${p.l}</span>
                </div>`).join('')}
              </div>
              <div class="hsp-pbs">${periodBars()}</div>
            </div>
          </div>
        </div>

      </div>

      <!-- FOOTER -->
      <div class="hsp-foot">
        <span class="hsp-fnote">💾 Stored locally · ${uniq} keywords · ${total} searches</span>
        <button class="hsp-delbtn" id="hspDel">🗑 Delete All History</button>
      </div>
    </div>`;

    document.body.appendChild(ol);
    ol.offsetHeight;
    ol.classList.add('hsp-on');

    // ── Close ──────────────────────────────────────────────────────────────
    function close(){
        ol.classList.remove('hsp-on');
        setTimeout(()=>{ if(ol.parentNode) ol.remove(); },300);
    }
    ol.querySelector('#hspClose').addEventListener('click', e=>{ e.stopPropagation(); close(); });

    // ── Outside-click: click anywhere outside the card → close ─────────
    // Use document-level listener so clicking outside the popup closes it
    function _outsideClick(e){
        if(!ol.contains(e.target)){
            close();
            document.removeEventListener('mousedown', _outsideClick, true);
        }
    }
    // Small delay so the opening click doesn't immediately close it
    setTimeout(()=>{ document.addEventListener('mousedown', _outsideClick, true); }, 50);

    document.addEventListener('keydown',function ek(e){ if(e.key==='Escape'){close();document.removeEventListener('keydown',ek);} });

    // ── Keyword filter ─────────────────────────────────────────────────────
    const kwInp=ol.querySelector('#hspKw'), kwClr=ol.querySelector('#hspKwClr');
    kwInp.addEventListener('input',()=>{ kwClr.style.opacity=kwInp.value?'1':'0'; applyFilters(); });
    kwClr.addEventListener('click',()=>{ kwInp.value=''; kwClr.style.opacity='0'; applyFilters(); kwInp.focus(); });

    // ── Sort / Period ──────────────────────────────────────────────────────
    ['#hspSort','#hspPer','#hspEngFilter'].forEach(s=>{ const el=ol.querySelector(s); if(el) el.addEventListener('change',applyFilters); });

    // ── Tabs ───────────────────────────────────────────────────────────────
    ol.querySelectorAll('.hsp-tab').forEach(tab=>{
        tab.addEventListener('click', e=>{
            e.stopPropagation();
            ol.querySelectorAll('.hsp-tab').forEach(t=>t.classList.remove('hsp-tab-on'));
            tab.classList.add('hsp-tab-on');
            ['hspCEngine','hspCPeriod'].forEach(id=>ol.querySelector('#'+id).classList.add('hsp-hide'));
            ol.querySelector('#'+{engine:'hspCEngine',period:'hspCPeriod'}[tab.dataset.c]).classList.remove('hsp-hide');
        });
    });

    // ── Donut tooltip (mouse + touch) ──────────────────────────────────────
    const dtip    = ol.querySelector('#hspDtip');
    const donutSvg= ol.querySelector('.hsp-donut');
    const donutWrap= donutSvg ? donutSvg.closest('.hsp-donut-wrap') : null;
    let tipTimeout = null;

    function showTip(seg, clientX, clientY){
        if(!dtip||!donutWrap) return;
        clearTimeout(tipTimeout);
        // Set content first (visibility:hidden so it renders but is invisible)
        dtip.style.visibility='hidden';
        dtip.classList.add('hsp-dtip-on');
        dtip.innerHTML =
            `<div class="hsp-tip-eng"><span class="hsp-tdot" style="background:${seg.dataset.col}"></span><b>${seg.dataset.e}</b></div>`+
            `<div class="hsp-tip-stat">${seg.dataset.c} searches &nbsp;<span class="hsp-tip-pct">${seg.dataset.p}%</span></div>`;
        // Now we can read real size
        const wrapR = donutWrap.getBoundingClientRect();
        const tw = dtip.offsetWidth, th = dtip.offsetHeight;
        const x  = Math.round(clientX - wrapR.left);
        const y  = Math.round(clientY - wrapR.top);
        const left = Math.max(4, Math.min(x - tw/2, wrapR.width - tw - 4));
        const top  = y - th - 12 < 4 ? y + 14 : y - th - 12; // flip below if too near top
        dtip.style.left = left + 'px';
        dtip.style.top  = top  + 'px';
        dtip.style.visibility='';
    }
    function hideTip(){
        clearTimeout(tipTimeout);
        tipTimeout = setTimeout(()=>{ if(dtip) dtip.classList.remove('hsp-dtip-on'); }, 80);
    }
    function resetSegs(){
        ol.querySelectorAll('.hsp-dseg').forEach(s=>{
            s.style.strokeWidth=''; s.style.opacity='';
        });
    }

    ol.querySelectorAll('.hsp-dseg').forEach(seg=>{
        // Mouse
        seg.addEventListener('mouseenter', e=>{
            ol.querySelectorAll('.hsp-dseg').forEach(s=>{ s.style.opacity='0.45'; });
            seg.style.strokeWidth='14'; seg.style.opacity='1';
            showTip(seg, e.clientX, e.clientY);
        });
        seg.addEventListener('mousemove', e=>{ showTip(seg, e.clientX, e.clientY); });
        seg.addEventListener('mouseleave', ()=>{ resetSegs(); hideTip(); });
        // Touch
        seg.addEventListener('touchstart', e=>{
            e.preventDefault();
            const t=e.touches[0];
            ol.querySelectorAll('.hsp-dseg').forEach(s=>{ s.style.opacity='0.45'; });
            seg.style.strokeWidth='14'; seg.style.opacity='1';
            showTip(seg, t.clientX, t.clientY);
            clearTimeout(tipTimeout);
            tipTimeout=setTimeout(()=>{ resetSegs(); if(dtip) dtip.classList.remove('hsp-dtip-on'); },2800);
        },{passive:false});
    });

    // ── Engine pill click → new tab ────────────────────────────────────────
    ol.addEventListener('click', e=>{
        const p = e.target.closest('.hsp-clickable');
        if(!p) return;
        e.stopPropagation();
        const q=p.dataset.q||'', eng=p.dataset.e||'';
        if(!q||!eng) return;
        const fn=ENGINE_SEARCH_URLS[eng];
        window.open(fn?fn(q):`https://www.google.com/search?q=${encodeURIComponent(q)}`,'_blank','noopener');
    });

    // ── Delete all ─────────────────────────────────────────────────────────
    ol.querySelector('#hspDel').addEventListener('click',()=>{
        const b=ol.querySelector('#hspDel');
        b.innerHTML='⏳ Deleting…'; b.disabled=true;
        if(typeof clearHistory==='function') clearHistory();
        setTimeout(close,500);
    });
}



// হিস্ট্রি দেখানো
function showHistory() {
    const dropdown = document.getElementById('historyDropdown');

    // ড্রপডাউন চেক করা
    if (dropdown) {
        if (dropdown.classList.contains('hidden')) {
            dropdown.classList.remove('hidden');
            updateSuggestions(document.getElementById('searchInput').value);
        } else {
            dropdown.classList.add('hidden');
        }
    }
}


// হিস্ট্রি লুকানো
function hideHistory() {
    const dropdown = document.getElementById('historyDropdown');
    const searchBox = document.querySelector('.search-box');

    // ড্রপডাউন লুকানো
    if (dropdown) {
        dropdown.classList.add('hidden');
    }

    // অ্যাকটিভ হিস্ট্রি ইনডেক্স রিসেট করা
    if (typeof activeHistoryIndex !== 'undefined') {
        activeHistoryIndex = -1;
    }

    // সার্চ বক্স থেকে ফোকাস সরানো
    if (searchBox) {
        searchBox.classList.remove('focused');
    }
}


// থিম টগল করা
function toggleTheme() {
    const themeToggleBtn = document.getElementById('themeToggle');
    if (!themeToggleBtn) return;

    // থিম টগল করা
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');

    // টগল বাটনের টেক্সট এবং আইকন আপডেট করা
    themeToggleBtn.innerHTML = `<span class="icon">${isDark ? '☀️' : '🌙'}</span> ${isDark ? 'Light Mode' : 'Dark Mode'}`;

    // এক্সেসিবিলিটি যোগ করা
    themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');

    // থিম ডাটা সেভ করা
    chrome.storage.local.set({ theme: isDark ? 'dark' : 'light' });
}


// সার্চ ইঞ্জিন বোতামের টেক্সট আপডেট করা
function updateEngineButtonText() {
    const engineBtn = document.getElementById('engineBtn');
    if (!engineBtn) return;

    // ফাংশন যেটি প্রথম অক্ষর ক্যাপিটালাইজ করবে
    const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    // নির্বাচিত ইঞ্জিনের টেক্সট আপডেট করা
    const defaultText = 'Search Engine ▼'; // এখানেও স্থানীয় ভাষার জন্য পরিবর্তন করা যেতে পারে
    engineBtn.textContent = selectedEngine ? `${capitalizeFirstLetter(selectedEngine)} ▼` : defaultText;
}

/**
 * সমস্ত সেটিংস একটি JSON ফাইল হিসেবে ডাউনলোড করে।
 */
async function exportSettings() {
    try {
        // ১. Local Storage থেকে ডেটা সংগ্রহ (Settings, History, Notes)
        const localData = await new Promise(resolve => {
            chrome.storage.local.get(null, result => resolve(result)); // null দিলে সব ডেটা চলে আসবে
        });

        // ২. Sync Storage থেকে ডেটা সংগ্রহ (Popup Websites)
        const syncData = await new Promise(resolve => {
            chrome.storage.sync.get(null, result => resolve(result));
        });

        // ৩. Browser LocalStorage থেকে ডেটা সংগ্রহ (Tools Order)
        const browserLocal = {};
        const toolsOrder = localStorage.getItem('nimseekToolsOrder');
        if (toolsOrder) {
            browserLocal.nimseekToolsOrder = toolsOrder;
        }

        // ৪. সব ডেটা একসাথে করা
        const fullBackup = {
            type: 'NimSeek_Full_Backup',
            timestamp: new Date().toISOString(),
            local: localData,
            sync: syncData,
            browserLocal: browserLocal
        };

        // ৫. JSON ফাইলে রূপান্তর ও ডাউনলোড
        const dataStr = JSON.stringify(fullBackup, null, 2); 
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        // ফাইলের নাম আজকের তারিখ অনুযায়ী হবে
        a.download = `NimSeek_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`; 
        document.body.appendChild(a);
        a.click(); 
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url); 
        
    } catch (error) {
        console.error('Export failed:', error);
        alert('সব ডাটা এক্সপোর্ট করার সময় একটি সমস্যা হয়েছে।');
    }
}

/**
 * লুকানো ফাইল ইনপুটটি দেখানোর জন্য এই ফাংশন।
 */
function importSettings() {
    const fileInput = document.getElementById('importFileInput');
    if (fileInput) {
        fileInput.click(); // ফাইল সিলেক্ট করার ডায়ালগ ওপেন করে
    }
}

/**
 * ব্যবহারকারী ফাইল সিলেক্ট করার পর সমস্ত ডেটা রিস্টোর করে।
 * @param {Event} event - ফাইল ইনপুটের 'change' ইভেন্ট
 */
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            let localDataToImport = {};
            let syncDataToImport = {};
            let browserLocalToImport = {};

            // ডেটা ভ্যালিডেশন এবং ফরম্যাট চেকিং
            if (importedData.type === 'NimSeek_Full_Backup') {
                localDataToImport = importedData.local || {};
                syncDataToImport = importedData.sync || {};
                browserLocalToImport = importedData.browserLocal || {};
            } 
            else if (Array.isArray(importedData) && importedData.length > 0 && importedData[0].url) {
                syncDataToImport = { websites: importedData };
            } 
            else {
                localDataToImport = importedData;
            }

            // ── ধাপ ১: বর্তমান Local Storage ডেটা পড়া ──────────────────
            const currentLocal = await new Promise(resolve => {
                chrome.storage.local.get(null, result => resolve(result || {}));
            });

            // ── ধাপ ২: বর্তমান Sync Storage ডেটা পড়া ───────────────────
            const currentSync = await new Promise(resolve => {
                chrome.storage.sync.get(null, result => resolve(result || {}));
            });

            // ── ধাপ ৩: searchHistory মার্জ করা (পুরোনো + নতুন, duplicate বাদ) ─
            const currentHistory = Array.isArray(currentLocal.searchHistory)
                ? currentLocal.searchHistory : [];
            const importedHistory = Array.isArray(localDataToImport.searchHistory)
                ? localDataToImport.searchHistory : [];

            // query+engine কম্বিনেশন দিয়ে duplicate সরানো হচ্ছে
            const seenKeys = new Set();
            const mergedHistory = [...currentHistory, ...importedHistory].filter(item => {
                const key = (item.query || '') + '|' + (item.engine || '');
                if (seenKeys.has(key)) return false;
                seenKeys.add(key);
                return true;
            });

            // ── ধাপ ৪: websites মার্জ করা (পুরোনো + নতুন, duplicate বাদ) ──────
            const currentWebsites = Array.isArray(currentSync.websites)
                ? currentSync.websites : [];
            const importedWebsites = Array.isArray(syncDataToImport.websites)
                ? syncDataToImport.websites : [];

            const seenUrls = new Set(currentWebsites.map(w => w.url));
            const mergedWebsites = [
                ...currentWebsites,
                ...importedWebsites.filter(w => !seenUrls.has(w.url))
            ];

            // ── ধাপ ৫: Local Storage মার্জ করে সেভ করা ──────────────────
            // আগের ডেটার উপর নতুন ডেটা overlay করা হচ্ছে (replace নয়)
            const mergedLocal = {
                ...currentLocal,
                ...localDataToImport,
                searchHistory: mergedHistory,
            };

            await new Promise((resolve, reject) => {
                chrome.storage.local.set(mergedLocal, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });

            // ── ধাপ ৬: Sync Storage মার্জ করে সেভ করা ───────────────────
            const mergedSync = {
                ...currentSync,
                ...syncDataToImport,
                websites: mergedWebsites,
            };

            await new Promise((resolve, reject) => {
                chrome.storage.sync.set(mergedSync, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                });
            });

            // ── ধাপ ৭: Browser LocalStorage মার্জ করা ────────────────────
            if (browserLocalToImport.nimseekToolsOrder) {
                localStorage.setItem('nimseekToolsOrder', browserLocalToImport.nimseekToolsOrder);
            }

            const addedHistory = importedHistory.length;
            const addedWebsites = mergedWebsites.length - currentWebsites.length;

            alert(
                '\u2705 ডাটা সফলভাবে মার্জ করা হয়েছে!\n\n' +
                '\ud83d\udccb History: ' + addedHistory + ' টি এন্ট্রি যোগ হয়েছে (duplicate বাদ দিয়ে)\n' +
                '\ud83c\udf10 Websites: ' + addedWebsites + ' টি নতুন সাইট যোগ হয়েছে\n\n' +
                'আগের কোনো ডেটা মুছে যায়নি। পেজ রিলোড হচ্ছে...'
            );
            window.location.reload();

        } catch (error) {
            console.error('Import failed:', error);
            alert(`ফাইল ইম্পোর্ট করার সময় সমস্যা হয়েছে: ${error.message}`);
        } finally {
            event.target.value = null;
        }
    };
    
    reader.onerror = function() {
        alert('ফাইলটি পড়া সম্ভব হচ্ছে না।');
    };

    reader.readAsText(file);
}

// সেটিংস পপআপ টগল করা
function toggleSettingsPopup() {
    const popup = document.getElementById('settingsPopup');
    if (popup) {
        popup.classList.toggle('hidden');
    }

    // অন্য সমস্ত পপ-আপ গুলো লুকানো
    const popups = ['enginePopup', 'themesPopup', 'appsPopup'];
    popups.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    });
}



// ইঞ্জিন পপআপ টগল করা
function toggleEnginePopup() {
    const popup = document.getElementById('enginePopup');
    if (!popup) return;
    const opening = popup.classList.contains('hidden');
    // Close other popups
    ['settingsPopup', 'themesPopup', 'appsPopup'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
    popup.classList.toggle('hidden');
    const btn = document.getElementById('engineBtn');
    btn?.setAttribute('aria-expanded', String(opening));
    if (opening) {
        epBuildTopUse();
        setTimeout(epMarkActive, 60);
    }
}

// ── Engine Info Map ───────────────────────────────────────────────────────
const EP_ENGINE_INFO = {
    google:     { name:'Google',      icon:'icons/google.ico' },
    bing:       { name:'Bing',        icon:'icons/bing.ico' },
    duckduckgo: { name:'DuckDuckGo',  icon:'icons/duckduckgo.ico' },
    yahoo:      { name:'Yahoo',       icon:'icons/yahoo.ico' },
    brave:      { name:'Brave',       icon:'icons/brave.ico' },
    yandex:     { name:'Yandex',      icon:'icons/yandex.ico' },
    qwant:      { name:'Qwant',       icon:'icons/qwant.ico' },
    startpage:  { name:'Startpage',   icon:'icons/startpage.ico' },
    youtube:    { name:'YouTube',     icon:'icons/youtube.ico' },
    perplexity: { name:'Perplexity',  icon:'icons/perplexity.ico' },
    felo:       { name:'Felo AI',     icon:'icons/felo.svg' },
    copilot:    { name:'Copilot',     icon:'icons/copilot.ico' },
    qwen:       { name:'Qwen',        icon:'icons/qwen.ico' },
    grok:       { name:'Grok',        icon:'icons/grok.ico' },
    scira:      { name:'Scira',       icon:'icons/scira.ico' },
    you:        { name:'You.com',     icon:'icons/youcom.ico' },
    chatgpt:    { name:'ChatGPT',     icon:'icons/chatgpt.ico' },
    sigma:      { name:'Sigma',       icon:'icons/1737888523296-SigmaLogoSquare1.png' },
    mistral:    { name:'Mistral',     icon:'icons/mistral.ico' },
    iask:       { name:'iAsk',        icon:'icons/iask.ico' },
    yep:        { name:'Yep',         icon:'icons/yep.ico' },
    blackbox:   { name:'Blackbox',    icon:'icons/blackbox.ico' },
    ecosia:     { name:'Ecosia',      icon:'icons/ecosia.ico' },
    aol:        { name:'AOL',         icon:'icons/aol.ico' },
    kagi:       { name:'Kagi',        icon:'icons/Kagi_Search_Engine_Icon.png' },
    presearch:  { name:'Presearch',   icon:'icons/presearch.ico' },
    archive:    { name:'Archive',     icon:'icons/Internet_Archive_logotype.png' },
    wikipedia:  { name:'Wikipedia',   icon:'icons/wikipedia.ico' },
    reddit:     { name:'Reddit',      icon:'icons/reddit.ico' },
    facebook:   { name:'Facebook',    icon:'icons/facebook.ico' },
    pinterest:  { name:'Pinterest',   icon:'icons/pinterest.ico' },
    github:     { name:'GitHub',      icon:'icons/github.ico' },
    dailymotion:{ name:'Dailymotion', icon:'icons/dailymotion.ico' },
    x:          { name:'X',           icon:'icons/x.ico' },
    threads:    { name:'Threads',     icon:'icons/threads-app-icon.png' },
    vimeo:      { name:'Vimeo',       icon:'icons/vimeo.ico' },
    rumble:     { name:'Rumble',      icon:'icons/rumble.ico' },
    tiktok:     { name:'TikTok',      icon:'icons/tiktok.ico' },
    twitch:     { name:'Twitch',      icon:'icons/3991943.png' },
    rutube:     { name:'Rutube',      icon:'icons/Rutube_icon.svg.png' },
    bilibili:   { name:'Bilibili',    icon:'icons/bilibili.ico' },
};

// ── Build Top Use from history ────────────────────────────────────────────
function epBuildTopUse() {
    const listEl = document.getElementById('epTopUseList');
    if (!listEl) return;

    chrome.storage.local.get(['searchHistory'], (result) => {
        const hist = result.searchHistory || searchHistory || [];

        // Count by normalizeEngineName output (e.g. "Google", "YouTube")
        const engMap = {};
        hist.forEach(item => {
            if (item.engines && typeof item.engines === 'object') {
                Object.entries(item.engines).forEach(([e, c]) => {
                    const n = normalizeEngineName(e);
                    engMap[n] = (engMap[n] || 0) + (parseInt(c) || 1);
                });
            } else if (item.engine) {
                const n = normalizeEngineName(item.engine);
                engMap[n] = (engMap[n] || 0) + (parseInt(item.count, 10) || 1);
            }
        });

        const sorted = Object.entries(engMap).sort((a, b) => b[1] - a[1]).slice(0, 12);

        if (!sorted.length) {
            listEl.innerHTML = `<div class="ep-empty">
                <div class="ep-empty-ico">📊</div>
                <div class="ep-empty-txt">Start searching to see<br>your most used engines here</div>
            </div>`;
            const t = document.getElementById('epTopTag');
            if (t) t.textContent = '';
            epHideTopFromGroups([]);
            return;
        }

        // Build reverse map: normalizeEngineName output → engine key
        // e.g. "Google"→"google", "YouTube"→"youtube", "Felo"→"felo", "You.com"→"you"
        const normToKey = {};
        Object.entries(EP_ENGINE_INFO).forEach(([key, info]) => {
            // Map by display name
            normToKey[info.name.toLowerCase()] = key;
            // Also map by normalizeEngineName(key) output
            normToKey[normalizeEngineName(key).toLowerCase()] = key;
        });

        listEl.innerHTML = sorted.map(([normName, cnt], i) => {
            const key  = normToKey[normName.toLowerCase()];
            const info = key ? EP_ENGINE_INFO[key] : null;
            if (!info) return '';
            const rank = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
            return `<div class="engine-item" data-engine="${key}" data-name="${info.name}" data-icon="${info.icon}"
                role="option" tabindex="-1" style="--ii:${i}">
                <img src="${info.icon}" class="engine-icon" alt="">
                <span>${info.name}</span>
                ${rank ? `<span class="ep-top-rank">${rank}</span>` : ''}
                <span class="ep-top-badge">${cnt}×</span>
            </div>`;
        }).filter(Boolean).join('');

        // Tag
        const tag = document.getElementById('epTopTag');
        if (tag) tag.textContent = `Top ${sorted.length}`;

        // Count
        const countEl = document.getElementById('epCount');
        if (countEl) {
            const total = document.querySelectorAll('#enginePopup .engine-item[data-engine]').length;
            countEl.textContent = total + ' engines';
        }

        // Click listeners
        listEl.querySelectorAll('.engine-item').forEach(item => {
            item.addEventListener('click', () => {
                const eng = item.dataset.engine;
                if (!eng) return;
                selectedEngine = eng;
                if (typeof updateEngineUI === 'function') updateEngineUI(eng);
                chrome.storage.local.set({ selectedEngine: eng });
                document.getElementById('enginePopup')?.classList.add('hidden');
                document.getElementById('engineBtn')?.setAttribute('aria-expanded', 'false');
                if (typeof updateSearchButtonIcon === 'function') updateSearchButtonIcon(eng);
            });
        });

        // Hide top engines from their original groups (no duplicates)
        const topKeys = sorted.map(([dn]) => normToKey[dn.toLowerCase()]).filter(Boolean);
        epHideTopFromGroups(topKeys);
        epMarkActive();
    });
}

function epHideTopFromGroups(topKeys) {
    // Restore all first
    document.querySelectorAll('#enginePopup .ep-dup-hidden').forEach(el => {
        el.classList.remove('ep-dup-hidden');
    });
    // Hide duplicates
    topKeys.forEach(key => {
        document.querySelectorAll(
            `#enginePopup .engine-group:not(#epTopUseGroup) .engine-item[data-engine="${key}"]`
        ).forEach(el => el.classList.add('ep-dup-hidden'));
    });
}

function epMarkActive() {
    document.querySelectorAll('#enginePopup .engine-item').forEach(el => {
        el.classList.toggle('active', el.dataset.engine === selectedEngine);
    });
    // Update button icon + name
    const info = EP_ENGINE_INFO[selectedEngine];
    if (info) {
        const ico = document.getElementById('engBtnIcon');
        const nm  = document.querySelector('#engineBtn .selected-engine');
        if (ico) ico.src = info.icon;
        if (nm)  nm.textContent = info.name;
    }
}



// থিম পপআপ টগল করা
function toggleThemesPopup() {
    const popup = document.getElementById('themesPopup');
    if (popup) {
        popup.classList.toggle('hidden');
        // Init tabs on first open
        if (!popup.classList.contains('hidden') && !popup._tabsInit) {
            initThemesTabs(popup);
            popup._tabsInit = true;
        }
    }
    // Close other popups
    const popups = ['settingsPopup', 'enginePopup', 'appsPopup'];
    popups.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    });
}

function initThemesTabs(popup) {
    // ── Tab switching ────────────────────────────────────────────────
    const tabs   = popup.querySelectorAll('.tp-tab');
    const panels = popup.querySelectorAll('.tp-panel');
    if (!tabs.length) return;
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = tab.dataset.tab;
            tabs.forEach(t => { t.classList.remove('tp-tab-active'); t.setAttribute('aria-selected','false'); });
            tab.classList.add('tp-tab-active');
            tab.setAttribute('aria-selected','true');
            panels.forEach(p => p.classList.add('tp-hidden'));
            const panel = popup.querySelector('#tp-' + target);
            if (panel) panel.classList.remove('tp-hidden');
        });
    });

    // ── Filter buttons — apply directly (20 effects) ───────────────
    const filterBtns = popup.querySelectorAll('.tp-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = btn.dataset.filter;
            filterBtns.forEach(b => b.classList.remove('tp-filter-active'));
            btn.classList.add('tp-filter-active');
            if (typeof applyBackgroundFilter === 'function') {
                applyBackgroundFilter(val);
            }
        });
    });

    // Sync active button with current saved filter
    chrome.storage.local.get(['backgroundFilter'], (r) => {
        const cur = r.backgroundFilter || 'none';
        filterBtns.forEach(b => {
            b.classList.toggle('tp-filter-active', b.dataset.filter === cur);
        });
    });
}


// অ্যাপ পপআপ টগল করা
function toggleAppsPopup() {
    const popup = document.getElementById('appsPopup');
    if (popup) {
        popup.classList.toggle('hidden');
    }

    // অন্যান্য পপ-আপ গুলো লুকানো
    const popups = ['settingsPopup', 'enginePopup', 'themesPopup'];
    popups.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    });
}


// ব্যাকগ্রাউন্ড ইমেজ আপলোড হ্যান্ডল করা
function handleBackgroundImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // জনপ্রিয় ১০+ ইমেজ ফরম্যাট সাপোর্ট
    const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'image/bmp', 'image/svg+xml', 'image/tiff', 'image/x-icon',
        'image/heic', 'image/heif', 'image/avif'
    ];

    const maxSize = 5 * 1024 * 1024; // 5MB

    // ফাইল টাইপ এবং আকার চেক করা
    if (!validTypes.includes(file.type) || file.size > maxSize) {
        displayError(event.target);
        return;
    }

    compressImage(file, (compressedData) => {
        if (compressedData) {
            document.body.style.backgroundImage = `url(${compressedData})`;
            chrome.storage.local.set({ backgroundImage: compressedData });
            togglePopupVisibility('themesPopup');
        }
    });

    event.target.value = '';
}


// ব্যাকগ্রাউন্ড ফিল্টার প্রয়োগ করা
function applyBackgroundFilter(filter) {
    // Remove all existing effect classes
    [...document.body.classList].forEach(cls => {
        if (cls.startsWith('filter-') || cls.startsWith('fx-')) {
            document.body.classList.remove(cls);
        }
    });
    document.body.classList.remove('effect-on');
    if (filter && filter !== 'none') {
        document.body.classList.add(filter);
        document.body.classList.add('effect-on');
    }
    chrome.storage.local.set({ backgroundFilter: filter || 'none' });
}

// ব্যাকগ্রাউন্ড ইমেজ মুছে ফেলা
function removeBackgroundImage() {
    document.body.style.backgroundImage = '';
    [...document.body.classList].forEach(c => { if(c.startsWith('filter-')||c.startsWith('fx-')) document.body.classList.remove(c); });
    chrome.storage.local.remove(['backgroundImage', 'backgroundFilter']);
    resetFilterSelection();
    togglePopupVisibility('themesPopup');
}

// ত্রুটি দেখানোর ফাংশন
function displayError(element) {
    if (element) {
        element.classList.add('error');
        setTimeout(() => {
            element.classList.remove('error');
        }, 1000);
    }
}

// পপ-আপ লুকানো বা প্রদর্শন করার ফাংশন
function togglePopupVisibility(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.add('hidden');
    }
}

// ব্যাকগ্রাউন্ড ফিল্টার রিসেট করা
function resetFilterSelection() {
    const filterSelect = document.getElementById('backgroundFilter');
    if (filterSelect) {
        filterSelect.value = 'none';
    }
}




// উচ্চ-মানের আইকন লোড করা
async function loadHighQualityIcon(url, imgElement) {
    try {
        console.log(`Attempting to load icon for ${url}`);

        // ক্যাশে আইকন আছে কিনা চেক করা
        if (iconCache.has(url)) {
            imgElement.src = iconCache.get(url);
            imgElement.classList.add('loaded');
            return;
        }

        // URL থেকে ডোমেইন বের করা
        let domain;
        try {
            domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        } catch {
            imgElement.src = defaultIcon;
            imgElement.classList.add('loaded');
            iconCache.set(url, defaultIcon);
            return;
        }

        // একাধিক ফেভিকন API চেষ্টা করা
        const faviconApis = [
            `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            `https://i.olsh.me/icon?url=${domain}&size=128`
        ];

        // ফেভিকন API থেকে সফল ফলাফল পাওয়ার জন্য অ্যাসিঙ্ক্রোনাস প্রক্রিয়া
        for (const api of faviconApis) {
            try {
                const response = await fetch(api); // এখানে fetch ব্যবহার করা হয়েছে
                if (response.ok) {
                    const faviconUrl = api; // সফল হলে URL সেট করা
                    imgElement.src = faviconUrl;
                    imgElement.classList.add('loaded');
                    iconCache.set(url, faviconUrl); // ক্যাশে যোগ করা
                    return;
                }
                // API প্রতিক্রিয়া ব্যর্থ হলে আগের API চেষ্টা করা হবে
            } catch (error) {
                console.warn(`Favicon API failed for ${api}:`, error);
                continue;
            }
        }

        // সব API ব্যর্থ হলে ডিফল্ট আইকন
        imgElement.src = defaultIcon;
        imgElement.classList.add('loaded');
        iconCache.set(url, defaultIcon);
    } catch (error) {
        console.error('আইকন লোডে ত্রুটি:', error);
        imgElement.src = defaultIcon;
        imgElement.classList.add('loaded');
        iconCache.set(url, defaultIcon);
    }
}





// Helper function to save shortcuts with error handling
function saveShortcuts(callback = () => {}) {
    chrome.storage.local.set({ shortcuts }, (result) => {
        if (chrome.runtime.lastError) {
            console.error('Failed to save shortcuts:', chrome.runtime.lastError);
            callback(chrome.runtime.lastError);
        } else {
            callback(null);
        }
    });
}

// Helper function to load shortcuts
function loadShortcuts(callback) {
    chrome.storage.local.get(['shortcuts'], (result) => {
        if (chrome.runtime.lastError) {
            console.error('Failed to load shortcuts:', chrome.runtime.lastError);
            callback([]);
        } else {
            shortcuts = Array.isArray(result.shortcuts) ? result.shortcuts : [];
            callback(shortcuts);
        }
    });
}

// Function to add a new shortcut (example implementation)
function addShortcut(shortcut, callback = () => {}) {
    if (!shortcut?.name || !shortcut?.url) {
        console.warn('Invalid shortcut:', shortcut);
        callback(new Error('Invalid shortcut'));
        return;
    }

    // Check for duplicates by URL
    const exists = shortcuts.some((s) => s.url === shortcut.url);
    if (exists) {
        console.warn('Shortcut already exists:', shortcut.url);
        callback(new Error('Shortcut already exists'));
        return;
    }

    shortcuts.push(shortcut);
    saveShortcuts((err) => {
        if (err) {
            callback(err);
        } else {
            updateShortcuts();
            callback(null);
        }
    });
}

// Function to create a letter icon when image fails to load
function createLetterIcon(name) {
    // Get the first character of the name
    const firstLetter = name.charAt(0).toUpperCase();
    
    // Create a data URL for an SVG containing the letter
    const colors = [
        '#4285F4', '#EA4335', '#FBBC05', '#34A853', // Google colors
        '#1877F2', '#E04A3F', '#8A2BE2', '#00BFFF', // Various blues and reds
        '#FF6347', '#2E8B57', '#9932CC', '#FF8C00'  // Various colors
    ];
    
    // Use a hash of the name to pick a consistent color
    const colorIndex = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
    const bgColor = colors[colorIndex];
    
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="20" fill="${bgColor}"/>
        <text x="50" y="50" font-family="Arial, sans-serif" font-size="50" font-weight="bold" 
              fill="white" text-anchor="middle" dominant-baseline="central">${firstLetter}</text>
    </svg>
    `;
    
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function updateShortcuts() {
    const grid = document.getElementById('shortcutsGrid');
    if (!grid) {
        console.error('Shortcuts grid element not found');
        return;
    }
   // --- এই নতুন কোডটুকু যোগ করুন (শুরু) ---
    // "Add Shortcut" বাটনটি হাইড/শো করার নতুন লজিক
    const addShortcutBtn = document.getElementById('addShortcutBtn');
    const maxShortcuts = 10; // আপনার নির্ধারিত লিমিট

    if (addShortcutBtn) {
        if (Array.isArray(shortcuts) && shortcuts.length >= maxShortcuts) {
            addShortcutBtn.style.display = 'none'; // সরাসরি হাইড করা হলো
            addShortcutBtn.setAttribute('aria-hidden', 'true');
        } else {
            addShortcutBtn.style.display = ''; // হাইড অবস্থা তুলে ফেলা হলো
            addShortcutBtn.setAttribute('aria-hidden', 'false');
        }
    }
    // --- এই নতুন কোডটুকু যোগ করুন (শেষ) ---

    if (!Array.isArray(shortcuts)) {
        console.warn('Shortcuts array is not defined or invalid');
        shortcuts = [];
    }

    const fragment = document.createDocumentFragment();

    // ... (ফাংশনের বাকি কোড অপরিবর্তিত থাকবে) ...


    

    shortcuts.forEach((shortcut, index) => {
        if (!shortcut?.name || !shortcut?.url) {
            console.warn(`Invalid shortcut at index ${index}`, shortcut);
            return;
        }

        const div = document.createElement('div');
        div.className = 'shortcut-item';
        div.draggable = true;
        div.dataset.index = index;
        div.setAttribute('aria-label', `Visit ${sanitizeHTML(shortcut.name)}`);
        
        // Use letter icon as default instead of defaultIcon
        const initialIcon = shortcut.icon || createLetterIcon(shortcut.name);
        
        // Build the HTML structure including the icon
        div.innerHTML = `
            <img src="${sanitizeHTML(initialIcon)}" alt="${sanitizeHTML(shortcut.name)} icon" class="shortcut-icon ${!shortcut.icon ? 'letter-icon' : ''}">
            <span>${sanitizeHTML(shortcut.name)}</span>
            <button class="menu-btn" aria-label="More options for ${sanitizeHTML(shortcut.name)}" aria-expanded="false">⁝</button>
            <div class="shortcut-menu hidden" data-index="${index}">
                <button class="edit-option" aria-label="Edit ${sanitizeHTML(shortcut.name)}"><span class="icon">✏️</span>Edit</button>
                <button class="delete-option" aria-label="Delete ${sanitizeHTML(shortcut.name)}"><span class="icon">🗑️</span>Delete</button>
            </div>
        `;
        
        // Get the img element after HTML has been set
        const img = div.querySelector('.shortcut-icon');
        
        // Handle image errors - replace with letter icon
        img.onerror = () => {
            img.src = createLetterIcon(shortcut.name);
            img.classList.add('letter-icon');
            img.classList.add('loaded');
        };
        
        // If icon is provided, mark as loaded but still handle errors
        if (shortcut.icon) {
            img.classList.add('loaded');
        } 
        // If no icon is provided, try to load one from the URL
        else {
            // We already set the letter icon as default, but try to load a better one
            loadHighQualityIcon(shortcut.url, img).then((success) => {
                if (success) {
                    img.classList.remove('letter-icon');
                }
                img.classList.add('loaded');
            }).catch((err) => {
                console.error(`Failed to load icon for ${shortcut.url}:`, err);
                // We already have the letter icon, just add loaded class
                img.classList.add('loaded');
            });
        }

        div.addEventListener('click', (e) => {
            if (e.target.closest('.menu-btn') || e.target.closest('.shortcut-menu')) return;
            try {
                const url = new URL(shortcut.url);
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    console.warn('Invalid URL protocol:', shortcut.url);
                    return;
                }
                window.location.href = url.href;
            } catch (err) {
                console.error('Invalid URL:', shortcut.url, err);
            }
        });

        const menuBtn = div.querySelector('.menu-btn');
        const menu = div.querySelector('.shortcut-menu');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !menu.classList.contains('hidden');
            grid.querySelectorAll('.shortcut-menu').forEach(m => m.classList.add('hidden'));
            grid.querySelectorAll('.menu-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
            if (!isOpen) {
                menu.classList.remove('hidden');
                menuBtn.setAttribute('aria-expanded', 'true');
                const editOption = menu.querySelector('.edit-option');
                if (editOption) editOption.focus();
            }
        });

        div.querySelector('.edit-option').addEventListener('click', () => {
            if (typeof openShortcutModal === 'function') {
                openShortcutModal(shortcut, index);
            } else {
                console.warn('openShortcutModal is not defined');
            }
            menu.classList.add('hidden');
            menuBtn.setAttribute('aria-expanded', 'false');
        });

        div.querySelector('.delete-option').addEventListener('click', () => {
            div.className = 'shortcut-item removed';
            div.addEventListener(
                'transitionend',
                () => {
                    shortcuts.splice(index, 1);
                    saveShortcuts((err) => {
                        if (err) {
                            console.error('Failed to delete shortcut:', err);
                            // Optionally, reload shortcuts to ensure consistency
                            loadShortcuts(() => updateShortcuts());
                        } else {
                            updateShortcuts();
                        }
                    });
                },
                { once: true }
            );
            menu.classList.add('hidden');
            menuBtn.setAttribute('aria-expanded', 'false');
        });

        div.addEventListener('dragstart', (e) => {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', index);
            grid.querySelectorAll('.shortcut-menu').forEach(m => m.classList.add('hidden'));
        });

        div.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });

        div.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        div.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = parseInt(e.target.closest('.shortcut-item')?.dataset.index);
            if (fromIndex === toIndex || isNaN(fromIndex) || isNaN(toIndex)) {
                return;
            }
            const [moved] = shortcuts.splice(fromIndex, 1);
            shortcuts.splice(toIndex, 0, moved);
            saveShortcuts((err) => {
                if (err) {
                    console.error('Failed to reorder shortcuts:', err);
                    loadShortcuts(() => updateShortcuts());
                } else {
                    updateShortcuts();
                }
            });
        });

        div.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                if (index > 0) {
                    const [moved] = shortcuts.splice(index, 1);
                    shortcuts.splice(index - 1, 0, moved);
                    saveShortcuts((err) => {
                        if (err) {
                            console.error('Failed to reorder shortcuts:', err);
                            loadShortcuts(() => updateShortcuts());
                        } else {
                            updateShortcuts();
                            grid.children[index - 1].focus();
                        }
                    });
                }
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                if (index < shortcuts.length - 1) {
                    const [moved] = shortcuts.splice(index, 1);
                    shortcuts.splice(index + 1, 0, moved);
                    saveShortcuts((err) => {
                        if (err) {
                            console.error('Failed to reorder shortcuts:', err);
                            loadShortcuts(() => updateShortcuts());
                        } else {
                            updateShortcuts();
                            grid.children[index + 1].focus();
                        }
                    });
                }
            }
        });

        fragment.appendChild(div);
    });

    grid.innerHTML = '';
    grid.appendChild(fragment);
}

// Add CSS for letter icons only - preserves original styles
const addLetterIconStyles = () => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .letter-icon {
            border-radius: 8px;
            object-fit: contain;
        }
    `;
    document.head.appendChild(styleElement);
};

// Initialize shortcuts on load
document.addEventListener('DOMContentLoaded', () => {
    addLetterIconStyles();
    loadShortcuts(() => updateShortcuts());
});





// শর্টকাট মডাল খোলা
function openShortcutModal(shortcut = null, index = null) {
    // DOM elements
    const modal = document.getElementById('shortcutModal');
    const title = document.getElementById('modalTitle');
    const nameInput = document.getElementById('shortcutName');
    const urlInput = document.getElementById('shortcutUrl');
    const saveBtn = document.getElementById('saveShortcutBtn');
    const cancelBtn = document.getElementById('cancelShortcutBtn');
    const addShortcutBtn = document.getElementById('addShortcutBtn');

    // Validate DOM elements
    if (!modal || !title || !nameInput || !urlInput || !saveBtn || !cancelBtn) {
        console.error('Required modal elements are missing');
        return;
    }

    // Prevent opening if modal is already open
    if (!modal.classList.contains('hidden')) {
        console.warn('Modal is already open');
        return;
    }

    // Set modal attributes for accessibility
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modalTitle');

    // Initialize modal content
    title.textContent = shortcut ? 'Edit Shortcut' : 'Add Shortcut';
    nameInput.value = shortcut?.name ? sanitizeHTML(shortcut.name) : '';
    urlInput.value = shortcut?.url ? sanitizeHTML(shortcut.url) : '';

    // Show modal
    modal.classList.remove('hidden');
    nameInput.focus();

    // Event handlers
    const saveHandler = () => {
        if (typeof saveShortcut === 'function') {
            saveShortcut(shortcut, index);
        } else {
            console.warn('saveShortcut function is not defined');
        }
    };

    const keyHandler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveHandler();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeModal();
        }
    };

    const trapFocus = (e) => {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    };

    // Attach event listeners
    saveBtn.addEventListener('click', saveHandler);
    cancelBtn.addEventListener('click', closeModal);
    nameInput.addEventListener('keydown', keyHandler);
    urlInput.addEventListener('keydown', keyHandler);
    modal.addEventListener('keydown', trapFocus);

    // Close modal function
    function closeModal() {
        modal.classList.add('hidden');
        // Clean up event listeners
        saveBtn.removeEventListener('click', saveHandler);
        cancelBtn.removeEventListener('click', closeModal);
        nameInput.removeEventListener('keydown', keyHandler);
        urlInput.removeEventListener('keydown', keyHandler);
        modal.removeEventListener('keydown', trapFocus);
        // Reset modal attributes
        modal.removeAttribute('role');
        modal.removeAttribute('aria-modal');
        modal.removeAttribute('aria-labelledby');
        // Restore focus
        if (addShortcutBtn) {
            addShortcutBtn.focus();
        } else {
            document.body.focus();
        }
    }
}



async function saveShortcut(shortcut = null, index = null) {
    // DOM elements
    const nameInput = document.getElementById('shortcutName');
    const urlInput = document.getElementById('shortcutUrl');
    const modal = document.getElementById('shortcutModal');

    // Validate DOM elements
    if (!nameInput || !urlInput || !modal) {
        console.error('Required DOM elements are missing');
        return;
    }

    // Validate dependencies
    if (!Array.isArray(shortcuts)) {
        console.error('Shortcuts array is not defined or invalid');
        return;
    }

    const name = sanitizeHTML(nameInput.value.trim());
    const url = sanitizeHTML(urlInput.value.trim());
    let hasError = false;

    // Validate name
    if (!name) {
        setInputError(nameInput, 'Please enter a name');
        hasError = true;
    } else if (name.length > 50) {
        setInputError(nameInput, 'Name is too long (max 50 characters)');
        hasError = true;
    }

    // Validate and normalize URL
    let formattedUrl;
    try {
        formattedUrl = normalizeURL(url);
        if (!formattedUrl || !isValidURL(formattedUrl)) {
            throw new Error('Invalid URL');
        }
    } catch (err) {
        setInputError(urlInput, 'Please enter a valid URL');
        hasError = true;
    }

    if (hasError) return;

    // Check for duplicate URL
    const isDuplicate = shortcuts.some((s, i) => {
        // Skip the current shortcut during edit
        if (index !== null && i === index) return false;
        return normalizeURL(s.url) === formattedUrl;
    });

    if (isDuplicate) {
        setInputError(urlInput, 'This URL is already added as a shortcut');
        showErrorMessage('A shortcut with this URL already exists. Please use a different URL.');
        return;
    }

    // Generate favicon URL
    const icon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(formattedUrl)}&sz=128`;

    // Update or add shortcut
    try {
        if (shortcut && index !== null && Number.isInteger(index) && index >= 0 && index < shortcuts.length) {
            shortcuts[index] = { name, url: formattedUrl, icon };
        } else {
            if (shortcuts.length >= 10) {
                showErrorMessage('Maximum 10 shortcuts allowed');
                return;
            }
            shortcuts.push({ name, url: formattedUrl, icon });
        }

        // Save to storage
        await saveToStorage({ shortcuts });

        // Update UI
        updateShortcuts();
        closeModal();
        showSuccessMessage(shortcut ? 'Shortcut updated' : 'Shortcut added');
    } catch (err) {
        console.error('Failed to save shortcut:', err);
        showErrorMessage('Failed to save shortcut. Please try again.');
    }
}

// Advanced URL normalization
function normalizeURL(url) {
    try {
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }

        const parsed = new URL(url);

        // Only allow http or https
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Invalid protocol');
        }

        // Remove 'www.' for consistency
        let hostname = parsed.hostname.replace(/^www\./i, '');

        // Remove trailing slashes from pathname
        let pathname = parsed.pathname.replace(/\/+$/, '');

        // Remove default ports (80 for http, 443 for https)
        const port = parsed.port && !['80', '443'].includes(parsed.port) ? `:${parsed.port}` : '';

        // Reconstruct normalized URL
        return `${parsed.protocol}//${hostname.toLowerCase()}${port}${pathname}${parsed.search}`.toLowerCase();
    } catch {
        return null;
    }
}

// Validate URL
function isValidURL(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

// Helper function to set input error state
function setInputError(input, message) {
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
    const errorId = `${input.id}-error`;
    let errorElement = document.getElementById(errorId);
    if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.id = errorId;
        errorElement.className = 'error-message';
        errorElement.style.color = 'red';
        errorElement.style.fontSize = '0.8em';
        input.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
    input.setAttribute('aria-describedby', errorId);

    // Clear error after 3 seconds
    setTimeout(() => {
        input.classList.remove('error');
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        errorElement.textContent = '';
    }, 3000);
}

// Helper function to save to storage
async function saveToStorage(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

// Helper function to close modal
function closeModal() {
    const modal = document.getElementById('shortcutModal');
    const addShortcutBtn = document.getElementById('addShortcutBtn');
    if (modal) {
        modal.classList.add('hidden');
        modal.removeAttribute('role');
        modal.removeAttribute('aria-modal');
        modal.removeAttribute('aria-labelledby');
        // Restore focus
        if (addShortcutBtn) {
            addShortcutBtn.focus();
        } else {
            document.body.focus();
        }
    }
}

// Placeholder for showing success/error messages
function showSuccessMessage(message) {
    console.log('Success:', message); // Replace with toast or alert
}

function showErrorMessage(message) {
    console.error('Error:', message); // Replace with toast or alert
}

// Helper function to set input error state
function setInputError(input, message) {
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
    const errorId = `${input.id}-error`;
    let errorElement = document.getElementById(errorId);
    if (!errorElement) {
        errorElement = document.createElement('span');
        errorElement.id = errorId;
        errorElement.className = 'error-message';
        errorElement.style.color = 'red';
        errorElement.style.fontSize = '0.8em';
        input.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
    input.setAttribute('aria-describedby', errorId);

    // Clear error after 3 seconds
    setTimeout(() => {
        input.classList.remove('error');
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        errorElement.textContent = '';
    }, 3000);
}

// Helper function to save to storage
async function saveToStorage(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

// Helper function to close modal
function closeModal() {
    const modal = document.getElementById('shortcutModal');
    const addShortcutBtn = document.getElementById('addShortcutBtn');
    if (modal) {
        modal.classList.add('hidden');
        modal.removeAttribute('role');
        modal.removeAttribute('aria-modal');
        modal.removeAttribute('aria-labelledby');
        // Restore focus
        if (addShortcutBtn) {
            addShortcutBtn.focus();
        } else {
            document.body.focus();
        }
    }
}


// Placeholder for isValidURL (replace with actual implementation)
function isValidURL(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

// Placeholder for formatURL (replace with actual implementation)
function formatURL(url) {
    try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        return parsed.href;
    } catch {
        return null;
    }
}

// Placeholder for showing success/error messages (replace with actual UI)
function showSuccessMessage(message) {
    console.log('Success:', message); // Replace with toast or alert
}

function showErrorMessage(message) {
    console.error('Error:', message); // Replace with toast or alert
}




// ইভেন্ট লিসেনার সেটআপ করা


// ── Themes Popup Tab System ──────────────────────────────────────────────
let _tpTabsInited = false;

function setupEventListeners() {
    setupVoiceSearch();
    setupClearButton(); // ক্লিয়ার বাটন তৈরি করুন
    // Store listeners for cleanup
    const listeners = new Map();

    // Helper to add listeners with cleanup tracking
    const addListener = (element, event, handler) => {
        if (element) {
            element.addEventListener(event, handler);
            listeners.set(`${element.id || element.className}-${event}`, { element, event, handler });
        } else {
            console.warn(`Element for ${event} listener not found`);
        }
    };

    // Search button
    addListener(document.getElementById('searchButton'), 'click', () => {
        if (typeof search === 'function') {
            search();
        } else {
            console.warn('search function is not defined');
        }
    });

    // Settings button
    addListener(document.getElementById('settingsBtn'), 'click', (e) => {
        e.stopPropagation();
        if (typeof toggleSettingsPopup === 'function') {
            toggleSettingsPopup();
        } else {
            console.warn('toggleSettingsPopup function is not defined');
        }
    });

    // Engine button
    addListener(document.getElementById('engineBtn'), 'click', (e) => {
        e.stopPropagation();
        if (typeof toggleEnginePopup === 'function') {
            toggleEnginePopup();
        } else {
            console.warn('toggleEnginePopup function is not defined');
        }
    });

    // Apps button
    addListener(document.getElementById('appsBtn'), 'click', (e) => {
        e.stopPropagation();
        if (typeof toggleAppsPopup === 'function') {
            toggleAppsPopup();
        } else {
            console.warn('toggleAppsPopup function is not defined');
        }
    });

    // Theme toggle
    addListener(document.getElementById('themeToggle'), 'click', () => {
        if (typeof toggleTheme === 'function') {
            toggleTheme();
        } else {
            console.warn('toggleTheme function is not defined');
        }
    });

    // Themes button
    addListener(document.getElementById('themesBtn'), 'click', (e) => {
        e.stopPropagation();
        if (typeof toggleThemesPopup === 'function') {
            toggleThemesPopup();
        } else {
            console.warn('toggleThemesPopup function is not defined');
        }
    });


    // Clear history — এখন সরাসরি ডিলিট না করে History Stats Popup খোলে
    addListener(document.getElementById('clearHistoryBtn'), 'click', () => {
        if (typeof openHistoryStatsPopup === 'function') {
            openHistoryStatsPopup();
        }
    });
    // --- নতুন যোগ করা কোড ---

    // Export Settings বাটন
    addListener(document.getElementById('exportSettingsBtn'), 'click', () => {
        if (typeof exportSettings === 'function') {
            exportSettings();
        } else {
            console.warn('exportSettings function is not defined');
        }
    });

    // Import Settings বাটন (এটি ফাইল ইনপুট ট্রিগার করে)
    addListener(document.getElementById('importSettingsBtn'), 'click', () => {
        if (typeof importSettings === 'function') {
            importSettings();
        } else {
            console.warn('importSettings function is not defined');
        }
    });

    // লুকানো ফাইল ইনপুটটি ফাইল সিলেক্ট করলে কাজ করবে
    addListener(document.getElementById('importFileInput'), 'change', (e) => {
        if (typeof handleFileImport === 'function') {
            handleFileImport(e);
        } else {
            console.warn('handleFileImport function is not defined');
        }
    });

    // --- নতুন কোড শেষ ---

    // Background image upload
    addListener(document.getElementById('backgroundImageInput'), 'change', (e) => {
        if (typeof handleBackgroundImageUpload === 'function') {
            handleBackgroundImageUpload(e);
        } else {
            console.warn('handleBackgroundImageUpload function is not defined');
        }
    });

    // Background filter
    addListener(document.getElementById('backgroundFilter'), 'change', (e) => {
        if (typeof applyBackgroundFilter === 'function') {
            applyBackgroundFilter(e.target.value);
        } else {
            console.warn('applyBackgroundFilter function is not defined');
        }
    });

    // Remove background
    addListener(document.getElementById('removeBackgroundBtn'), 'click', () => {
        if (typeof removeBackgroundImage === 'function') {
            removeBackgroundImage();
        } else {
            console.warn('removeBackgroundImage function is not defined');
        }
    });

    // Search engine items
    const engineItems = document.querySelectorAll('.engine-item');
    engineItems.forEach((item) => {
        const handler = () => {
            const engine = sanitizeHTML(item.dataset.engine || '');
            if (!engine) {
                console.warn('Invalid engine data:', item.dataset.engine);
                return;
            }
            selectedEngine = engine;
            saveToStorage({ selectedEngine })
                .then(() => {
                    engineItems.forEach((i) => i.classList.remove('active'));
                    item.classList.add('active');
                    if (typeof updateEngineButtonText === 'function') {
                        updateEngineButtonText();
                    }
                    const popup = document.getElementById('enginePopup');
                    if (popup) {
                        popup.classList.add('hidden');
                        popup.setAttribute('aria-hidden', 'true');
                    }
                })
                .catch((err) => console.error('Failed to save engine:', err));
        };
        addListener(item, 'click', handler);
    });

    
   // Search input
    const searchInput = document.getElementById('searchInput');
  const searchBox = document.querySelector('.search-box');

 if (searchInput && searchBox) {
    // যখন searchBox ক্লিক হবে, তখন input এ ফোকাস হবে
    addListener(searchBox, 'click', () => {
        searchInput.focus();
    });
    addListener(searchInput, 'input', (e) => {
    let query = searchInput.value;
    
    // ১. ইঞ্জিন প্রিফিক্স চেক এবং আপডেট
    const cleanedQuery = updateSearchEngineFromInput(query);
    if (cleanedQuery !== query) {
        searchInput.value = cleanedQuery;
        query = cleanedQuery;
    }

    // ২. ইনলাইন অটো-কমপ্লিট লজিক (শুধুমাত্র ইংরেজি জন্য)
    const isDeleting = e.inputType?.includes('delete');
    
    // Regex চেক: কুয়েরি কি শুধুমাত্র ইংরেজি অক্ষর, সংখ্যা এবং স্পেস দিয়ে শুরু?
    // এটি বাংলা বা অন্য কোনো স্পেশাল ক্যারেক্টার থাকলে false দিবে।
    const isEnglish = /^[a-zA-Z0-9\s]+$/.test(query);

    if (!isDeleting && isEnglish && query.length > 0 && !query.startsWith('@')) {
        
        const lowerQuery = query.toLowerCase();
        const matches = searchHistory.filter(item => 
            item.query.toLowerCase().startsWith(lowerQuery)
        );

        if (matches.length > 0) {
            // আপনার পছন্দমতো: ছোট কিওয়ার্ড আগে (Length Priority)
            matches.sort((a, b) => a.query.length - b.query.length);

            const bestMatch = matches[0].query;
            const originalLength = query.length;

            // যদি ম্যাচ করা শব্দটি বর্তমান টাইপ করা শব্দের চেয়ে বড় হয়
            if (bestMatch.length > originalLength) {
                searchInput.value = query + bestMatch.substring(originalLength);
                // এক্সট্রা অংশটুকু হাইলাইট করা
                searchInput.setSelectionRange(originalLength, bestMatch.length);
            }
        }
    }

    // ৩. ওয়েব সাজেশন এবং ক্লিয়ার বাটন আপডেট
    // হাইলাইট করা অংশ বাদে শুধু ইউজারের টাইপ করা অংশটুকু পাঠানো হচ্ছে
    const currentTypedText = searchInput.value.substring(0, searchInput.selectionStart || searchInput.value.length);
    
    if (typeof updateSuggestions === 'function') {
        updateSuggestions(currentTypedText);
    }
    
    if (typeof updateClearButtonStatus === 'function') {
        updateClearButtonStatus();
    }
});
    addListener(searchInput, 'focus', () => {
        searchBox.classList.add('focused');
        if (typeof showHistory === 'function') {
            showHistory();
        }
    });
    
    // script.js ফাইলে, যেখানে searchInput-এর ইভেন্টগুলো যুক্ত করা হয়েছে:

// --- সার্চ বার ও ড্রপডাউন ডিজাইন এবং ক্লিক হ্যান্ডলিং (স্থায়ী সমাধান) ---
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBox = document.getElementById('searchBox');
    const historyDropdown = document.getElementById('historyDropdown');

    if (searchInput && searchBox) {
        // ইনপুট থেকে ফোকাস চলে গেলে
        searchInput.addEventListener('blur', (event) => {
            // relatedTarget চেক করে দেখা হচ্ছে ক্লিকটি ড্রপডাউনের ভেতরে কি না
            const isClickInsideDropdown = historyDropdown && historyDropdown.contains(event.relatedTarget);

            if (!isClickInsideDropdown) {
                // যদি ড্রপডাউনের বাইরে ক্লিক হয়, তবেই ডিজাইন গোল হবে
                searchBox.classList.remove('active-dropdown');
                if (historyDropdown) {
                    historyDropdown.classList.add('hidden');
                }
            }
        });

        // ইনপুটে ক্লিক করলে এবং ভেতরে লেখা থাকলে ডিজাইন আবার জোড়া লাগানো
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim() !== '') {
                const historyList = document.getElementById('historyList');
                // যদি সাজেশনে আইটেম থাকে তবেই ডিজাইন পরিবর্তন হবে
                if (historyList && historyList.children.length > 0) {
                    searchBox.classList.add('active-dropdown');
                    if (historyDropdown) {
                        historyDropdown.classList.remove('hidden');
                    }
                }
            }
        });
    }
});

    
    addListener(searchInput, 'input', debounce(async () => { // এখানে async যোগ করা হয়েছে
        activeHistoryIndex = -1;
        toggleClearButton(); // <--- এই লাইনটি যোগ করুন
        if (typeof updateSuggestions === 'function') {
            await updateSuggestions(searchInput.value); // নতুন ফাংশনকে কল করা হয়েছে
        }
    }, 250)); // API কলের জন্য সময় একটু বাড়ানো হলো
    
    addListener(searchInput, 'keydown', (e) => {
        const items = document.querySelectorAll('#historyList li:not(.history-empty)');
        const historyList = document.getElementById('historyList');
        
        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeHistoryIndex >= 0 && items.length > 0) {
                const queryElement = items[activeHistoryIndex].querySelector('.query');
                searchInput.value = queryElement ? sanitizeHTML(queryElement.textContent) : searchInput.value;
            }
            if (typeof search === 'function') {
                search();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeHistoryIndex = Math.min(activeHistoryIndex + 1, items.length - 1);
            if (typeof updateHistoryWithSuggestions === 'function') {
                updateHistoryWithSuggestions(searchInput.value);
            }
            if (items[activeHistoryIndex]) {
                const queryElement = items[activeHistoryIndex].querySelector('.query');
                searchInput.value = queryElement ? sanitizeHTML(queryElement.textContent) : searchInput.value;
                if (historyList) {
                    historyList.setAttribute('aria-activedescendant', items[activeHistoryIndex].id);
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeHistoryIndex = Math.max(activeHistoryIndex - 1, -1);
            if (typeof updateHistoryWithSuggestions === 'function') {
                updateHistoryWithSuggestions(searchInput.value);
            }
            if (activeHistoryIndex >= 0) {
                const queryElement = items[activeHistoryIndex].querySelector('.query');
                searchInput.value = queryElement ? sanitizeHTML(queryElement.textContent) : searchInput.value;
                if (historyList) {
                    historyList.setAttribute('aria-activedescendant', items[activeHistoryIndex].id);
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (typeof hideHistory === 'function') {
                hideHistory();
            }
        }
    });
} else {
    console.warn('Search input or search box not found');
}

// ==========================
// Clear Button Setup 
// ==========================
function setupClearButton() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn'); // এখন সরাসরি HTML থেকে নেবে
    
    if (!searchInput || !clearBtn) return;

    clearBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        searchInput.value = ''; 
        searchInput.focus(); 
        
        clearBtn.classList.add('hidden');
        try {
             if (typeof updateSuggestions === 'function') {
                updateSuggestions(''); 
            }
        } catch (error) {
            console.error('Failed to update suggestions:', error);
        }
    });
}

// ==========================
// Voice Search (Microphone) 
// ==========================
function setupVoiceSearch() {
    const micBtn = document.getElementById('micButton');
    const searchInput = document.getElementById('searchInput');

    if (!micBtn || !searchInput) return;

    // ব্রাউজারে স্পিচ রিকগনিশন আছে কিনা চেক করা
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        micBtn.style.display = 'none'; // সাপোর্ট না করলে বাটন হাইড হয়ে যাবে
        console.warn('Voice search is not supported in this browser.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            recognition.start();
        } catch (error) {
            console.error('Speech recognition error:', error);
        }
    });

    recognition.onstart = () => {
        micBtn.classList.add('listening');
        searchInput.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        searchInput.focus();
        
        if (typeof updateSuggestions === 'function') {
            updateSuggestions(transcript);
        }
        if (typeof toggleClearButton === 'function') {
            toggleClearButton();
        }
    };

    recognition.onerror = (event) => {
        console.error('Microphone error:', event.error);
        micBtn.classList.remove('listening');
        searchInput.placeholder = "Search or type a web URL...";
    };

    recognition.onend = () => {
        micBtn.classList.remove('listening');
        searchInput.placeholder = "Search or type a web URL...";
    };
}

/**
 * ইনপুট ভ্যালু এর উপর নির্ভর করে বাটনটি দেখাবে বা লুকাবে।
 */
function toggleClearButton() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput && clearBtn) {
        if (searchInput.value.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }
}

  // Global click handler
const clickHandler = (e) => {
    const settingsPopup = document.getElementById('settingsPopup');
    const themesPopup = document.getElementById('themesPopup');
    const enginePopup = document.getElementById('enginePopup');
    const appsPopup = document.getElementById('appsPopup');
    const shortcutModal = document.getElementById('shortcutModal');
    const historyDropdown = document.getElementById('historyDropdown');

    if (
        settingsPopup &&
        !e.target.closest('.settings') &&
        !e.target.closest('#settingsPopup') &&
        !e.target.closest('#themesPopup')
    ) {
        settingsPopup.classList.add('hidden');
        settingsPopup.setAttribute('aria-hidden', 'true');
    }
    if (themesPopup && !e.target.closest('.settings') && !e.target.closest('#themesPopup')) {
        themesPopup.classList.add('hidden');
        themesPopup.setAttribute('aria-hidden', 'true');
    }
    if (enginePopup && !e.target.closest('.engine-select') && !e.target.closest('#enginePopup')) {
        enginePopup.classList.add('hidden');
        enginePopup.setAttribute('aria-hidden', 'true');
    }
    if (appsPopup && !e.target.closest('.apps-menu') && !e.target.closest('#appsPopup')) {
        appsPopup.classList.add('hidden');
        appsPopup.setAttribute('aria-hidden', 'true');
    }
    if (historyDropdown && !e.target.closest('.search-box') && !e.target.closest('#historyDropdown')) {
        if (typeof hideHistory === 'function') {
            hideHistory();
        }
    }
    if (shortcutModal && !e.target.closest('.modal-content') && e.target.closest('#shortcutModal')) {
        shortcutModal.classList.add('hidden');
        shortcutModal.removeAttribute('role');
        shortcutModal.removeAttribute('aria-modal');
        const addShortcutBtn = document.getElementById('addShortcutBtn');
        if (addShortcutBtn) {
            addShortcutBtn.focus();
        }
    }
    if (!e.target.closest('.shortcut-menu') && !e.target.closest('.menu-btn')) {
        document.querySelectorAll('.shortcut-menu').forEach((m) => {
            m.classList.add('hidden');
            m.setAttribute('aria-hidden', 'true');
        });
        document.querySelectorAll('.menu-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    }
};
addListener(document, 'click', clickHandler); // সমস্যা: addListener ফাংশন সংজ্ঞায়িত নেই

// Global keydown handler
const keydownHandler = (e) => {
    if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        if (searchInput) { // সমস্যা: searchInput ভেরিয়েবল সংজ্ঞায়িত নেই
            searchInput.focus();
            searchInput.setAttribute('aria-label', 'Search input focused');
            setTimeout(() => searchInput.removeAttribute('aria-label'), 1000);
        }
    }
};
addListener(document, 'keydown', keydownHandler); // সমস্যা: addListener ফাংশন সংজ্ঞায়িত নেই

// Add shortcut button
addListener(document.getElementById('addShortcutBtn'), 'click', () => { // সমস্যা: addListener ফাংশন সংজ্ঞায়িত নেই
    if (typeof openShortcutModal === 'function') {
        openShortcutModal();
    } else {
        console.warn('openShortcutModal function is not defined');
    }
});

// Return cleanup function
return () => {
    listeners.forEach(({ element, event, handler }) => { // সমস্যা: listeners ভেরিয়েবল সংজ্ঞায়িত নেই
        element.removeEventListener(event, handler);
    });
    listeners.clear();
};
}

// Helper function to save to storage
async function saveToStorage(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

// Helper function to sanitize HTML
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Placeholder debounce function (replace with actual implementation)
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ডিবাউন্স ফাংশন
function debounce(fn, delay) { // সমস্যা: debounce ফাংশন আবার সংজ্ঞায়িত করা হয়েছে
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}








// --- বিভিন্ন ট্যাবের মধ্যে রিয়েল-টাইমে হিস্ট্রি সিঙ্ক করার জন্য লিসেনার ---
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.searchHistory) {
        // অন্য কোনো ট্যাবে হিস্ট্রি আপডেট হলে, এই ট্যাবের ভেরিয়েবলটি সাথে সাথে আপডেট হয়ে যাবে
        searchHistory = changes.searchHistory.newValue || [];
        
        // যদি মোট সার্চের কাউন্ট দেখানোর অপশন চালু থাকে, তবে সেটিও রিয়েল-টাইমে আপডেট হবে
        if (typeof updateTotalSearchCountDisplay === 'function') {
            updateTotalSearchCountDisplay();
        }
    }
});