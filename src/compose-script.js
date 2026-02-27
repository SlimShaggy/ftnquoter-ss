/**
 * Compose script for ftnQuoter
 * Adds color highlighting to FTN-style quotes in compose window
 */

(async function() {
  // Get settings from storage
  let settings = {
    useColors: true,
    color1: "blue",
    color2: "brown"
  };

  try {
    const result = await browser.storage.local.get('settings');
    if (result.settings) {
      settings = { ...settings, ...result.settings };
    }
  } catch (e) {
    console.error("ftnQuoter compose-script: error loading settings", e);
  }

  let isProcessing = false;
  let observer = null;

  // Function to apply colors to quotes
  function applyQuoteColors() {
    if (!settings.useColors) {
      return;
    }

    // Prevent re-entry
    if (isProcessing) {
      return;
    }

    isProcessing = true;

    // Temporarily disconnect observer to prevent infinite loop
    if (observer) {
      observer.disconnect();
    }

    // Try multiple ways to find the editor
    let body = null;

    // Method 1: Direct body (plain text mode)
    if (document.body) {
      body = document.body;
    }

    // Method 2: Look for iframe with editor
    if (!body) {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        try {
          if (iframe.contentDocument && iframe.contentDocument.body) {
            body = iframe.contentDocument.body;
            break;
          }
        } catch (e) {
          // Access denied, skip
        }
      }
    }

    if (!body) {
      isProcessing = false;
      return;
    }

    // Find all text nodes
    const walker = document.createTreeWalker(
      body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // Process each text node
    let foundQuotes = 0;
    let totalNodes = textNodes.length;

    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const lines = text.split('\n');

      // Check if any line contains FTN-style quote (>+)
      const hasQuotes = lines.some(line => /^ *[\wА-Яа-яЁё]{1,3}>+ /.test(line));

      if (hasQuotes) {
        const parent = textNode.parentNode;
        const fragment = document.createDocumentFragment();

        lines.forEach((line, index) => {
          // Match any number of > markers: >, >>, >>>, >>>>, etc.
          const quoteMatch = line.match(/^( *)([\wА-Яа-яЁё]{1,3})(>+)\s/);

          if (quoteMatch) {
            const [, spaces, initials, markers] = quoteMatch;

            // Count the number of > to determine level
            const level = markers.length;

            // Odd levels (1, 3, 5, ...) use color1, even levels (2, 4, 6, ...) use color2
            const color = (level % 2 === 1) ? settings.color1 : settings.color2;

            const span = document.createElement('span');
            span.style.color = color;
            span.textContent = line;
            fragment.appendChild(span);
            foundQuotes++;
          } else {
            fragment.appendChild(document.createTextNode(line));
          }

          // Add newline between lines (except last)
          if (index < lines.length - 1) {
            fragment.appendChild(document.createTextNode('\n'));
          }
        });

        parent.replaceChild(fragment, textNode);
      }
    });

    if (foundQuotes > 0) {
      console.log(`ftnQuoter compose-script: colored ${foundQuotes} quotes`);
    }

    // Reconnect observer after processing
    if (observer && document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    isProcessing = false;
  }

  // Apply colors when editor is ready
  function init() {
    // Try to apply colors immediately
    applyQuoteColors();

    // Also try after delays (editor might not be ready)
    setTimeout(applyQuoteColors, 500);
    setTimeout(applyQuoteColors, 1000);
    setTimeout(applyQuoteColors, 2000);

    // Watch for changes in the document
    if (document.body) {
      observer = new MutationObserver(() => {
        applyQuoteColors();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Listen for settings changes
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      settings = { ...settings, ...changes.settings.newValue };
      applyQuoteColors();
    }
  });

})();
