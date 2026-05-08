import { Notifier, NotifyEvent, formatMessage } from "../notifier";
import { TelegramConfig } from "../config";

export class TelegramNotifier implements Notifier {
  name = "telegram";

  constructor(private config: TelegramConfig) {}

  async send(event: NotifyEvent): Promise<void> {
    const { title, body } = formatMessage(event);
    const text = `*${this.escapeMarkdown(title)}*\n\`\`\`\n${body}\n\`\`\``;

    const url = `https://api.telegram.org/bot${this.config.token}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: this.config.chat_id,
        text,
        parse_mode: "MarkdownV2",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Telegram error ${res.status}: ${err}`);
    }
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
  }
}
