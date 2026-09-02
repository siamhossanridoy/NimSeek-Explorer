const openChromeNewtab = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.update(tabs[0].id, { url: 'chrome://new-tab-page' });
  });
};

const openGoogle = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.update(tabs[0].id, { url: 'chrome://contextual-tasks' });
  });
};



// Event Listeners
document.getElementById('btn-newtab').addEventListener('click', openChromeNewtab);
document.getElementById('btn-google').addEventListener('click', openGoogle);


