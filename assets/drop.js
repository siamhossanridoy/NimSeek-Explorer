// Helper function to handle navigation
const navigateTo = (href) => {
  if (href) {
    top.navigate(undefined, { href });
  }
};

// Handle dragover event to allow dropping
document.body.addEventListener('dragover', (e) => {
  e.preventDefault();
});

// Handle drop event for processing dragged data
document.body.addEventListener('drop', (e) => {
  e.preventDefault();

  // Get the dragged data
  const href = e.dataTransfer.getData('text/uri-list');
  const query = e.dataTransfer.getData('text/plain') || href;

  // Try to parse the dropped URL
  try {
    const url = new URL(href);
    // If the href is a valid URL with a hostname, navigate to it
    if (url.hostname) {
      return navigateTo(href);
    }
  } catch (error) {
    // Ignore invalid URLs or malformed data
  }

  // If no valid URL, treat it as a search query
  if (query) {
    chrome.storage.local.get({ 'search-engine': 'https://www.google.com/search?q=%s' }, (prefs) => {
      const searchUrl = prefs['search-engine'].replace('%s', encodeURIComponent(query));
      navigateTo(searchUrl);
    });
  }
});
