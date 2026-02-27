# Отладка ftnQuoter v2.0

Если расширение установлено, но не влияет на цитирование, следуйте этим шагам:

## Шаг 1: Проверка установки

1. Откройте Thunderbird
2. `Меню → Дополнения и темы` (Ctrl+Shift+A)
3. Найдите **ftnQuoter** в списке
4. Убедитесь что:
   - ✅ Расширение **включено**
   - ✅ Версия: **2.0.0**
   - ✅ Нет ошибок или предупреждений

## Шаг 2: Проверка логов

### Открыть консоль браузера

1. `Меню → Дополнительные инструменты → Консоль браузера`
2. Или нажмите `Ctrl+Shift+J` (Cmd+Shift+J на macOS)
3. В фильтре введите: `ftnQuoter`

### Что искать в логах

При запуске Thunderbird должны быть:
```
ftnQuoter: initialized (v2.0)
ftnQuoter: default settings: {enabled: true, maxLineLen: 72, ...}
ftnQuoter: settings loaded from storage
ftnQuoter: messageDisplayScripts registered
ftnQuoter: composeScripts registered
ftnQuoter: polling started (interval: 2000ms)
```

При открытии Reply должны быть (через ~2 секунды после открытия):
```
ftnQuoter: checking for compose tabs...
ftnQuoter: found 1 compose tab(s)
ftnQuoter: new compose tab detected: [tabId]
ftnQuoter: processing will start in 500ms...
ftnQuoter: processComposeWindow called for tab [tabId]
ftnQuoter: compose details: {type: "reply", plainTextBody: "...", ...}
ftnQuoter: processing reply/forward
ftnQuoter: recipients: ["user@example.com"]
ftnQuoter: recipient matches group pattern
ftnQuoter: original message: {author: "Name <email>", ...}
ftnQuoter: extracted initials: "AB" from "Alice Bob"
ftnQuoter: formatting body (X lines)
ftnQuoter: processed quote body (Y lines)
ftnQuoter: updating compose window...
ftnQuoter: [optional] adding X-Comment-To header
ftnQuoter: FTN-style quoting applied successfully
ftnQuoter: tab [tabId] marked as processed
```

### Распространенные ошибки и их решения

**Ошибка 1:** `ftnQuoter: extension is disabled`
- **Причина:** Расширение отключено в настройках
- **Решение:** Откройте настройки (`Меню → Дополнения → ftnQuoter → Настройки`) и установите галочку "Включить ftnQuoter"

**Ошибка 2:** `ftnQuoter: not a reply/forward, skipping (type: "draft")`
- **Причина:** Открыто новое письмо, а не ответ или пересылка
- **Решение:** Откройте существующее письмо и нажмите "Ответить" или "Переслать"

**Ошибка 3:** `ftnQuoter: no recipients found, skipping group pattern check`
- **Причина:** В окне композиции отсутствуют получатели
- **Решение:** Нормальное поведение - расширение продолжит работу без проверки паттерна

**Ошибка 4:** `ftnQuoter: recipient doesn't match group pattern`
- **Причина:** Адрес получателя не соответствует регулярному выражению в настройках
- **Решение:**
  1. Посмотрите в логе адрес получателя: `ftnQuoter: recipients: ["actual@email.com"]`
  2. Откройте настройки ftnQuoter
  3. Измените "Шаблон групп":
     - Для всех адресов: `.*`
     - Для конкретного домена: `.*@example\.com.*`
     - Для FidoNet: `^(fido7\.|.*<.*@.*>).*$` (по умолчанию)

**Ошибка 5:** `ftnQuoter: plainTextBody is empty`
- **Причина:** Тело сообщения пустое или в HTML режиме
- **Решение:**
  - Убедитесь что оригинальное письмо содержит текст
  - Проверьте что Thunderbird в режиме Plain Text (не HTML)

**Ошибка 6:** `ftnQuoter: failed to get original message`
- **Причина:** Не удалось получить оригинальное сообщение
- **Решение:** Убедитесь что письмо не было удалено из почтового ящика

**Ошибка 7:** `Error: ... browser.compose.setComposeDetails ...`
- **Причина:** Проблема с API Thunderbird
- **Решение:**
  - Обновите Thunderbird до версии 115+
  - Переустановите расширение

## Шаг 3: Проверка настроек

1. `Меню → Дополнения и темы → ftnQuoter → Настройки`

### Обязательные настройки:

- ✅ **Включить ftnQuoter** — должна быть галочка
- 📝 **Шаблон групп** — для теста используйте `.*` (разрешить все адреса)

### Попробуйте минимальную конфигурацию:

```
Включить ftnQuoter: ✓
Максимальная длина строки: 72
Шаблон групп: .*
Цитировать пустые строки: ☐
Цитировать подпись: ☐
Использовать цветовую разметку: ☐
Добавлять заголовок X-Comment-To: ☐
Использовать flowed формат: ☐
```

## Шаг 4: Тест с максимальным логированием

### Тестовый сценарий:

