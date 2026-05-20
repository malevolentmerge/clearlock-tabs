const urlParams = new URLSearchParams(window.location.search);
const domain = urlParams.get('domain');
const targetUrl = urlParams.get('target');

document.getElementById('domainName').innerText = domain || 'this site';

const hiddenPin = document.getElementById('hiddenPin');
const blocks = [
  document.getElementById('block-0'),
  document.getElementById('block-1'),
  document.getElementById('block-2'),
  document.getElementById('block-3')
];

// Always keep focus on the hidden input when clicking anywhere near the PIN pad
document.querySelector('.pin-container').addEventListener('click', () => {
  hiddenPin.focus();
});

// Update the visual blocks as the user types
hiddenPin.addEventListener('input', (e) => {
  // Force numeric only
  hiddenPin.value = hiddenPin.value.replace(/\D/g, '');
  const val = hiddenPin.value;

  // Update text and active states
  blocks.forEach((block, index) => {
    // Show a dot instead of the actual number for privacy, or show the number briefly. 
    // We'll use a standard bullet character for a clean look.
    block.innerText = val[index] ? '•' : '';
    
    // Move the active border highlight to the current typing position
    if (index === val.length || (index === 3 && val.length === 4)) {
      block.classList.add('active');
    } else {
      block.classList.remove('active');
    }
    
    // Remove error class if user starts typing again
    block.classList.remove('error-shake');
  });

  // Auto-submit when 4 digits are reached
  if (val.length === 4) {
    verifyPin(val);
  }
});

function verifyPin(enteredPin) {
  chrome.storage.local.get({ lockedDomains: {} }, (data) => {
    const correctPin = data.lockedDomains[domain];

    if (enteredPin === correctPin) {
      // Success: Notify background script and redirect
      chrome.runtime.sendMessage({ action: "allowTab" }, () => {
        window.location.href = targetUrl;
      });
    } else {
      // Failure: Shake animation and clear input
      blocks.forEach(block => block.classList.add('error-shake'));
      setTimeout(() => {
        hiddenPin.value = '';
        blocks.forEach((block, index) => {
          block.innerText = '';
          block.classList.remove('active', 'error-shake');
        });
        blocks[0].classList.add('active'); // Reset focus highlight to first block
      }, 500);
    }
  });
}

// Handle Clear / Cookie Wipe
document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm(`Erase footprint: This will securely clear all cookies for ${domain} and log you out. Continue?`)) {
    return;
  }

  chrome.cookies.getAll({ domain: domain }, (cookies) => {
    const deletions = cookies.map(cookie => {
      const protocol = cookie.secure ? "https:" : "http:";
      const cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
      const cookieUrl = `${protocol}//${cleanDomain}${cookie.path}`;

      return new Promise((resolve) => {
        chrome.cookies.remove({ url: cookieUrl, name: cookie.name }, resolve);
      });
    });

    Promise.all(deletions).then(() => {
      chrome.storage.local.get({ lockedDomains: {} }, (data) => {
        const lockedDomains = data.lockedDomains;
        delete lockedDomains[domain];

        chrome.storage.local.set({ lockedDomains }, () => {
          window.location.href = targetUrl;
        });
      });
    });
  });
});
