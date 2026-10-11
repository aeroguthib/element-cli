# Element CLI (`@element-hq/element-cli`)

A fast, lightweight, and secure **Matrix Terminal User Interface (TUI) & Command-Line Client** for Element Web / Matrix ecosystem. Built with TypeScript and Node.js with zero runtime dependencies.

---

## ✨ Features

- 🖥️ **Full-featured Terminal User Interface (TUI)**:
  - Responsive ANSI split-pane layout styled after Element Web and Compound design tokens.
  - Interactive room list sidebar with unread badges and active selection indicator.
  - Message timeline with deterministic author color hashing, timestamps, and message formatting.
  - Media message rendering with file sizes and type indicators (📷 image, 🎥 video, 🎵 audio, 📎 file).
  - Terminal resize handling and zero-flicker alternate buffer rendering (`\x1b[?1049h`).
  - Command input history (Up/Down arrows) and built-in help modal (`/help` or `Ctrl+H`).

- 🌐 **Homeserver Selection & Auto-Discovery**:
  - Connect to any Matrix homeserver (e.g. `matrix.org`, custom domains, or self-hosted homeservers).
  - Automatic `.well-known/matrix/client` resolution and fallback verification against `/_matrix/client/versions`.

- 🔐 **Authentication & Session Management**:
  - Username & password login, or direct authentication via Matrix Access Token.
  - Session verification via `/_matrix/client/v3/account/whoami`.
  - Secure credential storage in `~/.config/element-cli/session.json` with strict POSIX `0600` permissions.
  - Automatic re-authentication on startup.

- 🔄 **Continuous Real-Time Sync**:
  - Long-polling Matrix `/sync` engine tracking room metadata, members, and state.
  - Dynamic display name computation for 1:1 direct messages (DMs) and group chats.
  - Exponential backoff and auto-reconnect resilience on connection dropouts.

- 📁 **File & Media Transfer**:
  - Inspects file types and maps to Matrix media types (`m.image`, `m.video`, `m.audio`, `m.file`).
  - Seamlessly uploads binaries to Matrix Content Repository (`/_matrix/media/v3/upload`).
  - Send photos, videos, voice recordings, and documents directly from the terminal or CLI script.

- ⚡ **Scriptable CLI Subcommands**:
  - Send messages or files via bash scripts or CI/CD pipelines without launching the TUI.
  - Query rooms as JSON (`element-cli rooms --json`).
  - Stream live room events to stdout (`element-cli sync --follow`).

---

## 🚀 Quick Start

### Running Directly from Monorepo

```bash
# Launch interactive TUI
./apps/cli/bin/element-cli.js

# Or using pnpm
cd apps/cli
pnpm start
```

### Installation from Distribution Package

You can package and install Element CLI globally or run it via `npx`:

```bash
# Package the distribution tarball
./apps/cli/scripts/package.sh

# Install globally on your machine
npm install -g ./apps/cli/dist/element-hq-element-cli-1.0.0.tgz

# Now element-cli is available everywhere in your terminal:
element-cli
```

---

## 🎮 Interactive TUI Usage

Launch the TUI simply by typing:

```bash
element-cli
```

### Keybindings

| Key | Action |
| --- | --- |
| `Tab` | Switch focus between Room List sidebar and Message Input |
| `Up` / `Down` | Navigate rooms (when focused on sidebar) or cycle input history |
| `Page Up` / `Page Down` | Scroll message timeline |
| `Enter` | Select room (in sidebar) or send message (in input bar) |
| `Ctrl+H` | Toggle Help modal |
| `Ctrl+K` | Clear message timeline buffer |
| `Ctrl+U` | Clear current input line |
| `Ctrl+C` | Quit Element CLI |

### Slash Commands (In Chat Input)

Type any of the following slash commands in the message input bar:

- `/help` - Open the keyboard shortcuts & commands modal.
- `/file <path>` - Upload and send a local photo, video, audio or document.
- `/me <action>` - Send an emote message (e.g. `/me is testing the CLI`).
- `/join <#alias or !roomId>` - Join a new room.
- `/leave` - Leave the currently selected room.
- `/clear` - Clear timeline screen buffer.
- `/logout` - Log out and return to login screen.
- `/quit` or `/exit` - Exit the application.

---

## 💻 CLI Subcommand Reference

Element CLI can also be used as a command-line utility for scripting and terminal pipelines.

### `element-cli login`

Authenticate with a Matrix homeserver:

```bash
# Interactive prompt
element-cli login

# Or pass credentials via flags
element-cli login --homeserver matrix.org --username alice --password secret

# Or login directly with an access token
element-cli login --homeserver matrix.org --token "syt_xxxx"
```

### `element-cli whoami`

Check active session, user ID, device ID, and homeserver:

```bash
element-cli whoami
```

### `element-cli rooms`

List all joined rooms, topics, member counts, and unread notifications:

```bash
element-cli rooms

# Output as JSON for scripting (e.g. with jq)
element-cli rooms --json
```

### `element-cli send`

Send a text message directly to a room:

```bash
element-cli send --room "!roomId:matrix.org" --message "Deployment completed successfully! 🚀"
# Or using room alias:
element-cli send --room "#myroom:matrix.org" --message "Hello from my terminal!"
```

### `element-cli send-file`

Upload and send a photo, video, audio, or document:

```bash
# Send an image
element-cli send-file --room "!roomId:matrix.org" --file "~/Pictures/screenshot.png"

# Send a video
element-cli send-file --room "!roomId:matrix.org" --file "./demo.mp4"

# Send a document
element-cli send-file --room "!roomId:matrix.org" --file "./report.pdf"
```

### `element-cli sync`

Fetch or stream room messages to stdout:

```bash
# Sync recent timeline messages
element-cli sync

# Follow real-time events continuously
element-cli sync --follow --room "!roomId:matrix.org"
```

### `element-cli logout`

Log out of current session and securely remove stored credentials:

```bash
element-cli logout
```

---

## 🛠️ Development & Testing

### Running Tests

Unit tests are written with Vitest:

```bash
cd apps/cli
pnpm test:unit
```

### Type Checking

```bash
cd apps/cli
pnpm lint:types
```

### Building Distribution Package

```bash
cd apps/cli
./scripts/package.sh
```

---

## 📄 License

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see `LICENSE` in repository root for full details.
