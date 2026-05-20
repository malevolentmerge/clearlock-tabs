document.getElementById('lockBtn').addEventListener('click', async () => {
  const pin = document.getElementById('pinInput').value;
  if (!/^\d{4}$/.test(pin)) {
    alert('Please enter a valid 4-digit PIN.');
    return;
  }

  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  try {
    const url = new URL(tab.url);
    const domain = url.hostname;

    if (url.protocol.startsWith('chrome')) {
      alert('Cannot lock internal Chrome pages.');
      return;
    }

    // Save to storage
    chrome.storage.local.get({ lockedDomains: {} }, (data) => {
      const lockedDomains = data.lockedDomains;
      lockedDomains[domain] = pin;
      
      chrome.storage.local.set({ lockedDomains }, () => {
        // INSTANT LOCK: Force the current tab to redirect immediately
        const lockPageUrl = chrome.runtime.getURL(`lock.html?domain=${encodeURIComponent(domain)}&target=${encodeURIComponent(tab.url)}`);
        chrome.tabs.update(tab.id, { url: lockPageUrl });
        
        // Close the popup window
        window.close();
      });
    });
  } catch (e) {
    alert('Failed to parse URL. Try reloading the page.');
  }
});
