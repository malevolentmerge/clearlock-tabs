// Keep track of temporarily unlocked tabs in memory
const unlockedTabs = new Set();

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Only intercept main frame navigations (not sub-frames or iframes)
  if (details.frameId !== 0) return;

  try {
    const url = new URL(details.url);
    const domain = url.hostname;

    // Avoid an infinite loop when loading our own extension lock page
    if (url.protocol === 'chrome-extension:') return;

    chrome.storage.local.get({ lockedDomains: {} }, (data) => {
      const lockedDomains = data.lockedDomains;

      if (lockedDomains[domain]) {
        // If this exact tab has already entered the PIN, let it pass
        if (unlockedTabs.has(details.tabId)) return;

        // Otherwise, redirect to the lock screen
        const lockPageUrl = chrome.runtime.getURL(`lock.html?domain=${encodeURIComponent(domain)}&target=${encodeURIComponent(details.url)}`);
        chrome.tabs.update(details.tabId, { url: lockPageUrl });
      }
    });
  } catch (e) {
    console.error(e);
  }
});

// Clean up memory when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  unlockedTabs.delete(tabId);
});

// Listen for successful unlock messages from lock.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "allowTab" && sender.tab) {
    unlockedTabs.add(sender.tab.id);
    sendResponse({ success: true });
  }
});
