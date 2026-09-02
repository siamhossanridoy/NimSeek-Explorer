/* Run user-script in side panel context */

if (window.top !== window && window.parent === window.top) {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('This script requires a Chrome extension environment.');
    return;
  }

  const PORT_ID = 'gfr-uyJjfsas';

  const runUserScript = (scriptContent) => {
    if (!scriptContent || typeof scriptContent !== 'string') {
      console.error('Invalid or missing user-script:', scriptContent);
      return;
    }

    try {
      const script = document.createElement('script');
      script.textContent = scriptContent;
      document.documentElement.appendChild(script);
      script.remove(); // Clean up immediately
      console.log('User script executed successfully.');
    } catch (err) {
      console.error('Failed to execute user script:', err);
    }
  };

  const initializePort = () => {
    let port = document.getElementById(PORT_ID);
    if (port) {
      console.warn('Port element already exists, skipping creation.');
      return port;
    }

    port = document.createElement('span');
    port.id = PORT_ID;

    // Listen for custom "run" events
    port.addEventListener('run', (event) => {
      event.stopPropagation();
      const userScript = event.detail?.['user-script'];
      runUserScript(userScript);
    }, { once: false }); // multiple runs allowed

    try {
      document.documentElement.appendChild(port);
      console.log('Port element appended successfully.');
    } catch (err) {
      console.error('Failed to append port element:', err);
    }

    return port;
  };

  const initialize = () => {
    initializePort();
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initialize();
  } else {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  }
}
