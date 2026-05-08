import { loadConfig } from "./config";
import { listContainers, isUnhealthy, isRecovered, ContainerStatus } from "./docker";
import { Notifier, NotifyEvent } from "./notifier";
import { TelegramNotifier } from "./notifiers/telegram";
import { EmailNotifier } from "./notifiers/email";
import { WebhookNotifier } from "./notifiers/webhook";

// Track state per container: "down" | "up"
const containerState: Map<string, "down" | "up"> = new Map();

// Cooldown: last notification timestamp per container+event
const lastNotified: Map<string, number> = new Map();

function log(msg: string): void {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

async function notify(notifiers: Notifier[], event: NotifyEvent): Promise<void> {
  const results = await Promise.allSettled(
    notifiers.map((n) =>
      n.send(event).then(() => {
        log(`[${n.name}] Notification sent: ${event.type} → ${event.container.name}`);
      })
    )
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(`Notifier error: ${result.reason}`);
    }
  }
}

async function check(notifiers: Notifier[], config: ReturnType<typeof loadConfig>): Promise<void> {
  let containers: ContainerStatus[];

  try {
    containers = await listContainers(config.label_filter);
  } catch (err) {
    console.error(`[docker] Failed to list containers: ${err}`);
    return;
  }

  const now = Date.now();

  for (const container of containers) {
    const prevState = containerState.get(container.id) ?? "up";
    const cooldownKey = `${container.id}:${prevState}`;
    const lastNotif = lastNotified.get(cooldownKey) ?? 0;
    const cooldownMs = config.cooldown * 1000;

    if (isUnhealthy(container)) {
      if (prevState !== "down") {
        containerState.set(container.id, "down");
        log(`🔴 DOWN: ${container.name} (${container.state} / ${container.status})`);

        const event: NotifyEvent = {
          type: "down",
          container,
          timestamp: new Date(),
        };

        lastNotified.set(cooldownKey, now);
        await notify(notifiers, event);
      } else if (now - lastNotif > cooldownMs) {
        // Re-notify if still down after cooldown
        log(`🔴 STILL DOWN: ${container.name} — re-notifying`);

        const event: NotifyEvent = {
          type: "down",
          container,
          timestamp: new Date(),
        };

        lastNotified.set(cooldownKey, now);
        await notify(notifiers, event);
      }
    } else {
      if (prevState === "down") {
        containerState.set(container.id, "up");
        log(`🟢 RECOVERED: ${container.name}`);

        const event: NotifyEvent = {
          type: "recovered",
          container,
          timestamp: new Date(),
        };

        await notify(notifiers, event);
      }
    }
  }
}

function buildNotifiers(config: ReturnType<typeof loadConfig>): Notifier[] {
  const notifiers: Notifier[] = [];

  if (config.notifiers.telegram) {
    notifiers.push(new TelegramNotifier(config.notifiers.telegram));
    log("[config] Telegram notifier enabled");
  }

  if (config.notifiers.email) {
    notifiers.push(new EmailNotifier(config.notifiers.email));
    log("[config] Email notifier enabled");
  }

  if (config.notifiers.webhook) {
    notifiers.push(new WebhookNotifier(config.notifiers.webhook));
    log("[config] Webhook notifier enabled");
  }

  if (notifiers.length === 0) {
    log("[config] WARNING: no notifiers configured — events will only be logged");
  }

  return notifiers;
}

async function main(): Promise<void> {
  log("compose-watchdog starting");

  const config = loadConfig();
  const notifiers = buildNotifiers(config);

  log(`[config] interval=${config.interval}s cooldown=${config.cooldown}s`);
  if (config.label_filter) {
    log(`[config] label_filter=${config.label_filter}`);
  }

  // Initial check immediately
  await check(notifiers, config);

  // Then loop
  setInterval(() => check(notifiers, config), config.interval * 1000);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
