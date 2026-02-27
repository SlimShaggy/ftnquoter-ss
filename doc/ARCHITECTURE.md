# Архитектура ftnQuoter v2.0

## 📐 Обзор системы

> **Примечание:** Подробная структура файлов проекта описана в **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)**

```
┌─────────────────────────────────────────────────────────────┐
│                     THUNDERBIRD 115+                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              WebExtension APIs                         │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │ compose  │ │ messages │ │ storage  │ │ runtime  │ │ │
│  │  │          │ │          │ │          │ │          │ │ │
│  │  │messageDs │ │composeScr│ │          │ │          │ │ │
│  │  └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘ │ │
│  └────────┼────────────┼────────────┼────────────┼───────┘ │
│           │            │            │            │          │
│           ▼            ▼            ▼            ▼          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           ftnQuoter Extension (background.js)         │ │
│  │                                                        │ │
│  │  Polling: checkForComposeTabs() every 2s              │ │
│  │  Scripts: messageDisplayScripts.register()            │ │
│  │           composeScripts.register()                   │ │
│  │                                                        │ │
│  │  Core Logic (inline):                                 │ │
│  │  • FTNQuoter.getInitials()                            │ │
│  │  • FTNQuoter.quoteLine()                              │ │
│  │  • FTNQuoter.formatBody()                             │ │
│  │  • FTNQuoter.splitLongLine()                          │ │
│  │  • FTNQuoter.matchesGroup()                           │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         display-script.js (Message View)              │ │
│  │  • Colorize quotes when viewing messages              │ │
│  │  • MutationObserver with loop protection              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         compose-script.js (Compose Window)            │ │
│  │  • Colorize quotes in reply/forward                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Options UI (options.html)                │ │
│  │                                                        │ │
│  │  HTML Form ─► options.js ─► browser.runtime.sendMessage │
│  │                    │                          ▲        │ │
│  │                    └──────────────────────────┘        │ │
│  │                  (settings sync)                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Поток данных

### 1. Инициализация

```
Start
  │
  ├─► Load manifest.json
  │
  ├─► Initialize background.js
  │     │
  │     ├─► Load default settings (inline in background.js)
  │     ├─► Read stored settings (browser.storage.local)
  │     └─► Merge settings
  │
  ├─► Register messageDisplayScripts (display-script.js)
  │
  ├─► Register composeScripts (compose-script.js)
  │
  ├─► Start polling: setInterval(checkForComposeTabs, 2000)
  │
  └─► Register message listeners
        • browser.runtime.onMessage (for settings)
        • browser.compose.onBeforeSend (ignored)
```

### 2. Подсветка цитат при просмотре

```
User opens message
  │
  ├─► Thunderbird loads message in preview pane
  │
  ├─► display-script.js injected (messageDisplayScripts)
  │     │
  │     ├─► Load settings from browser.storage.local
  │     │
  │     ├─► applyQuoteColors()
  │     │     │
  │     │     ├─► Check isProcessing flag → skip if true
  │     │     ├─► Set isProcessing = true
  │     │     ├─► Disconnect MutationObserver (prevent loop)
  │     │     │
  │     │     ├─► Find all text nodes via TreeWalker
  │     │     ├─► Filter nodes with '\n' or quote patterns
  │     │     │
  │     │     ├─► For each text node:
  │     │     │     ├─► Split by '\n'
  │     │     │     ├─► Match regex: /^\s*([A-ZА-ЯЁ]{1,3})(>>?)\s/
  │     │     │     ├─► Create colored <span> for matches
  │     │     │     └─► Replace text node with fragment
  │     │     │
  │     │     ├─► Reconnect MutationObserver
  │     │     └─► Set isProcessing = false
  │     │
  │     └─► Setup MutationObserver for dynamic changes
  │
  └─► Quotes colored (blue for level 1, brown for level 2)
