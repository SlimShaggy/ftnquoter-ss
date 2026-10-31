# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ftnQuoter is a Thunderbird 115+ MailExtension (Manifest V2, plain JavaScript, no bundler or framework). When the user replies to a message, it rewrites Thunderbird's `> ` quoting into FidoNet/GoldED style using the original author's initials (` SP> text`, nested ` SP>> text`). It also wraps long lines, optionally adds an `X-Comment-To` header and greetings, and colors quotes. User-facing docs (README, `doc/*.md`) and the changelog are in Russian.

## Commands

```sh
npm install
npm run build   # node build.js -> ftnquoter-<manifest version>.xpi in repo root
npm run lint    # web-ext lint
npm run watch   # web-ext run with browser console (launches a Firefox-family browser)
```

There are no automated tests. To verify a change, install the built `.xpi` in Thunderbird (Add-ons → gear → Install Add-on From File), reply to a message, and filter the browser console (Ctrl+Shift+J) by `ftnQuoter`. Every code path logs with the `ftnQuoter:` prefix. See `doc/DEBUGGING.md`.

## Architecture

- **`src/background.js`** contains everything that matters: the `FTNQuoter` object (pure text transforms: `getInitials`, `quoteLine`, `splitLongLine`, `formatBody`, `formatBodyAsHTML`, `matchesGroup`), settings storage, and compose-tab processing. The logic is inline on purpose, with no `importScripts` or modules.
- **Compose detection uses polling, not events.** `checkForComposeTabs()` runs every 2 s, queries `messageCompose` tabs, and calls `processComposeWindow()` 500 ms later for each tab not yet in `processedTabs`. Every early-return path that should never retry has to add the tab to `processedTabs`, or the poller will process it again.
- **`processComposeWindow` flow:** skip drafts (`details.type === "draft"`, which must never be modified) → for non-replies, prepend `newGreeting` → for replies, check recipients against the `groupPattern` regex (skipped when recipients are empty) → get initials and name from `messages.get(relatedMessageId).author` → `formatBody` → prepend `replyGreeting` (`%firstname%`/`%lastname%`/`%fullname%`) → write `plainTextBody`, or HTML `body` when `useColors` is on and the compose is HTML → add `X-Comment-To`.
- **`formatBody` rules:** it parses Thunderbird's reply body line by line. The attribution line (English `On … wrote:` or Russian `DD.MM.YYYY HH:MM, … пишет:`) passes through unchanged and is followed by a blank line. Quoted lines that already carry FTN quotes get one extra `>`. A quoted `--- ` tearline starts the signature, which is dropped unless `quoteSignature` is set, and a `...` tagline just before it is dropped with it. Once the quoted block ends, everything after it (the user's own text and signature) is kept verbatim. Initials regexes include Cyrillic (`А-Яа-яЁё`).
- **`src/display-script.js` / `src/compose-script.js`** are registered at runtime through `messageDisplayScripts` / `composeScripts`, not in the manifest. They read `settings` directly from `browser.storage.local` and color FTN quote lines through a TreeWalker plus a MutationObserver. The observer is disconnected while the script edits the DOM, to prevent loops. The two files are near-duplicates, so a fix in one usually belongs in the other.
- **Options page** (`src/options/`) gets and saves settings through `runtime.sendMessage({type: "getSettings" | "saveSettings"})`, which the background script handles. Settings live under one `settings` key in `storage.local`.

## Gotchas

- **`DEFAULT_SETTINGS` and the greetings migration are duplicated** in `src/background.js` and `src/options/options.js`. Keep the two copies identical: adding or changing a setting means updating both, plus `options.html`.
- **Version bumps** (each release is a commit named after the version) touch `manifest.json`, `package.json`, `package-lock.json`, and a new entry in `doc/CHANGELOG.md`. `build.js` reads the version from `manifest.json`.
- **`build.js` packages the whole repo root except its `EXCLUDE` list.** Any new non-extension file or directory at the root (docs, scripts, configs) must be added to `EXCLUDE`, or it ends up inside the XPI.
