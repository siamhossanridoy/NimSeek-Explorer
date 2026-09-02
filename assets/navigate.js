/* global tabs */

{
  const log = (...args) => console.debug('[navigate]', ...args);

  // Setup network rules for a tab
  const setupNetwork = async (tabId, hostname) => {
    tabs.update(tabId, { hostname });

    return chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [tabId],
      addRules: [{
        id: tabId,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [{ header: 'X-Frame-Options', operation: 'remove' }]
        },
        condition: {
          tabIds: [-1],
          resourceTypes: ['sub_frame', 'xmlhttprequest'],
          urlFilter: '||' + hostname
        }
      }]
    });
  };

  // Retry loading a URL for a tab
  const retry = async (tabId, hostname, href) => {
    log('Retrying tab', tabId, 'for', href);
    tabs.update(tabId, { href: '' });
    await setupNetwork(tabId, hostname);
    tabs.update(tabId, { href });
  };

  // Watch for cross-origin redirects
  const watchRedirects = (tabId, originalHost, href) => {
    const redirectHandler = details => {
      const redirectedURL = new URL(details.redirectUrl);
      if (redirectedURL.hostname !== originalHost) {
        retry(tabId, redirectedURL.hostname, details.redirectUrl);
      }
    };

    chrome.webRequest.onBeforeRedirect.addListener(redirectHandler, {
      urls: [href],
      types: ['sub_frame']
    });

    setTimeout(() => {
      chrome.webRequest.onBeforeRedirect.removeListener(redirectHandler);
    }, 1000);
  };

  // Main navigation function
  const navigate = async (tabId = tabs.active, options = {}) => {
    if (!options.href) throw new Error('Missing href for navigation');

    const url = new URL(options.href);
    await setupNetwork(tabId, url.hostname);

    watchRedirects(tabId, url.hostname, options.href);

    tabs.update(tabId, {
      state: 'loading',
      href: options.href
    });
  };

  navigate.terminate = (tabId) => {
    return chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [tabId]
    });
  };

  // Handle messages from iframes/content scripts
  addEventListener('message', e => {
    const { method, href, hostname } = e.data || {};
    if (!e.source) return;

    const tabId = tabs.find(e.source);
    if (tabId === -1) return;

    switch (method) {
      case 'navigate':
      case 'open':
        tabs.update(tabId, { href }, false); // update href but do not reload

        const tab = tabs.get(tabId);
        if (!tab || tab.hostname !== hostname) {
          retry(tabId, hostname, href);
        }
        watchRedirects(tabId, hostname, href);
        if (method === 'navigate') {
          e.source.postMessage({ method: 'navigate-verified' }, '*');
        }
        break;

      case 'loaded':
        tabs.update(tabId, { state: 'ready' });
        break;
    }
  });

  self.navigate = navigate;
}
