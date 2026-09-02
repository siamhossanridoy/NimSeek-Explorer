# NimSeek Explorer

A Manifest V3 Chrome/Edge browser extension that replaces your **New Tab** page with a premium, all-in-one productivity hub — multi-engine search, a slide-out side panel browser, quick access to dozens of web apps, and a set of built-in mini-tools (Notes, Pomodoro timer, Spinner) — all wrapped in a fully customizable, theme-able interface.

---

## ✨ Features

### 🔍 Multi-Search
- One search box that can query dozens of engines and platforms — Google, Bing, DuckDuckGo, Yahoo, Ecosia, Qwant, Brave, Startpage, Presearch, AOL, Yandex, Kagi, Internet Archive — plus dedicated video search across YouTube, Rumble, Dailymotion, TikTok, Bilibili, Vimeo, and Rutube
- Type a URL directly to navigate, or type a query to search with your chosen default engine
- Drag-and-drop support: drop a link or selected text straight onto the page to search or navigate instantly

### 🪟 SideOpen (Side Panel Browsing)
- Open any link in Chrome's native **Side Panel** instead of a new tab, via a right-click context menu entry ("NimSeek SideOpen")
- Quick-launch buttons for popular AI chat tools (Gemini, Qwen, Phind, Mistral, Manus, Z.ai, You.com, Kimi, and more) directly inside the panel
- Remembers and restores the last-opened URL between sessions

### 🪄 Popup Dashboard
- A compact popup (`Ctrl+Shift+Y` / `Cmd+Shift+Y`) for quickly managing and launching your saved sites
- Search, sort (A–Z, Z–A, newest, custom order), and edit your shortcut grid without leaving the popup

### 🚀 Quick-Launch App Grid
- One-click shortcuts to 100+ popular services out of the box — Google Workspace (Docs, Sheets, Slides, Forms, Drive, Photos, Calendar, Meet, NotebookLM, Analytics, AI Studio), AI assistants (ChatGPT, Gemini, Copilot, DeepSeek, Grok), and major social/media platforms
- Fully customizable — add, remove, or reorder shortcuts to match your own workflow

### 🧰 Built-in Tools
| Tool | Description |
|---|---|
| **NimSeek Notes** | A lightweight, in-browser notebook for jotting down quick notes |
| **NS Pomodoro** | A Pomodoro-style focus/break timer for productivity sessions |
| **NS Spinner** | A random picker/decision-wheel utility |

### 🎨 Personalization
- Custom background images, gradients, and color themes with an instant-restore script (no flash of unstyled background on load)
- Light/dark theme support, persisted via `chrome.storage.local`
- User-script injection inside the side panel for advanced customization

---

## 🏗️ Architecture

Built entirely with vanilla HTML/CSS/JavaScript — no frameworks, no build step — on the Manifest V3 extension platform.

```
NimSeek Explorer/
├── manifest.json          # MV3 manifest — permissions, content scripts, new-tab override
├── background.js          # Service worker: side panel control, context menu, message routing
├── index.html             # New Tab page (search box, app grid, background/theme engine)
├── popup.html             # Toolbar popup dashboard
├── side_panel.html        # Side panel browser UI ("SideOpen")
├── assets/
│   ├── script.js          # New Tab logic: multi-search engines, app grid, settings
│   ├── popup.js           # Popup dashboard logic (search/sort/edit shortcuts)
│   ├── side_panel.js       # Side panel navigation + iframe messaging
│   ├── tabs.js / navigate.js / utils.js   # Shared navigation & helper utilities
│   ├── detect.js          # Content script — detects popup/side-panel context per frame
│   ├── user-script.js     # Content script (MAIN world) — runs user-defined scripts in the side panel
│   ├── drop.js             # Drag-and-drop search/navigation handler
│   ├── Pomodoro.js / NS_Notes.js / Spinner.js  # Built-in tool logic
│   └── *.css               # Styling for each surface (New Tab, popup, side panel, tools)
├── Tools/                  # Standalone HTML pages for the built-in tools
│   ├── NS_Notes.html
│   ├── Pomodoro.html
│   └── Spinner.html
├── icons/                  # Extension icons + service favicons used in the app grid
└── fonts/
```

### How it fits together
- **`chrome_url_overrides.newtab`** replaces the browser's New Tab with `index.html`, which renders the search box, app grid, and background/theme engine.
- **`background.js`** (service worker) manages the side panel lifecycle, the right-click "SideOpen" context menu, and passes URLs between tabs/side panel/popup via `chrome.runtime` messaging.
- **Content scripts** (`detect.js`, `user-script.js`) run on every page (`document_start`, all frames) to identify whether a frame is the extension's own popup/side-panel iframe and to support user-script injection there.
- All user preferences (background, theme, search engine, saved shortcuts, notes, etc.) are persisted locally via `chrome.storage.local` / `unlimitedStorage` — nothing is sent to a remote server.

---

## 🔐 Permissions

| Permission | Why it's needed |
|---|---|
| `storage`, `unlimitedStorage` | Persist settings, shortcuts, notes, and themes locally |
| `tabs` | Track and navigate the active tab for search/navigation |
| `history` | Power address/URL suggestions |
| `sidePanel` | Enable the SideOpen side-panel browser |
| `contextMenus` | Add the "NimSeek SideOpen" right-click menu entry |
| `commands` | Support the `Ctrl+Shift+Y` keyboard shortcut |
| `webRequest`, `declarativeNetRequestWithHostAccess` | Support in-panel browsing across sites |
| `host_permissions: *://*/*` | Content scripts run on all pages to detect extension frames and enable side-panel features |

---

## ⚙️ Installation (Developer Mode)

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`) in your browser.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `NimSeek Explorer` folder.
5. Open a new tab to start using NimSeek Explorer — or press `Ctrl+Shift+Y` (`Cmd+Shift+Y` on Mac) to open the popup dashboard.

**Requirements:** Chrome/Chromium-based browser, version 114 or later (per `minimum_chrome_version` in the manifest).

---

## 🛠️ Tech Stack

- **Platform:** Chrome Extension, Manifest V3
- **Frontend:** Vanilla JavaScript, HTML, CSS — no framework or build tooling
- **Storage:** `chrome.storage.local` (client-side only, no backend/server)

---

## 👤 Author

**Siam Hossan Ridoy**
