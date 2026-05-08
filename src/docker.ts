import Dockerode from "dockerode";

export interface ContainerStatus {
  id: string;
  name: string;
  image: string;
  state: string;       // running, exited, dead, paused, restarting, ...
  status: string;      // human-readable (e.g. "Up 2 hours", "Exited (1) 5 minutes ago")
  health?: string;     // healthy, unhealthy, starting, none
  labels: Record<string, string>;
  composeProject?: string;
  composeService?: string;
}

const docker = new Dockerode({ socketPath: "/var/run/docker.sock" });

export async function listContainers(labelFilter?: string): Promise<ContainerStatus[]> {
  const filters: Record<string, string[]> = {};

  if (labelFilter) {
    filters["label"] = [labelFilter];
  }

  const containers = await docker.listContainers({
    all: true,
    filters: Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined,
  });

  return containers.map((c) => {
    const name = c.Names[0]?.replace(/^\//, "") || c.Id.slice(0, 12);
    const health = c.Status.includes("healthy")
      ? c.Status.includes("unhealthy")
        ? "unhealthy"
        : "healthy"
      : undefined;

    return {
      id: c.Id,
      name,
      image: c.Image,
      state: c.State,
      status: c.Status,
      health,
      labels: c.Labels || {},
      composeProject: c.Labels?.["com.docker.compose.project"],
      composeService: c.Labels?.["com.docker.compose.service"],
    };
  });
}

export function isUnhealthy(container: ContainerStatus): boolean {
  if (["exited", "dead"].includes(container.state)) return true;
  if (container.health === "unhealthy") return true;
  return false;
}

export function isRecovered(container: ContainerStatus): boolean {
  return container.state === "running" && container.health !== "unhealthy";
}
