/**
 * Message display script for ftnQuoter
 * Adds color highlighting to FTN-style quotes when viewing messages
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
    console.error("ftnQuoter display-script: error loading settings", e);
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

    // Find the message body
    const body = document.body;
    if (!body) {
      isProcessing = false;
      return;
    }

    // Process all text nodes
    const walker = document.createTreeWalker(
      body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      // Skip script and style tags
      if (node.parentNode.nodeName === 'SCRIPT' || node.parentNode.nodeName === 'STYLE') {
        continue;
      }
      textNodes.push(node);
    }

    // Process each text node
    let foundQuotes = 0;
    let totalNodes = textNodes.length;

    textNodes.forEach(textNode => {
      const text = textNode.textContent;

      // Skip if no newlines and no quote pattern
      if (!text.includes('\n') && !text.match(/\s+[A-ZА-ЯЁ]{1,3}>/)) {
        return;
      }

      // Split by newlines and check each line
      const lines = text.split('\n');
      let hasQuotes = false;

      for (const line of lines) {
        // Check if this line contains FTN-style quote
        // Pattern: " VP> text" or " IZ>> text"
        if (line.match(/^\s*([\wА-Яа-яЁё]{1,3})(>>?)\s/)) {
          hasQuotes = true;
          break;
        }
      }

      if (hasQuotes) {
        // Rebuild the text with colored spans
        const parent = textNode.parentNode;
        const fragment = document.createDocumentFragment();

        lines.forEach((line, index) => {
          // Match any number of > markers: >, >>, >>>, >>>>, etc.
          const quoteMatch = line.match(/^\s*([\wА-Яа-яЁё]{1,3})(>+)\s/);

          if (quoteMatch) {
            const [fullMatch, initials, markers] = quoteMatch;

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
      console.log(`ftnQuoter display-script: colored ${foundQuotes} quotes`);
    }

    // Reconnect observer after processing
    if (observer) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    isProcessing = false;
  }

  // Apply colors when content is ready
  function init() {
    // Apply immediately
    applyQuoteColors();

    // Also try after a short delay (content might not be fully loaded)
    setTimeout(applyQuoteColors, 100);
    setTimeout(applyQuoteColors, 500);

    // Watch for changes in the document
    observer = new MutationObserver(() => {
      applyQuoteColors();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
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
      location.reload();
    }
  });

})();
