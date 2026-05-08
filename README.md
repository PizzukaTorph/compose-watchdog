# compose-watchdog

Lightweight Docker container health monitor. Watches all containers on the host and sends notifications via Telegram, Email, and/or Webhook when a container goes down or recovers.

## Features

- Monitors all containers via Docker socket (no agent needed)
- Detects `exited`, `dead`, and `unhealthy` states
- Recovery detection: notifies when a container comes back up
- Cooldown to avoid notification spam
- Optional label filter to watch only specific containers
- Config via YAML file or environment variables
- Runs as a Docker container with minimal footprint

## Quick start

```bash
cp config.example.yml config.yml
# Edit config.yml with your notifier credentials

docker compose up -d --build
```

## Configuration

Config file is loaded from `/config/config.yml` inside the container (mount your local `config.yml`).

All values can also be set via environment variables (see `docker-compose.yml`).

| Key | Default | Description |
|---|---|---|
| `interval` | `30` | Seconds between checks |
| `cooldown` | `300` | Seconds before re-notifying same container |
| `label_filter` | — | Only watch containers with this label |

### Notifiers

#### Telegram

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts to choose a name and username (must end in `bot`)
3. BotFather will reply with your **token** — copy it into your config

**Finding your chat ID:**
- Send any message to your bot
- Open in browser: `https://api.telegram.org/bot<TOKEN>/getUpdates`
- If the result is empty (`"result":[]`), it means the bot hasn't received any messages yet — go to Telegram, open the bot, press **Start** or send a message, then reload the URL
- Look for `"chat":{"id": 123456789}` in the JSON — that number is your `chat_id`

#### Email
Standard SMTP. Works with any provider (Gmail, Mailgun, your own server, etc.).

#### Webhook
Sends a POST request with a JSON payload:

...

### Label filter
...

## Development

```bash
npm install
npm run dev
```

Requires Docker socket access on the host.

## License

MIT

---

## Support

If you find this project useful, consider buying me a coffee:

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://www.buymeacoffee.com/pizzu)
