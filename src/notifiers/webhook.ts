import { Notifier, NotifyEvent, formatMessage } from "../notifier";
import { WebhookConfig } from "../config";
import { ContainerStatus } from "../docker";

interface WebhookPayload {
  event: string;
  container: {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
    health?: string;
    compose_project?: string;
    compose_service?: string;
  };
  title: string;
  message: string;
  timestamp: string;
}

export class WebhookNotifier implements Notifier {
  name = "webhook";

  constructor(private config: WebhookConfig) {}

  async send(event: NotifyEvent): Promise<void> {
    const { title, body } = formatMessage(event);

    const payload: WebhookPayload = {
      event: event.type,
      container: {
        id: event.container.id,
        name: event.container.name,
        image: event.container.image,
        state: event.container.state,
        status: event.container.status,
        health: event.container.health,
        compose_project: event.container.composeProject,
        compose_service: event.container.composeService,
      },
      title,
      message: body,
      timestamp: event.timestamp.toISOString(),
    };

    const res = await fetch(this.config.url, {
      method: this.config.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Webhook error ${res.status}: ${err}`);
    }
  }
}
