import { ContainerStatus } from "./docker";

export type EventType = "down" | "recovered";

export interface NotifyEvent {
  type: EventType;
  container: ContainerStatus;
  timestamp: Date;
}

export interface Notifier {
  name: string;
  send(event: NotifyEvent): Promise<void>;
}

export function formatMessage(event: NotifyEvent): { title: string; body: string } {
  const { type, container, timestamp } = event;
  const ts = timestamp.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const project = container.composeProject ? ` [${container.composeProject}]` : "";

  if (type === "down") {
    return {
      title: `🔴 Container DOWN: ${container.name}`,
      body: [
        `Container: ${container.name}${project}`,
        `Image: ${container.image}`,
        `State: ${container.state}`,
        `Status: ${container.status}`,
        container.health ? `Health: ${container.health}` : null,
        `Time: ${ts}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  return {
    title: `🟢 Container RECOVERED: ${container.name}`,
    body: [
      `Container: ${container.name}${project}`,
      `Image: ${container.image}`,
      `State: ${container.state}`,
      `Status: ${container.status}`,
      `Time: ${ts}`,
    ].join("\n"),
  };
}
