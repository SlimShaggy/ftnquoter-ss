# Changelog

## [2.0.1] - 2026

- Исправлен баг с удалением/цитированием подписи
- Исправлена работа в русской локализации Thunderbird
- Теглайн считается частью подписи

## [2.0.0] - 2024

### Полное переписывание для Thunderbird 115+

Это полная модернизация оригинального расширения ftnQuoter v0.9 (2010) для совместимости с современными версиями Thunderbird.

### Added (Добавлено)

- ✅ **WebExtension API** - полная миграция на современные API
  - `browser.compose` для работы с окном композиции
  - `browser.messages` для доступа к сообщениям
  - `browser.storage` для хранения настроек
  - `browser.runtime` для обмена сообщениями
  - `browser.messageDisplayScripts` для подсветки цитат при просмотре
  - `browser.composeScripts` для подсветки в окне композиции

- ✅ **Подсветка FTN-цитат**
  - Цветная подсветка цитат при просмотре писем (display-script.js)
  - Автоматическое определение уровней цитирования (первый/вложенный)
  - Защита от бесконечных циклов через MutationObserver
  - Обработка многострочных текстовых узлов

- ✅ **Современный интерфейс настроек**
  - HTML/CSS/JS вместо устаревшего XUL
  - Адаптивный дизайн
  - Визуальные color picker для выбора цветов
  - Валидация полей формы

- ✅ **Улучшенная обработка цитирования**
  - Автоматическое разбиение длинных строк по границам слов
  - Корректная обработка вложенных цитат (`IZ>` → `IZ>>`)
  - Удаление Thunderbird attribution lines ("On ... wrote:")
  - Удаление trailing пустых quote markers
  - Двойной перевод строки после цитаты для удобства ответа

- ✅ **Улучшенная обработка ошибок**
  - Try-catch блоки во всех критических местах
  - Детальное логирование в консоль браузера
  - Информативные сообщения об ошибках

- ✅ **Система сборки**
  - package.json с npm скриптами
  - Автоматическая сборка XPI
  - Поддержка web-ext для разработки

- ✅ **Документация**
  - Подробный README.md на русском языке
  - INSTALL.md с инструкциями по установке
  - DEBUGGING.md с руководством по отладке
  - Комментарии в коде

### Changed (Изменено)

- 🔄 **Архитектура расширения**
  - Переход с XUL overlay на WebExtension background scripts
  - Асинхронные операции (async/await) вместо callbacks
  - Модульная структура кода

- 🔄 **Логика цитирования**
  - Переписана без использования XPCOM компонентов
  - Использование современных String и RegExp методов
  - Улучшенная обработка Unicode символов (поддержка кириллицы)

- 🔄 **Хранение настроек**
  - browser.storage.local вместо preferences API
  - JSON вместо отдельных preference значений
  - Значения по умолчанию в коде

### Removed (Удалено)

- ❌ **Устаревшие технологии**
  - XUL overlay и bindings
  - XPCOM компоненты
  - RDF манифест (install.rdf)
  - chrome.manifest
  - DTD локализация

- ❌ **Прямой доступ к DOM**
  - Манипуляции с окном композиции через overlay
  - Динамическое изменение UI элементов

### Technical Details (Технические детали)

#### Файловая структура

Полная структура проекта с детальным описанием всех файлов доступна в **[doc/PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)**.

**Основные файлы:**
- `src/background.js` — главный контроллер (478 строк, inline FTNQuoter)
- `src/display-script.js` — подсветка при просмотре (182 строки)
- `src/compose-script.js` — подсветка в композиции (187 строк)
- `src/options/*` — интерфейс настроек (130 + 166 + 184 = 480 строк)
- `doc/*` — документация (6 файлов: README, PROJECT_STRUCTURE, ARCHITECTURE, INSTALL, DEBUGGING, CHANGELOG)

#### API миграция

| Старый API (v0.9) | Новый API (v2.0) |
|-------------------|------------------|
| `Components.classes[...]` | `browser.compose.*` |
| `nsIPrefService` | `browser.storage.local` |
| `nsIObserverService` | Event listeners |
| `gMsgCompose` | `browser.compose.getComposeDetails()` |
| `nsIScriptableUnicodeConverter` | Native TextEncoder/TextDecoder |
| XUL preferences | HTML forms + localStorage |

#### Сохраненный и улучшенный функционал

- ✅ FTN-стиль цитирования с инициалами
- ✅ Разбиение длинных строк (с улучшенным алгоритмом по границам слов)
- ✅ Цветовая подсветка уровней цитирования (теперь работает при просмотре!)
- ✅ X-Comment-To заголовок
- ✅ Фильтрация по регулярному выражению
- ✅ Настройка максимальной длины строки
- ✅ Опции цитирования пустых строк и подписи
- ✅ Корректная обработка вложенных цитат

### Technical Solutions (Технические решения)

