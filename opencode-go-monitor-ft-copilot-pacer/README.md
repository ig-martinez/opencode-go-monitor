# OpenCode Go Pacer

[![Version](https://img.shields.io/badge/version-0.1.2-blue)](https://github.com/jorgealonsodev/opencode-go-monitor-ft-copilot-pacer)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

Visual pacing bar for your OpenCode Go quota — real-time quota monitoring with a daily budget lens. Available in **English** and **Spanish**.

## Features

- **Visual pacing bar in status bar** — See your current OpenCode Go usage as an intuitive `▰▰┃▮▮▯▯▯┃▱▱▱▱` progress bar with a daily budget lens
- **Color-coded thresholds** — Visual feedback with green (normal), yellow (warning), and red (error) colors based on configurable usage thresholds
- **Progress bars on hover** — Hover over the status bar item to see detailed progress bars for rolling, weekly, and monthly usage
- **Selectable display window** — Choose which quota window to display: Rolling, Weekly, or Monthly
- **Historical tracking and exhaustion prediction** — Tracks usage over time and predicts when you might exhaust your quota using linear regression
- **HTML scraping backend** — Fetches quota data directly from the OpenCode web console using your session cookie (API mode is reserved for a future release)
- **Bilingual (EN/ES)** — Automatically detects your VSCode language and displays all messages in English or Spanish

## Screenshots

![OpenCode Go Pacer Tooltip](https://raw.githubusercontent.com/ig-martinez/opencode-go-monitor/master/opencode-go-monitor-ft-copilot-pacer/screenshots/tooltip.png)

*Hover over the status bar item to see detailed progress bars for all three quota windows (Rolling, Weekly, Monthly).*

### What you'll see:

- **Status bar**: Real-time usage percentage with reset countdown
- **Hover tooltip**: Visual progress bars for all quota windows
- **Color coding**: Green (normal), Yellow (≥80%), Red (≥95%)
- **QuickPick details**: Full breakdown with exhaustion prediction
- **Bilingual interface**: Automatically adapts to your VSCode language (EN/ES)

## Setup

### Installation

1. Download the `.vsix` file from the [releases page](https://github.com/jorgealonsodev/opencode-go-monitor/releases)
2. Open VSCode
3. Go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
4. Click the `...` menu (More Actions) and select **Install from VSIX...**
5. Select the downloaded `.vsix` file
6. **Reload VSCode** (`Ctrl+Shift+P` → `Developer: Reload Window`)

### Obtaining Credentials

You need two pieces of information from your OpenCode account: `workspaceId` and `authCookie`.

#### Getting your `authCookie`:

1. Log in to [opencode.ai](https://opencode.ai) in your browser
2. Open DevTools (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`)
3. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
4. In the left sidebar, expand **Cookies** and select `https://opencode.ai`
5. Find the cookie named **`auth`**
6. Copy the **Value** field — this is your `authCookie` (starts with `Fe26.2**...`)

#### Getting your `workspaceId`:

1. While logged in to [opencode.ai](https://opencode.ai), navigate to the Go section
2. Look at the URL in your browser's address bar
3. The URL path will be: `/workspace/{workspaceId}/go`
4. Copy the `{workspaceId}` part — this is your `workspaceId` (e.g., `wrk_01KKKYPCYDAY6DQDY1VK1AJ2QT`)

#### Configuring the Extension:

1. Open VSCode Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type and select: **OpenCode Go Pacer: Configure Credentials**
3. Enter your `workspaceId`
4. Enter your `authCookie` (input is masked for security)
5. The extension will immediately start monitoring your quota

## Configuration

All settings are available under `OpenCode Go Pacer` in VS Code: settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `opencodeGoPacer.pollIntervalSeconds` | `number` | `300` | How often to poll for quota updates (minimum: 60s) |
| `opencodeGoPacer.warningThreshold` | `number` | `80` | Usage percentage to trigger warning color (yellow) |
| `opencodeGoPacer.errorThreshold` | `number` | `95` | Usage percentage to trigger error color (red) |
| `opencodeGoPacer.displayWindow` | `string` | `"rolling"` | Which quota window to display: `rolling`, `weekly`, or `monthly` |
| `opencodeGoPacer.debug` | `boolean` | `false` | Enable debug logging to the Output panel |

> **Note**: Credentials (`workspaceId` and `authCookie`) are stored securely in VSCode's SecretStorage (OS keychain) and persist across all projects until you explicitly logout.

## Commands

All commands are available from the VSCode Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| **OpenCode Go Pacer: Configure Credentials** | Set or update your workspace ID and auth cookie |
| **OpenCode Go Pacer: Refresh Quota** | Force an immediate quota fetch and status bar update |
| **OpenCode Go Pacer: Show Details** | Open QuickPick with detailed quota breakdown and prediction |
| **OpenCode Go Pacer: Export History** | Export all historical quota data to a JSON file |
| **OpenCode Go Pacer: Open Dashboard** | Open the OpenCode console dashboard in your browser |
| **OpenCode Go Pacer: Clear Credentials** | Remove all stored credentials and reset to initial state |
| **OpenCode Go Pacer: Select Display Window** | Choose which quota window to display in the status bar |

## Status Bar

The status bar item shows:
- **Text**: Visual pacing bar (e.g. `▰▰┃▮▮▯▯▯┃▱▱▱▱`) with a daily budget lens
- **Hover tooltip**: Detailed view with progress bars for all three windows, data source, and last update time
- **Colors**: Green (normal), Yellow (≥80%), Red (≥95%)

Click the status bar item to open the details QuickPick.

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Build production bundle
npm run build

# Package as .vsix
npm run package
```

### Project Structure

```
src/
├── domain/        # Core types, formatting, and prediction algorithms
├── storage/       # Credentials (SecretStorage) and history (globalState)
├── fetchers/      # ApiFetcher, ScrapingFetcher, and FetcherSelector
├── ui/            # StatusBarItem and QuickPick UI components
├── commands/      # All 7 VSCode commands
├── i18n.ts        # Internationalization (English/Spanish)
└── extension.ts   # Extension entry point (activation, polling, lifecycle)
```

## Troubleshooting

### "Could not find quota usage data in HTML"

This usually means the cookie is invalid or expired. Try:
1. Log out and log back in to [opencode.ai](https://opencode.ai)
2. Get a fresh `auth` cookie from DevTools
3. Re-configure credentials with the new cookie

### "Auth expired" in status bar

Your session cookie has expired. Follow the steps above to get a new one.

### Debug mode

Enable debug logging by setting `opencodeGoPacer.debug` to `true` in settings. View logs in `View → Output → OpenCode Go Pacer`.

## License

AGPL-3.0
