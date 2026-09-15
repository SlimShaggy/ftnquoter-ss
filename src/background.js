/**
 * Background script for ftnQuoter v2.0
 * Handles compose window events and applies FTN-style quoting
 */

// FTN Quoter logic - inline to avoid importScripts issues
const FTNQuoter = {
  getInitials(fromHeader) {
    if (!fromHeader) return "??";
    let name = fromHeader.replace(/^(.*)<.*$/g, "$1").trim();
    name = name.replace(/^"*(.*)"/g, "$1");
    const match = name.match(/[\wА-Яа-яЁё]{1}.*[\. ,_]([\wА-Яа-яЁё]{1})/);
    if (match) return name.charAt(0) + match[1];
    return name.charAt(0) || "??";
  },

  getName(fromHeader) {
    if (!fromHeader) return null;
    let name = fromHeader.replace(/^(.*)<.*$/g, "$1").trim();
    name = name.replace(/^"*(.*)"/g, "$1");
    return name.length > 0 ? name : null;
  },

  splitLongLine(text, prefix, maxLen) {
    // If line is short enough, return as-is
    if ((prefix + text).length <= maxLen) {
      return [prefix + text];
    }

    const lines = [];
    let remaining = text;

    while (remaining.length > 0) {
      const availableLen = maxLen - prefix.length;

      if (remaining.length <= availableLen) {
        // Last chunk fits
        lines.push(prefix + remaining);
        break;
      }

      // Find last space within available length
      let splitPos = remaining.lastIndexOf(' ', availableLen);

      if (splitPos === -1 || splitPos < availableLen / 2) {
        // No good space found, just split at max length
        splitPos = availableLen;
      }

      // Add this chunk
      lines.push(prefix + remaining.substring(0, splitPos).trimEnd());
      remaining = remaining.substring(splitPos).trimStart();
    }

    return lines;
  },

  quoteLine(line, initials, quoteEmpty, maxLen = 72) {
    // Remove &nbsp;
    line = line.replace(/&nbsp;?/g, " ");

    // Check if this is Thunderbird's attribution line.
    // English: "On <date>, <name> wrote:"
    // Russian: "DD.MM.YYYY HH:MM, <name> пишет:"
    if (line.match(/^On .* wrote:/i) || line.match(/^\d{2}\.\d{2}\.\d{4} \d{1,2}:\d{2}, .+ пишет:/)) {
      // Don't quote attribution lines - return as is
      return line;
    }

    // Check if line has Thunderbird's default quote marker (starts with >)
    // This is what TB adds when replying
    const tbQuoteMatch = line.match(/^ *> (.*)$/);
    if (tbQuoteMatch) {
      let quotedText = tbQuoteMatch[1];

      // Check if this is an empty line (TB marks it as "> ")
      if (quotedText.trim().length === 0) {
        if (quoteEmpty) {
          return ` ${initials}>`;
        } else {
          return ""; // Don't quote empty lines
        }
      }

      // RFC 3676 format=flowed space-unstuffing:
      // When TB quotes format=flowed text, lines that start with a space are space-stuffed
      // by prepending an extra space after the quote marker. Remove that stuffed space.
      if (quotedText.startsWith(" ")) {
        quotedText = quotedText.substring(1);
      }

      // Check if the quoted text has FTN-style quotes (e.g., "IZ>", "IZ>>", "IZ>>>", etc.)
      const nestedQuoteMatch = quotedText.match(/^ *([\wА-Яа-яЁё]{1,3})(>+) (.*)$/);

      if (nestedQuoteMatch) {
        // Nested quote: add one more > to existing level
        // "IZ> text" becomes "IZ>> text"
        // "IZ>> text" becomes "IZ>>> text"
        // "DK>>>> text" becomes "DK>>>>> text"
        const nestedInitials = nestedQuoteMatch[1];
        const existingMarkers = nestedQuoteMatch[2]; // >, >>, >>>, etc.
        let nestedText = nestedQuoteMatch[3];
        if (nestedText.startsWith(" ")) {
          nestedText = nestedText.substring(1);
        }
        const prefix = ` ${nestedInitials}${existingMarkers}> `;
        return this.splitLongLine(nestedText, prefix, maxLen).join('\n');
      } else {
        // Regular quote without FTN markers: "> text" becomes "VP> text"
        const prefix = ` ${initials}> `;
        return this.splitLongLine(quotedText, prefix, maxLen).join('\n');
      }
    }

    // No quote marker - this shouldn't happen in reply, but handle it
    const prefix = ` ${initials}> `;
    return this.splitLongLine(line, prefix, maxLen).join('\n');
  },

  formatBody(body, initials, options = {}) {
    const { quoteEmpty = false, quoteSignature = false, maxLineLen = 72 } = options;
    if (!body) return "";

    // TB adds HTML entities, convert them
    let text = body
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/<br>/gi, "\n");

    const lines = text.split(/\r?\n/);
    const quotedLines = [];
    let inQuotedSignature = false;
    // Set to true once we have seen at least one ">"-prefixed quoted line.
    // After that, the first non-quoted, non-empty line marks the start of the
    // reply author's own composition area, which we must never touch.
    let seenQuotedLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const isQuotedLine = /^ *>/.test(line);

      // Keep attribution line as-is without quoting, then insert a blank line
      // between it and the first quoted line (FTN style).
      // English: "On <date>, <name> wrote:"
      // Russian: "DD.MM.YYYY HH:MM, <name> пишет:"
      if (line.match(/^On .* wrote:$/i) || line.match(/^\d{2}\.\d{2}\.\d{4} \d{1,2}:\d{2}, .+ пишет:$/)) {
        quotedLines.push(line);
        quotedLines.push("");
        continue;
      }

      // Once the quoted block is over (we've seen at least one "> " line and
      // now hit a line without a ">" prefix), everything that follows belongs
      // to the reply author — preserve it verbatim and stop processing.
      // This includes blank separator lines between the quote and the reply
      // signature, which must not be quoted or stripped.
      if (seenQuotedLine && !isQuotedLine) {
        for (let j = i; j < lines.length; j++) {
          quotedLines.push(lines[j]);
        }
        break;
      }

      // Track whether we're inside the quoted block.
      if (isQuotedLine) {
        seenQuotedLine = true;
      }

      // Detect the FidoNet signature separator inside a quoted block.
      // Thunderbird wraps the original "--- ..." line as "> --- ...".
      if (line.match(/^ *> *---/)) {
        if (quoteSignature) {
          // Quote the separator itself and continue collecting quoted sig lines.
          quotedLines.push(this.quoteLine(line, initials, quoteEmpty, maxLineLen));
        } else {
          // Also strip the optional tagline immediately preceding the tearline.
          // A tagline is a line starting with "..." (after the "> " quote prefix).
          if (quotedLines.length > 0 && quotedLines[quotedLines.length - 1].match(/^ *[\wА-Яа-яЁё]{1,3}> *\.\.\./) ) {
            quotedLines.pop();
          }
        }
        inQuotedSignature = true;
        continue;
      }

      if (inQuotedSignature) {
        if (quoteSignature) {
          quotedLines.push(this.quoteLine(line, initials, quoteEmpty, maxLineLen));
        }
        // Whether included or skipped, keep scanning to the end of the quoted block.
        continue;
      }

      // Quote the line (quoteLine will handle empty lines based on quoteEmpty setting).
      quotedLines.push(this.quoteLine(line, initials, quoteEmpty, maxLineLen));
    }

    // Remove trailing empty lines and quote markers
    while (quotedLines.length > 0) {
      const lastLine = quotedLines[quotedLines.length - 1];
      const trimmed = lastLine.trim();
      // Remove if empty or just a quote marker like " VP>"
      if (trimmed === "" || /^ *[\wА-Яа-яЁё]{1,3}>$/.test(trimmed)) {
        quotedLines.pop();
      } else {
        break;
      }
    }

    return quotedLines.join("\n");
  },

  matchesGroup(recipient, pattern) {
    try {
      const regex = new RegExp(pattern);
      return regex.test(recipient);
    } catch (e) {
      console.error("ftnQuoter: invalid regex:", pattern, e);
      return false;
    }
  },

  formatBodyAsHTML(plainText, settings) {
    if (!settings.useColors) {
      // No colors - just convert to HTML with <br>
      return plainText.replace(/\n/g, '<br>\n');
    }

    const lines = plainText.split('\n');
    const htmlLines = [];

    for (const line of lines) {
      // Check for FTN-style quote pattern
      const match = line.match(/^( *)([\wА-Яа-яЁё]{1,3})(>>?) (.*)$/);

      if (match) {
        const [, spaces, initials, marker, content] = match;
        const isNested = marker === '>>';
        const color = isNested ? settings.color2 : settings.color1;

        // HTML escape the content
        const escapedContent = content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        htmlLines.push(`<span style="color: ${color}">${spaces}${initials}${marker} ${escapedContent}</span>`);
      } else {
        // Regular line - escape HTML
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        htmlLines.push(escapedLine);
      }
    }

    return htmlLines.join('<br>\n');
  }
};

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  maxLineLen: 72,
  quoteEmpty: false,
  quoteSignature: false,
  useColors: true,
  color1: "blue",
  color2: "brown",
  groupPattern: "^(fido7\\.|.*<.*@.*>).*$",
  addXCommentTo: true,
  flowedFormat: false,
  addGreetings: true,
  newGreeting: "Hello, all!",
  replyGreeting: "Hello, %firstname%!"
};

