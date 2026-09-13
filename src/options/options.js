/**
 * Options page script for ftnQuoter
 */

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
  addGreetings: false,
  newGreeting: "Hello, all!",
  replyGreeting: "Hello, %firstname%!"
};

// Color name to hex mapping
const COLOR_MAP = {
  blue: "#0000ff",
  brown: "#a52a2a",
  red: "#ff0000",
  green: "#008000",
  purple: "#800080",
  navy: "#000080",
  teal: "#008080",
  olive: "#808000"
};

function hexToColorName(hex) {
  for (const [name, value] of Object.entries(COLOR_MAP)) {
    if (value.toLowerCase() === hex.toLowerCase()) {
      return name;
    }
  }
  return hex;
}

function colorNameToHex(name) {
  return COLOR_MAP[name.toLowerCase()] || name;
}

/**
 * Load settings and populate form
 */
async function loadSettings() {
  try {
    const response = await browser.runtime.sendMessage({ type: "getSettings" });
    const stored = response || {};
    const settings = { ...DEFAULT_SETTINGS, ...stored };

    // Migration / fallback for older saved settings (where greetings were enabled by non-empty string)
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

    // Populate form fields
    document.getElementById('enabled').checked = settings.enabled;
    document.getElementById('maxLineLen').value = settings.maxLineLen;
    document.getElementById('quoteEmpty').checked = settings.quoteEmpty;
    document.getElementById('quoteSignature').checked = settings.quoteSignature;
    document.getElementById('useColors').checked = settings.useColors;
    document.getElementById('groupPattern').value = settings.groupPattern;
    document.getElementById('addXCommentTo').checked = settings.addXCommentTo;
    document.getElementById('flowedFormat').checked = settings.flowedFormat;
    document.getElementById('addGreetings').checked = settings.addGreetings;
    document.getElementById('newGreeting').value = settings.newGreeting;
    document.getElementById('newGreeting').disabled = !settings.addGreetings;
    document.getElementById('replyGreeting').value = settings.replyGreeting;
    document.getElementById('replyGreeting').disabled = !settings.addGreetings;

    // Handle colors
    const color1Hex = colorNameToHex(settings.color1);
    const color2Hex = colorNameToHex(settings.color2);

    document.getElementById('color1').value = color1Hex;
    document.getElementById('color1Text').value = settings.color1;
    document.getElementById('color2').value = color2Hex;
    document.getElementById('color2Text').value = settings.color2;

    console.log("Settings loaded:", settings);
  } catch (error) {
    console.error("Error loading settings:", error);
    showStatus("Error loading settings", "error");
  }
}

/**
 * Save settings from form
 */
async function saveSettings(e) {
  e.preventDefault();

  const settings = {
    enabled: document.getElementById('enabled').checked,
    maxLineLen: parseInt(document.getElementById('maxLineLen').value),
    quoteEmpty: document.getElementById('quoteEmpty').checked,
    quoteSignature: document.getElementById('quoteSignature').checked,
    useColors: document.getElementById('useColors').checked,
    color1: document.getElementById('color1Text').value || hexToColorName(document.getElementById('color1').value),
    color2: document.getElementById('color2Text').value || hexToColorName(document.getElementById('color2').value),
    groupPattern: document.getElementById('groupPattern').value,
    addXCommentTo: document.getElementById('addXCommentTo').checked,
    flowedFormat: document.getElementById('flowedFormat').checked,
    addGreetings: document.getElementById('addGreetings').checked,
    newGreeting: document.getElementById('newGreeting').value,
    replyGreeting: document.getElementById('replyGreeting').value
  };

  try {
    await browser.runtime.sendMessage({
      type: "saveSettings",
      settings: settings
    });

    console.log("Settings saved:", settings);
    showStatus("Settings saved successfully!", "success");
  } catch (error) {
    console.error("Error saving settings:", error);
    showStatus("Error saving settings", "error");
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  if (confirm("Reset all settings to defaults?")) {
    try {
      await browser.runtime.sendMessage({
        type: "saveSettings",
        settings: DEFAULT_SETTINGS
      });

      await loadSettings();
      showStatus("Settings reset to defaults", "success");
    } catch (error) {
      console.error("Error resetting settings:", error);
      showStatus("Error resetting settings", "error");
    }
  }
}

/**
 * Show status message
 */
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  setTimeout(() => {
    statusDiv.className = 'status';
  }, 3000);
}

/**
 * Sync color picker with text input
 */
function setupColorSync() {
  // Color 1
  document.getElementById('color1').addEventListener('input', (e) => {
    const colorName = hexToColorName(e.target.value);
    document.getElementById('color1Text').value = colorName;
  });

  document.getElementById('color1Text').addEventListener('input', (e) => {
    const hex = colorNameToHex(e.target.value);
    if (hex.startsWith('#')) {
      document.getElementById('color1').value = hex;
    }
  });

  // Color 2
  document.getElementById('color2').addEventListener('input', (e) => {
    const colorName = hexToColorName(e.target.value);
    document.getElementById('color2Text').value = colorName;
  });

  document.getElementById('color2Text').addEventListener('input', (e) => {
    const hex = colorNameToHex(e.target.value);
    if (hex.startsWith('#')) {
      document.getElementById('color2').value = hex;
    }
  });
}

function setupGreetingSync() {
  const addGreetings = document.getElementById('addGreetings');
  const newGreeting = document.getElementById('newGreeting');
  const replyGreeting = document.getElementById('replyGreeting');

  addGreetings.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    newGreeting.disabled = !enabled;
    replyGreeting.disabled = !enabled;
  });
}

/**
 * Initialize page
 */
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupColorSync();
  setupGreetingSync();

  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
  document.getElementById('resetButton').addEventListener('click', resetSettings);
});