1. **Подсветка цитат (display-script.js & compose-script.js)**
   - `messageDisplayScripts.register()` для просмотра писем
   - `composeScripts.register()` для окна композиции
   - TreeWalker API для обхода текстовых узлов DOM
   - Обработка многострочных узлов через `split('\n')`
   - MutationObserver с защитой от бесконечных циклов:
     - disconnect/reconnect pattern
     - флаг `isProcessing` для предотвращения реентрантности
   - Regex pattern: `/^\s*([\wА-Яа-яЁё]{1,3})(>+)\s/`

2. **Цитирование при Reply/Forward (background.js)**
   - Polling через `setInterval(checkForComposeTabs, 2000)`
   - Трекинг обработанных вкладок через `Set processedTabs`
   - Задержка 500ms перед обработкой: `setTimeout(processComposeWindow, 500)`
   - Inline FTNQuoter object (избегаем importScripts из-за ограничений TB)
   - Обработка вложенных цитат через regex: `/^ *([\wА-Яа-яЁё]{1,3})(>+) (.*)$/`
   - Умное разбиение строк: `lastIndexOf(' ', maxLen - prefix.length)`
   - Проверка recipients через `matchesGroup(recipient, pattern)`

3. **Хранение настроек**
   - `browser.storage.local.set({settings: ...})`
   - DEFAULT_SETTINGS как fallback
   - Spread operator для merge: `{...DEFAULT_SETTINGS, ...stored.settings}`
   - Синхронизация через `browser.runtime.sendMessage()`
   - Options UI → background.js → storage.local

4. **Извлечение инициалов**
   - Regex: `/[\wА-Яа-яЁё]{1}.*[\. ,_]([\wА-Яа-яЁё]{1})/`
   - Поддержка кириллицы: `[\wА-Яа-яЁё]`
   - Fallback: первая буква имени или "??"
   - Обработка email адресов: удаление `<email>` части

### Migration Notes (Заметки о миграции)

Для пользователей оригинального ftnQuoter v0.9:

- Настройки НЕ переносятся автоматически (разные API)
- Необходимо заново настроить параметры
- Удалите старую версию перед установкой новой
- Thunderbird 115+ обязателен (старые версии не поддерживаются)

### Dependencies (Зависимости)

**Runtime:**
- Thunderbird 115.0+

**Development:**
- Node.js 14+
- npm packages:
  - archiver ^6.0.1
  - web-ext ^7.11.0

### Performance (Производительность)

- Размер расширения: ~15-20 KB (без node_modules)
- Потребление памяти: минимальное (event-driven архитектура)
- Влияние на производительность: незначительное

### Security (Безопасность)

- Использование только разрешенных WebExtension API
- Нет выполнения eval() или удаленного кода
- Локальное хранение настроек (browser.storage.local)
- Минимальный набор permissions

### Compatibility (Совместимость)

- ✅ Thunderbird 115 (Supernova)
- ✅ Thunderbird 128 ESR
- ✅ Windows, macOS, Linux
- ❌ Thunderbird 102 и ниже (используйте v0.9)

### Future Plans (Планы на будущее)

- [ ] Experiment API для расширенных возможностов
- [ ] Поддержка HTML режима композиции
- [ ] Импорт настроек из старой версии
- [ ] Локализация интерфейса (i18n)
- [ ] Дополнительные схемы цитирования
- [ ] Тесты (unit + integration)

### Known Issues (Известные проблемы v2.0)

#### 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: Кодировки

- **❌ Thunderbird 115+ жёстко использует UTF-8** для всех сообщений
- **❌ Невозможно изменить charset через WebExtension API**
- **❌ Русскоязычные FTN-эхи используют CP866/KOI8-R** — несовместимо с UTF-8
- **❌ Сообщения с кириллицей будут кракозябрами** в классических FTN-редакторах
- **Решение:** Использовать Thunderbird 102 и ниже с ftnQuoter v0.9, либо специализированные FTN-клиенты

#### ⚠️ Технические ограничения:

- Не работает в HTML режиме композиции (только Plain Text)
- Polling механизм потребляет ресурсы CPU (проверка каждые 2 секунды)
- FTNQuoter логика inline в background.js (из-за ограничений importScripts)
- Задержка 500-1000ms перед применением цитирования (race condition с TB)
- Attribution lines ("On ... wrote:") удаляются из цитат
- Нет автоматического импорта настроек из v0.9

---

## [0.9] - 2010-11-28

Оригинальная версия от Sergey Poziturin

### Функции

- FTN-style цитирование для Thunderbird 2.x - 3.x
- XUL overlay архитектура
- Поддержка SeaMonkey 2.0
- X-Comment-To заголовки
- Цветовая раскраска
- KOI8-R кодировка для FidoNet

---

## Дата обновления документации

**Последнее обновление CHANGELOG:** 2026-02-27

**Актуализация:** Документация синхронизирована с кодовой базой:
- src/background.js: 478 строк (inline FTNQuoter)
- src/display-script.js: 182 строки
- src/compose-script.js: 187 строк
- src/options/*: 480 строк (130 + 166 + 184)
- Удалён неиспользуемый src/quoter.js

**Примечание:** v2.0 это независимый форк, полностью переписанный для современных версий Thunderbird (115+).
