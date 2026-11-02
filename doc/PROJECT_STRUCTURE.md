# Структура проекта ftnQuoter v2.0

## Обзор директорий

```
ftnquoter/
├── manifest.json           # Манифест WebExtension v2
├── package.json            # npm конфигурация и скрипты сборки
├── build.js                # Скрипт сборки XPI (использует archiver)
├── .gitignore              # Исключения для Git
│
├── src/                    # Исходный код расширения
│   ├── background.js      # Главный контроллер (478 строк)
│   │                      # - inline FTNQuoter object
│   │                      # - отслеживание compose окон (tabs.onCreated)
│   │                      # - processComposeWindow()
│   │                      # - обработка compose windows
│   │
│   ├── display-script.js  # Подсветка цитат при просмотре (182 строки)
│   │                      # - MutationObserver для DOM изменений
│   │                      # - TreeWalker для обработки текста
│   │                      # - colorizeQuotes() для FTN-маркеров
│   │
│   ├── compose-script.js  # Подсветка цитат в композиции (187 строк)
│   │                      # - real-time colorization
│   │                      # - iframe detection
│   │                      # - обработка ввода пользователя
│   │
│   └── options/           # Интерфейс настроек
│       ├── options.html   # HTML форма настроек (130 строк)
│       ├── options.css    # Современные стили (166 строк)
│       └── options.js     # Логика настроек (184 строки)
│                          # - browser.runtime.sendMessage()
│                          # - синхронизация с background.js
│
├── icons/                 # Графические ресурсы
│   ├── icon-48.png        # Иконка 48×48 пикселей
│   ├── icon-64.png        # Иконка 64×64 пикселей
│   ├── icon-96.png        # Иконка 96×96 пикселей
│   ├── icon-128.png       # Иконка 128×128 пикселей
│   ├── icon-*.svg         # Исходники иконок
│   └── create-icons.html  # Генератор иконок (SVG → PNG)
│
├── README.md              # Основная документация
│
└── doc/                   # Документация проекта
    ├── PROJECT_STRUCTURE.md  # Этот файл - структура проекта
    ├── ARCHITECTURE.md    # Детальная архитектура системы
    ├── INSTALL.md         # Инструкция по установке и тестированию
    ├── DEBUGGING.md       # Руководство по отладке
    └── CHANGELOG.md       # История изменений
```

## Описание ключевых файлов

### Корневая директория

| Файл | Назначение | Детали |
|------|-----------|--------|
| `manifest.json` | Манифест WebExtension | Определяет permissions, background scripts, options UI |
| `package.json` | npm конфигурация | Зависимости: archiver, web-ext |
| `build.js` | Сборка XPI | Создаёт ZIP-архив с расширением .xpi |
| `.gitignore` | Git исключения | node_modules/, *.xpi, и др. |

### src/ - Исходный код

#### background.js (478 строк)
**Главный файл расширения**

**Содержит:**
- `FTNQuoter` object (inline) — вся логика цитирования
  - `getInitials(fromHeader)` — извлечение инициалов
  - `getName(fromHeader)` — извлечение имени
  - `splitLongLine(text, prefix, maxLen)` — разбиение строк
  - `quoteLine(line, initials, quoteEmpty, maxLen)` — цитирование строки
  - `formatBody(body, initials, settings)` — обработка всего тела
  - `matchesGroup(recipient, pattern)` — проверка regex

**Функции:**
- `getSettings()` — чтение настроек из browser.storage.local
- `saveSettings(settings)` — сохранение настроек
- `processComposeWindow(tab)` — обработка окна Reply/Forward
- `processOpenComposeTabs()` — обработка compose окон, открытых до запуска расширения
- `init()` — инициализация расширения

**Механизмы:**
- Событие: `browser.tabs.onCreated` — вызывает `processComposeWindow` для вкладок типа `messageCompose`
- Tracking: `Set processedTabs` — каждая вкладка обрабатывается не больше одного раза

#### display-script.js (182 строки)
**Подсветка FTN-цитат при просмотре сообщений**

**Регистрируется через:** `browser.messageDisplayScripts.register()`

**Технологии:**
- `MutationObserver` — отслеживание изменений DOM
- `TreeWalker` — эффективный обход текстовых узлов
- Regex: `/^\s*([\wА-Яа-яЁё]{1,3})(>+)\s/` — поиск FTN-маркеров

**Цвета:**
- 1 уровень (`>`) → color1 (по умолчанию blue)
- 2+ уровня (`>>+`) → color2 (по умолчанию brown)

