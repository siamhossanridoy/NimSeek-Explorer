/* global navigation */

if (window.top !== window && window.parent === window.top) {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('This script requires a Chrome extension environment.');
    return;
  }

  const navigationSupported = 'navigation' in window;

  const postToTop = (message) => {
    const origin = chrome.runtime.getURL('').slice(0, -1);
    window.top.postMessage(message, origin);
  };

  const getUserScript = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get({ 'user-script': '' }, (prefs) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError.message);
          resolve('');
        } else {
          resolve(prefs['user-script'] || '');
        }
      });
    });
  };

  chrome.runtime.sendMessage({ method: 'is-popup' }, async (result) => {
    if (chrome.runtime.lastError) {
      console.error('Runtime error:', chrome.runtime.lastError.message);
      return;
    }

    if (!result || typeof result.permit === 'undefined') {
      console.error('Invalid response from background script:', result);
      return;
    }

    if (!result.permit) return;

    const origin = chrome.runtime.getURL('').slice(0, -1);
    let port = document.getElementById('gfr-uyJjfsas');
    if (port) {
      port.remove();
      port = null;
    }

    const navigating = (e) => {
      if (!navigationSupported) return;

      let hostname;
      try {
        hostname = e.destination.url.startsWith(location.origin)
          ? location.hostname
          : new URL(e.destination.url).hostname;
      } catch {
        hostname = location.hostname;
      }

      postToTop({
        method: 'open',
        href: e.destination.url,
        type: e.navigationType,
        changing: e.hashChange,
        hostname,
        meta: { canIntercept: e.canIntercept, href: location.href },
      });

      if (e.canIntercept === false) cleanup();
    };

    const messaging = async (e) => {
      if (e.origin !== origin) {
        console.warn('Invalid message origin:', e.origin);
        return;
      }

      switch (e.data?.method) {
        case 'navigate-verified':
          if (navigationSupported) window.navigation.addEventListener('navigate', navigating);

          const script = await getUserScript();
          if (port && script) {
            port.dispatchEvent(new CustomEvent('run', { detail: { 'user-script': script } }));
          }
          break;

        case 'navigate-stop':
          window.stop();
          break;

        case 'navigate-reload':
          location.reload();
          break;

        case 'detach':
          cleanup();
          break;
      }
    };

    const cleanup = () => {
      if (navigationSupported) window.navigation.removeEventListener('navigate', navigating);
      window.removeEventListener('message', messaging);
      window.removeEventListener('focus', focusHandler);
    };

    const focusHandler = () => postToTop({ method: 'focus' });

    window.addEventListener('message', messaging);
    window.addEventListener('focus', focusHandler);

    postToTop({ method: 'navigate', href: location.href, hostname: location.hostname });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      postToTop({ method: 'loaded' });
    } else {
      window.addEventListener('load', () => postToTop({ method: 'loaded' }));
    }
  });
}
