chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only intercept main frame navigations
  if (details.frameId !== 0) return;

  try {
    const url = new URL(details.url);
    const domain = url.hostname;

    // Avoid infinite loop on our own extension pages
    if (url.protocol === 'chrome-extension:') return;

    // Fetch locked domains and currently unlocked session domains
    const localData = await chrome.storage.local.get({ lockedDomains: {} });
    const sessionData = await chrome.storage.session.get({ unlockedDomains: [] });
    
    const lockedDomains = localData.lockedDomains;
    const unlockedDomains = sessionData.unlockedDomains;

    if (lockedDomains[domain]) {
      // If the domain is unlocked for this browser session, let them pass
      if (unlockedDomains.includes(domain)) return;

      // Otherwise, redirect to the lock screen
      const lockPageUrl = chrome.runtime.getURL(`lock.html?domain=${encodeURIComponent(domain)}&target=${encodeURIComponent(details.url)}`);
      chrome.tabs.update(details.tabId, { url: lockPageUrl });
    }
  } catch (e) {
    console.error("Navigation error:", e);
  }
});

// Listen for successful unlock messages from lock.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "allowDomain" && message.domain) {
    chrome.storage.session.get({ unlockedDomains: [] }).then((data) => {
      const unlockedDomains = data.unlockedDomains;
      
      // Add the domain to the session whitelist if it isn't there already
      if (!unlockedDomains.includes(message.domain)) {
        unlockedDomains.push(message.domain);
        chrome.storage.session.set({ unlockedDomains });
      }
      
      sendResponse({ success: true });
    });
    
    // Return true to indicate we will send a response asynchronously
    return true; 
  }
});