#### compose-script.js (187 строк)
**Подсветка FTN-цитат в окне композиции**

**Регистрируется через:** `browser.composeScripts.register()`

**Функции:**
- Real-time colorization при вводе текста
- Обработка iframe (Thunderbird использует iframe для редактора)
- Синхронизация с настройками useColors

#### src/options/ - Настройки

**options.html (130 строк)**
- HTML5 форма с полями настроек
- Секции: General, Quoting Options, Colors, FidoNet Options
- Submit → options.js → background.js

**options.css (166 строк)**
- Современный responsive дизайн
- Flexbox layout
- Стили для кнопок, inputs, color pickers

**options.js (184 строки)**
- `loadSettings()` — загрузка через browser.runtime.sendMessage()
- `saveSettings()` — сохранение настроек
- `resetSettings()` — возврат к DEFAULT_SETTINGS
- `setupColorSync()` — синхронизация color input ↔ text input

### icons/ - Графика

| Файл | Размер | Назначение |
|------|--------|-----------|
| `icon-48.png` | 48×48 | Иконка для списка дополнений |
| `icon-64.png` | 64×64 | Иконка среднего размера |
| `icon-96.png` | 96×96 | Иконка для retina дисплеев |
| `icon-128.png` | 128×128 | Иконка крупного размера |
| `icon-*.svg` | - | Исходники иконок |
| `create-icons.html` | - | Генератор PNG из SVG |

### Документация

| Файл | Расположение |
|------|--------------|
| `README.md` | **Корень проекта** |
| `doc/PROJECT_STRUCTURE.md` | Этот файл |
| `doc/ARCHITECTURE.md` | Детальная архитектура |
| `doc/INSTALL.md` | Инструкция по установке |
| `doc/DEBUGGING.md` | Руководство по отладке |
| `doc/CHANGELOG.md` | История изменений |

## Размеры файлов (строки кода)

| Файл | Строки | Комментарий |
|------|--------|-------------|
| `src/background.js` | 478 | Основная логика с inline FTNQuoter |
| `src/display-script.js` | 182 | Подсветка просмотра |
| `src/compose-script.js` | 187 | Подсветка композиции |
| `src/options/options.html` | 130 | Форма настроек |
| `src/options/options.js` | 184 | Логика настроек |
| `src/options/options.css` | 166 | Стили |
| **ВСЕГО** | **~1327** | Без учета doc/ |

## Зависимости

### Runtime (Thunderbird)
- Thunderbird 115.0+
- WebExtension API v2

### Development (npm)
```json
{
  "devDependencies": {
    "archiver": "^6.0.1",  // Создание XPI
    "web-ext": "^7.11.0"   // Lint и watch
  }
}
```

## Build Process

См. [INSTALL.md](INSTALL.md) для команд npm и инструкций по сборке.

### Что попадает в XPI

**Включается:**
- `manifest.json`
- `src/**/*.js`
- `src/**/*.html`
- `src/**/*.css`
- `icons/*.png`

**Исключается:**
- `node_modules/`
- `doc/`
- `build.js`
- `package.json`
- `.gitignore`
- `*.xpi`
- `icons/create-icons.html`

## Потоки данных

Детальные диаграммы потоков данных (инициализация, обработка Reply, настройки) см. в **[ARCHITECTURE.md](ARCHITECTURE.md)**

## Permissions

| Permission | Назначение | Файлы |
|-----------|-----------|-------|
| `compose` | Чтение/изменение compose окон | background.js |
| `messagesRead` | Доступ к оригинальным сообщениям | background.js |
| `storage` | Сохранение настроек | background.js, options.js |
| `messagesModify` | messageDisplayScripts/composeScripts | display-script.js, compose-script.js |

## Известные особенности архитектуры

1. **FTNQuoter inline в background.js** — из-за ограничений importScripts в Thunderbird вся логика встроена напрямую
2. **tabs.onCreated** — отдельного события "compose window opened" в TB API нет, но `tabs.onCreated` срабатывает и для окон написания (`tab.type === "messageCompose"`). Задержка не нужна: `compose.getComposeDetails()` сам ждёт готовности редактора
3. **processedTabs Set** — вкладка помечается в начале `processComposeWindow`, поэтому повторной обработки не бывает
4. **UTF-8 hardcoded** — невозможно изменить charset через WebExtension API (критическая проблема для FTN)

---

**Последнее обновление:** 2026-02-27
**Версия проекта:** 2.0.0
