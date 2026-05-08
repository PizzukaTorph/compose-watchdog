import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";

export interface TelegramConfig {
  token: string;
  chat_id: string;
}

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
  from: string;
  to: string;
}

export interface WebhookConfig {
  url: string;
  method?: "POST" | "GET";
  headers?: Record<string, string>;
}

export interface NotifiersConfig {
  telegram?: TelegramConfig;
  email?: EmailConfig;
  webhook?: WebhookConfig;
}

export interface Config {
  interval: number;       // seconds between checks
  cooldown: number;       // seconds before re-notifying same container
  label_filter?: string;  // optional: only watch containers with this label
  notifiers: NotifiersConfig;
}

const DEFAULTS: Config = {
  interval: 30,
  cooldown: 300,
  notifiers: {},
};

export function loadConfig(): Config {
  const configPath = process.env.CONFIG_PATH || "/config/config.yml";

  let fileConfig: Partial<Config> = {};

  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf8");
    fileConfig = yaml.load(raw) as Partial<Config>;
    console.log(`[config] Loaded from ${configPath}`);
  } else {
    console.warn(`[config] No config file found at ${configPath}, using env vars only`);
  }

  const config: Config = {
    ...DEFAULTS,
    ...fileConfig,
    notifiers: {
      ...fileConfig.notifiers,
    },
  };

  // Allow env var overrides for notifiers
  if (process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    config.notifiers.telegram = {
      token: process.env.TELEGRAM_TOKEN,
      chat_id: process.env.TELEGRAM_CHAT_ID,
    };
  }

  if (process.env.SMTP_HOST) {
    config.notifiers.email = {
      smtp_host: process.env.SMTP_HOST,
      smtp_port: parseInt(process.env.SMTP_PORT || "587"),
      smtp_secure: process.env.SMTP_SECURE === "true",
      smtp_user: process.env.SMTP_USER || "",
      smtp_pass: process.env.SMTP_PASS || "",
      from: process.env.EMAIL_FROM || "",
      to: process.env.EMAIL_TO || "",
    };
  }

  if (process.env.WEBHOOK_URL) {
    config.notifiers.webhook = {
      url: process.env.WEBHOOK_URL,
      method: (process.env.WEBHOOK_METHOD as "POST" | "GET") || "POST",
    };
  }

  if (process.env.CHECK_INTERVAL) {
    config.interval = parseInt(process.env.CHECK_INTERVAL);
  }

  if (process.env.COOLDOWN) {
    config.cooldown = parseInt(process.env.COOLDOWN);
  }

  if (process.env.LABEL_FILTER) {
    config.label_filter = process.env.LABEL_FILTER;
  }

  return config;
}