```

### 3. Обработка Reply/Forward

```
Polling (every 2 seconds)
  │
  ├─► checkForComposeTabs()
  │     │
  │     ├─► browser.tabs.query({ type: "messageCompose" })
  │     │
  │     └─► For each new tab (not in processedTabs):
  │           │
  │           └─► setTimeout(processComposeWindow, 500)
  │
  └─► processComposeWindow(tab)
        │
        ├─► Check if already processed → Exit
        ├─► Get settings
        ├─► Check if enabled → Exit if disabled
        │
        ├─► Get compose details
        │     • Type (reply/replyAll/forward)
        │     • Recipients
        │     • Body
        │     • relatedMessageId
        │
        ├─► Check if reply/forward → Exit if new message
        │
        ├─► Match recipients against groupPattern
        │     • Skip check if recipients empty
        │     • Exit if no match
        │
        ├─► Get original message
        │     • browser.messages.get(relatedMessageId)
        │     • Extract author
        │
        ├─► Extract initials
        │     • FTNQuoter.getInitials(author)
        │     • FTNQuoter.getName(author)
        │
        ├─► Format body
        │     • FTNQuoter.formatBody(body, initials, settings)
        │     │
        │     ├─► Split into lines
        │     ├─► For each line:
        │     │     ├─► Skip "On ... wrote:" attribution
        │     │     ├─► Detect TB quote marker (> )
        │     │     ├─► Check for nested quotes (IZ>)
        │     │     ├─► Apply FTN initials (VP>)
        │     │     └─► Split long lines (maxLineLen)
        │     │
        │     └─► Remove trailing empty quote markers
        │
        ├─► Add double newline after quotes
        │
        ├─► Update compose window
        │     • browser.compose.setComposeDetails()
        │     • Set plainTextBody
        │
        ├─► Add X-Comment-To header (if enabled)
        │     • Set customHeaders: [{name: 'X-Comment-To', value}]
        │
        └─► Add tab.id to processedTabs
```

### 3. Настройки

```
User opens Options
  │
  ├─► Load options.html
  │
  ├─► options.js sends getSettings message
  │     │
  │     └─► background.js responds with settings
  │
  ├─► Populate form fields
  │
  ├─► User changes settings
  │
  ├─► User clicks "Save"
  │
  ├─► options.js sends saveSettings message
  │     │
  │     └─► background.js saves to browser.storage.local
  │
  └─► Show success message
```

## 📦 Структура модулей

### background.js (Main Controller)

```javascript
┌─────────────────────────────────────────┐
│         background.js (478 lines)       │
├─────────────────────────────────────────┤
│ Inline FTNQuoter Object:                │
│  • getInitials(fromHeader)              │
│  • getName(fromHeader)                  │
│  • splitLongLine(text, prefix, maxLen)  │
│  • quoteLine(line, initials, ...)       │
│  • formatBody(body, initials, settings) │
│  • matchesGroup(recipient, pattern)     │
│                                         │
│ Constants:                              │
│  • DEFAULT_SETTINGS                     │
│  • processedTabs (Set для tracking)     │
│                                         │
│ Functions:                              │
│  • getSettings() → Promise<Settings>    │
│  • saveSettings(settings) → Promise     │
│  • processComposeWindow(tab) → Promise  │
│  • checkForComposeTabs() (polling)      │
│  • init()                               │
│                                         │
│ Event Listeners:                        │
│  • runtime.onMessage (settings sync)    │
│                                         │
│ Polling:                                │
│  • setInterval(checkForComposeTabs, 2s) │
│                                         │
│ Script Registration:                    │
│  • messageDisplayScripts.register()     │
│  • composeScripts.register()            │
└─────────────────────────────────────────┘
```

### options/ (Settings UI)

```javascript
┌─────────────────────────────────────────┐
│         options.html (107 lines)        │
├─────────────────────────────────────────┤
│ • HTML5 form with settings              │
│ • Checkboxes, inputs, color pickers     │
│ • Imports: options.css, options.js      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         options.css (135 lines)         │
├─────────────────────────────────────────┤
│ • Modern responsive design              │
│ • Form styling                          │
│ • Button states, colors                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         options.js (167 lines)          │
├─────────────────────────────────────────┤
│ Constants:                              │
│  • DEFAULT_SETTINGS                     │
│  • COLOR_MAP (names → hex)              │
│                                         │
│ Functions:                              │
│  • loadSettings()                       │
│  • saveSettings()                       │
│  • resetSettings()                      │
│  • setupColorSync()                     │
│  • showStatus(message, type)            │
│                                         │
│ Event Listeners:                        │
│  • DOMContentLoaded                     │
│  • form.onSubmit                        │
│  • resetButton.onClick                  │
│  • color inputs onChange                │
└─────────────────────────────────────────┘
```

## 🔐 Permissions

```json
{
  "permissions": [
    "compose",        // Read/write compose window
    "messagesRead",   // Access message details
    "accountsRead",   // Read email accounts (for recipients)
    "storage",        // Save settings
    "tabs",           // Query compose tabs
    "messagesModify"  // Modify message display
  ]
}
```

### Почему эти permissions?

- **compose**: Необходим для чтения и изменения содержимого окна композиции
- **messagesRead**: Для получения информации об оригинальном сообщении (автор, тема)
- **accountsRead**: Для проверки адресов получателей (используется при фильтрации по groupPattern)
- **storage**: Для хранения настроек пользователя в browser.storage.local
- **tabs**: Для polling механизма - обнаружения новых compose windows
- **messagesModify**: Для messageDisplayScripts и composeScripts (подсветка цитат)

## 🎯 Ключевые алгоритмы

### Извлечение инициалов

```javascript
Input:  "Sergey Poziturin <sp@example.com>"

