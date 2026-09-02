{
  let activeTabId = 1;
  const tabs = new Map();

  const updateAddress = (href) => {
    const addressElement = document.getElementById('address');
    addressElement.value = href?.startsWith('chrome-extension:/') ? '' : href || '';
  };

  const updateNavigationState = (tabId = activeTabId) => {
    const tab = tabs.get(tabId);
    if (!tab) return;
    document.getElementById('back').disabled = tab.current <= 0;
    document.getElementById('forward').disabled = tab.current >= tab.max;
  };

  const switchTab = (tabId) => {
    if (!tabs.has(tabId)) return;
    activeTabId = tabId;
    document.getElementById('active').textContent = tabId;

    const tab = tabs.get(tabId);
    updateAddress(tab.stack[tab.current] || '');
    updateNavigationState(tabId);

    const frame = document.querySelector(`iframe:nth-of-type(${tabId})`);
    if (frame) frame.focus();
  };

  // Initialize tab if not exists
  tabs.update = (id = activeTabId, options = {}, activate = true) => {
    if (!tabs.has(id)) tabs.set(id, { current: -1, max: -1, stack: [] });
    const tab = tabs.get(id);
    Object.assign(tab, options);

    if ('state' in options && id === activeTabId) {
      document.body.setAttribute('state', options.state);
    }

    if ('href' in options) {
      if (id === activeTabId) updateAddress(options.href);
      if (activate) {
        const frame = document.querySelector(`iframe:nth-of-type(${id})`);
        if (frame) frame.src = options.href;
      }
      if (!tab.stack.includes(options.href)) {
        tab.current += 1;
        tab.max = tab.current;
        tab.stack[tab.current] = options.href;
      }
    }
  };

  Object.defineProperty(tabs, 'active', {
    get: () => activeTabId
  });

  tabs.find = (source) => {
    for (let n = 0; n < frames.length; n++) {
      if (frames[n] === source) return n + 1;
    }
    return -1;
  };

  // Message handler
  addEventListener('message', (event) => {
    const { method, href } = event.data || {};
    const tabId = tabs.find(event.source);
    if (tabId === -1) return;

    const tab = tabs.get(tabId);
    if (!tab) return;

    switch (method) {
      case 'focus':
        switchTab(tabId);
        break;

      case 'navigate':
        if (!tab.ignore && href) {
          if (tab.stack[tab.current] !== href) {
            tab.current += 1;
            tab.stack[tab.current] = href;
            tab.max = tab.current;
          }
        } else {
          delete tab.ignore;
        }
        if (tabId === tabs.active) updateNavigationState(tabId);
        break;
    }
  });

  tabs.remove = (id) => {
    const frame = document.querySelector(`iframe:nth-of-type(${id})`);
    if (frame) frame.removeAttribute('src'); // <--- এই লাইনটি মুছে দিন
    if (activeTabId === id) switchTab(1);
};

  tabs.sendMessage = (id, msg) => {
    const frame = frames[id - 1];
    if (frame) frame.contentWindow.postMessage(msg, '*');
  };

  tabs.prepare = (tabId, direction) => new Promise((resolve, reject) => {
    const tab = tabs.get(tabId);
    if (!tab) return reject(new Error('Tab not found'));
    
    if (direction === 'backward' && tab.current > 0) {
      tab.current -= 1;
      tab.ignore = true;
      resolve(tab.stack[tab.current]);
    } else if (direction === 'forward' && tab.current < tab.max) {
      resolve(tab.stack[tab.current + 1]);
    } else {
      resolve(null); // No navigation possible
    }
  });

  self.tabs = tabs;
}