// Track processed tabs
const processedTabs = new Set();

// Settings management
async function getSettings() {
  const result = await browser.storage.local.get('settings');
  const stored = result.settings || {};
  const settings = { ...DEFAULT_SETTINGS, ...stored };

  // Migration from older versions (where greetings were enabled by non-empty string)
  if (stored.addGreetings === undefined) {
    if (stored.newGreeting !== undefined || stored.replyGreeting !== undefined) {
      settings.addGreetings = Boolean((stored.newGreeting && stored.newGreeting.trim()) || (stored.replyGreeting && stored.replyGreeting.trim()));
    }
    if (!settings.newGreeting) {
      settings.newGreeting = DEFAULT_SETTINGS.newGreeting;
    }
    if (!settings.replyGreeting) {
      settings.replyGreeting = DEFAULT_SETTINGS.replyGreeting;
    }
  }

  return settings;
}

async function saveSettings(settings) {
  await browser.storage.local.set({ settings });
}

// Main processing function
async function processComposeWindow(tab) {
  try {
    console.log("ftnQuoter: processing tab", tab.id);

    if (processedTabs.has(tab.id)) {
      console.log("ftnQuoter: already processed");
      return;
    }

    const settings = await getSettings();
    console.log("ftnQuoter: settings:", settings);

    if (!settings.enabled) {
      console.log("ftnQuoter: disabled");
      return;
    }

    const details = await browser.compose.getComposeDetails(tab.id);
    console.log("ftnQuoter: details:", {
      type: details.type,
      to: details.to,
      relatedMessageId: details.relatedMessageId
    });

    // Messages opened from Drafts must never be modified.
    if (details.type === "draft") {
      processedTabs.add(tab.id);
      console.log("ftnQuoter: draft message, skipping");
      return;
    }

    // Check if reply
    const isReply = details.type && (
      details.type.toLowerCase().includes("reply") ||
      details.type === "reply" ||
      details.type === "replyAll"
    );

    if (!isReply) {
      // Always mark as processed so the polling loop never retries this tab.
      processedTabs.add(tab.id);

      // For new messages, prepend newGreeting if enabled and non-empty.
      if (settings.addGreetings && settings.newGreeting && settings.newGreeting.trim()) {
        const greeting = settings.newGreeting + "\n\n";
        // Read the current body so we prepend rather than overwrite
        // (Thunderbird may have already inserted the user's signature).
        const currentDetails = await browser.compose.getComposeDetails(tab.id);
        const composeDetails = {};
        if (currentDetails.isPlainText === false) {
          const currentBody = currentDetails.body || "";
          composeDetails.body = greeting.replace(/\n/g, '<br>\n') + currentBody;
        } else {
          const currentBody = currentDetails.plainTextBody || "";
          composeDetails.plainTextBody = greeting + currentBody;
        }
        await browser.compose.setComposeDetails(tab.id, composeDetails);
        console.log("ftnQuoter: new message greeting applied");
      } else {
        console.log("ftnQuoter: not a reply, skipping");
      }
      return;
    }

    // Check recipients
    const recipients = [...(details.to || []), ...(details.cc || [])];
    const recipientString = recipients
      .map(r => typeof r === 'string' ? r : (r.addr || r.email || ''))
      .join(", ");
    console.log("ftnQuoter: recipients:", recipientString);

    // If recipients are empty, skip pattern check (Reply window might not have recipients yet)
    if (recipientString.trim().length > 0) {
      if (!FTNQuoter.matchesGroup(recipientString, settings.groupPattern)) {
        console.log("ftnQuoter: pattern mismatch");
        return;
      }
      console.log("ftnQuoter: pattern matches");
    } else {
      console.log("ftnQuoter: recipients empty, skipping pattern check");
    }

    // Get original sender
    let initials = "??";
    let senderName = null;

    if (details.relatedMessageId) {
      try {
        const msg = await browser.messages.get(details.relatedMessageId);
        console.log("ftnQuoter: author:", msg.author);
        if (msg && msg.author) {
          initials = FTNQuoter.getInitials(msg.author);
          senderName = FTNQuoter.getName(msg.author);
          console.log("ftnQuoter: initials:", initials, "name:", senderName);
        }
      } catch (e) {
        console.error("ftnQuoter: error getting message:", e);
      }
    }

    // Get body
    const body = details.plainTextBody || details.body || "";
    console.log("ftnQuoter: body length:", body.length);
    console.log("ftnQuoter: body preview:", body.substring(0, 500));

    if (!body || body.trim().length === 0) {
      console.log("ftnQuoter: empty body");
      return;
    }

    // Quote it
    const quoted = FTNQuoter.formatBody(body, initials, settings);
    console.log("ftnQuoter: quoted length:", quoted.length);
    console.log("ftnQuoter: quoted preview:", quoted.substring(0, 500));

    // Build reply greeting prefix with %firstname%, %lastname%, %fullname% substitution
    let greetingPrefix = "";
    if (settings.addGreetings && settings.replyGreeting && settings.replyGreeting.trim()) {
      const nameParts = senderName ? senderName.trim().split(/\s+/) : [];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      const fullName = senderName || "";
      greetingPrefix = settings.replyGreeting
        .replace(/%firstname%/gi, firstName)
        .replace(/%lastname%/gi, lastName)
        .replace(/%fullname%/gi, fullName)
        + "\n\n";
      console.log("ftnQuoter: reply greeting:", greetingPrefix.trim());
    }

    // Add double newline after quote to separate from reply
    const quotedWithSpace = greetingPrefix + quoted + "\n\n";

    // Check if we should use colors (HTML mode)
    const composeDetails = {};

    if (settings.useColors && details.isPlainText === false) {
      // HTML mode with colors
      const greetingPrefixHtml = greetingPrefix.replace(/\n/g, '<br>\n');
      const htmlBody = greetingPrefixHtml + FTNQuoter.formatBodyAsHTML(quoted, settings) + '<br><br>';
      composeDetails.body = htmlBody;
      console.log("ftnQuoter: applying HTML with colors");
    } else {
      // Plain text mode
      composeDetails.plainTextBody = quotedWithSpace;
      console.log("ftnQuoter: applying plain text");
    }

    // Update compose window
    await browser.compose.setComposeDetails(tab.id, composeDetails);

    console.log("ftnQuoter: SUCCESS - quoting applied!");

    // Add X-Comment-To header
    if (settings.addXCommentTo && senderName) {
      try {
        const headers = details.customHeaders || [];
        const hasXCT = headers.some(h => h.name && h.name.toLowerCase() === 'x-comment-to');

        if (!hasXCT) {
          headers.push({ name: 'X-Comment-To', value: senderName });
          await browser.compose.setComposeDetails(tab.id, { customHeaders: headers });
          console.log("ftnQuoter: added X-Comment-To:", senderName);
        }
      } catch (e) {
        console.error("ftnQuoter: error adding header:", e);
      }
    }

    processedTabs.add(tab.id);

  } catch (error) {
    console.error("ftnQuoter: ERROR:", error);
    console.error("Stack:", error.stack);
  }
}