Step 1: Remove email → "Sergey Poziturin"
Step 2: Match pattern → [\w]{1}.*[\. ,_]([\w]{1})
Step 3: Extract → "S" + "P"

Output: "SP"
```

### Цитирование строки

```javascript
Input:  "This is a message"
        initials = "AB"

Step 1: Check if already quoted → No
Step 2: Add initials → " AB> This is a message"
Step 3: Handle HTML entities → " AB&gt; This is a message"

Output: " AB> This is a message"
```

### Разбиение длинной строки

```javascript
Input:  "This is a very long message that needs to be split into multiple lines"
        maxLen = 72
        initials = "AB"

Step 1: Find split point (last space before maxLen)
Step 2: First line: " AB> This is a very long message that needs to be split"
Step 3: Next line:  " AB> into multiple lines"

Output: [
  " AB> This is a very long message that needs to be split",
  " AB> into multiple lines"
]
```

### Цветовая раскраска

```javascript
Input:  " AB> First level\n CD> AB> Second level"
        color1 = "blue"
        color2 = "brown"

Step 1: Count ">" in each line
        Line 1: 1 × ">" → level 1 → color1 (blue)
        Line 2: 2 × ">" → level 2 → color2 (brown)

Output: "<span style='color:blue'> AB> First level</span>
         <span style='color:brown'> CD> AB> Second level</span>"
```

## 🧪 Точки расширения

### Для будущих улучшений

1. **Experiment API**
   - Добавить `experiments/` директорию
   - Создать `api.js` с native Thunderbird API
   - Прямой доступ к DOM композиции

2. **Content Scripts**
   - Внедрение скриптов в окно композиции
   - Real-time обработка ввода
   - WYSIWYG редактирование

3. **Message Display Scripts**
   - Кастомное отображение процитированных сообщений
   - Интерактивное сворачивание цитат
   - Подсветка синтаксиса

4. **Background Workers**
   - Асинхронная обработка больших сообщений
   - Кэширование инициалов
   - Batch processing

## 📊 Производительность

### Memory Usage
- Background script: ~2-5 MB
- Options page: ~5-10 MB (когда открыта)
- Per compose window: ~1-2 MB

### Processing Time
- Extract initials: <1ms
- Quote message (100 lines): ~5-10ms
- Colorize (100 lines): ~10-15ms
- Total overhead: <50ms

### Storage
- Settings: ~1 KB
- No persistent data caching
- No external requests

## 🔒 Безопасность

### Input Validation
```javascript
// Regex pattern validation
try {
  new RegExp(userPattern);
} catch (e) {
  return false; // Invalid pattern
}

// Color validation
const validColor = /^(#[0-9A-Fa-f]{6}|[a-z]+)$/;

// Number bounds
maxLineLen = Math.min(Math.max(40, value), 120);
```

### XSS Prevention
- Все HTML entities экранируются
- Нет использования `innerHTML` с пользовательскими данными
- Цвета проверяются перед применением

### CSP Compliance
- Нет inline scripts
- Нет eval()
- Нет внешних ресурсов

---

**Последнее обновление:** 2026-02-27
**Версия:** 2.0.0
**Актуальная архитектура:** Синхронизировано с кодом src/background.js (478 строк)