1. **Закройте Thunderbird полностью**
2. **Откройте консоль браузера** (`Ctrl+Shift+J`)
3. **Запустите Thunderbird**
4. **Проверьте инициализацию** в логах
5. **Отправьте себе тестовое письмо:**
   ```
   To: your@email.com
   Subject: Test
   Body:
   This is line 1
   This is line 2
   This is line 3
   ```
6. **Откройте письмо**
7. **Нажмите "Ответить"** (НЕ "Ответить всем", просто "Ответить")
8. **Смотрите логи** — должны появиться сообщения о обработке
9. **Проверьте окно композиции** — текст должен быть процитирован

### Ожидаемый результат:

```
 ??> This is line 1
 ??> This is line 2
 ??> This is line 3
```

(Инициалы будут `??` если не удалось извлечь из имени отправителя)

## Шаг 5: Проверка permissions

Откройте `about:debugging#/runtime/this-firefox` (или для Thunderbird: `about:debugging`)

Найдите ftnQuoter и проверьте permissions:
- ✅ compose
- ✅ messagesRead
- ✅ accountsRead
- ✅ storage
- ✅ tabs

Если permissions отсутствуют — переустановите расширение.

## Шаг 6: Переустановка

Если ничего не помогло:

1. **Удалить расширение:**
   - `Меню → Дополнения и темы`
   - Найти ftnQuoter
   - `...` → Удалить
   - Перезапустить Thunderbird

2. **Пересобрать XPI:**
   ```bash
   cd modern-extension
   rm ftnquoter-2.0.0.xpi
   npm run build
   ```

3. **Установить заново:**
   - `Меню → Дополнения и темы`
   - `⚙️` → Установить дополнение из файла
   - Выбрать новый `ftnquoter-2.0.0.xpi`

## Известные проблемы

### 1. HTML режим композиции

**Проблема:** Расширение работает только в **plain text режиме**.

**Решение:**
1. `Меню → Настройки → Составление`
2. Снять галочку "Составлять сообщения в формате HTML"

Или при ответе:
1. `Параметры → Формат → Только текст`

### 2. Timing issues (окно обрабатывается слишком рано)

**Проблема:** Расширение применяет FTN-цитирование, но затем Thunderbird перезаписывает текст стандартным.

**Причина:** Thunderbird может инициализировать compose window асинхронно.

**Решение:** Увеличьте задержку в `src/background.js:459`:
```javascript
setTimeout(async () => {
  await processComposeWindow(tab);
}, 1000);  // Было 500ms, увеличено до 1000ms
```

### 3. Polling не обнаруживает новые окна

**Проблема:** Compose windows открываются, но не обрабатываются.

**Диагностика:** Проверьте логи - должно быть сообщение каждые 2 секунды:
```
ftnQuoter: checking for compose tabs...
```

**Решение:**
- Убедитесь что `setInterval` не был отменён
- Проверьте Browser Console (не Developer Console!)
- Переустановите расширение

### 4. ComposeDetails API ограничения

**Проблема:** `plainTextBody` может быть `undefined` в некоторых версиях TB.

**Обходной путь:** Расширение проверяет оба поля:
```javascript
const body = details.plainTextBody || details.body || "";
```

### 5. Цитирование применяется повторно

**Проблема:** При повторном открытии того же окна Reply цитирование дублируется.

**Причина:** Tab ID переиспользуется.

**Решение:** Расширение использует `Set processedTabs` для отслеживания обработанных вкладок. Если проблема повторяется, очистите кэш:
```javascript
// В Browser Console:
processedTabs.clear();
```

## Сбор информации для bug report

Если проблема не решается, соберите следующую информацию:

1. **Версия Thunderbird:**
   ```
   Меню → Справка → О Thunderbird
   ```

2. **Операционная система:**
   - Windows / macOS / Linux
   - Версия

3. **Логи из консоли:**
   - Весь вывод с префиксом `ftnQuoter:`
   - Любые ошибки

4. **Настройки расширения:**
   - Скриншот страницы настроек

5. **Воспроизведение:**
   - Пошаговая инструкция что делали
   - Что ожидали
   - Что получили

## Расширенная отладка

### Проверка состояния расширения в реальном времени

Откройте **Browser Console** (`Ctrl+Shift+J`) и выполните:

```javascript
// Проверить текущие настройки
browser.storage.local.get('settings').then(console.log);

// Проверить обработанные вкладки
console.log(processedTabs); // Может не работать из-за scope

// Получить список всех compose tabs
browser.tabs.query({type: "messageCompose"}).then(console.log);

// Вручную запустить обработку для tab ID 5
processComposeWindow({id: 5}); // Может не работать из-за scope
```

### Ручная проверка messageDisplayScripts

1. Откройте письмо с FTN-цитатами (например, с текстом ` AB> test`)
2. Откройте Developer Tools для окна просмотра (F12)
3. В Console должны быть сообщения:
```
ftnQuoter display: initializing...
ftnQuoter display: settings loaded
ftnQuoter display: applying quote colors...
ftnQuoter display: processed X text nodes
```

### Проверка polling механизма

В Browser Console выполните:
```javascript
// Проверить что интервал активен
setInterval(() => console.log("Polling check"), 2000);
```

Если сообщения появляются каждые 2 секунды - polling работает.