// Listen for compose windows opening
// Using BeforeSend as trigger + delay to ensure window is ready
browser.compose.onBeforeSend.addListener(async (tab) => {
  console.log("ftnQuoter: onBeforeSend - ignoring");
  // We don't modify on send
});

// Try to catch compose window creation via different methods
let composeListenerRegistered = false;

// Method 1: Register message display script for quote coloring when viewing messages
if (browser.messageDisplayScripts) {
  console.log("ftnQuoter: messageDisplayScripts API available");
  browser.messageDisplayScripts.register({
    js: [{ file: "src/display-script.js" }]
  }).then(() => {
    console.log("ftnQuoter: display script registered");
  }).catch(e => {
    console.log("ftnQuoter: display script registration failed:", e);
  });
} else {
  console.log("ftnQuoter: messageDisplayScripts API not available");
}

// Also register compose script for quote coloring in compose window (if available)
if (browser.composeScripts) {
  console.log("ftnQuoter: composeScripts API available");
  browser.composeScripts.register({
    js: [{ file: "src/compose-script.js" }]
  }).then(() => {
    console.log("ftnQuoter: compose script registered");
  }).catch(e => {
    console.log("ftnQuoter: compose script registration failed:", e);
  });
}

// Method 2: Poll for new compose tabs
async function checkForComposeTabs() {
  try {
    const tabs = await messenger.tabs.query({ type: "messageCompose" });
    for (const tab of tabs) {
      if (!processedTabs.has(tab.id)) {
        console.log("ftnQuoter: found new compose tab:", tab.id);
        // Delay to ensure window is ready
        setTimeout(() => processComposeWindow(tab), 500);
      }
    }
  } catch (e) {
    console.log("ftnQuoter: tabs.query failed, trying alternative");
    // Fallback - try with browser.tabs
    try {
      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && tab.url.includes("messengercompose") && !processedTabs.has(tab.id)) {
          console.log("ftnQuoter: found compose via url:", tab.id);
          setTimeout(() => processComposeWindow(tab), 500);
        }
      }
    } catch (e2) {
      // Silent fail
    }
  }
}

// Start polling
setInterval(checkForComposeTabs, 2000);
console.log("ftnQuoter: polling started");

// Initialize
async function init() {
  console.log("ftnQuoter: v2.0 initialized");

  processedTabs.clear();

  const settings = await getSettings();
  await saveSettings(settings);

  console.log("ftnQuoter: ready with settings:", settings);

  // Initial check
  checkForComposeTabs();
}

init();

// Handle messages from options page
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("ftnQuoter: message:", message.type);

  if (message.type === "getSettings") {
    getSettings().then(sendResponse);
    return true;
  }

  if (message.type === "saveSettings") {
    saveSettings(message.settings).then(() => {
      console.log("ftnQuoter: settings saved");
      sendResponse({ success: true });
    });
    return true;
  }
});

console.log("ftnQuoter: background script loaded");
