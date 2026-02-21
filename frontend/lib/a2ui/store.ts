import { A2UIComponent, A2UIServerMessage } from "./types";

export interface SurfaceState {
  surfaceId: string;
  rootComponentId: string;
  components: Map<string, A2UIComponent>;
  dataModel: Record<string, unknown>;
}

export function createSurface(surfaceId: string, rootComponentId: string): SurfaceState {
  return {
    surfaceId,
    rootComponentId,
    components: new Map(),
    dataModel: {},
  };
}

export function applyMessage(
  surfaces: Map<string, SurfaceState>,
  msg: A2UIServerMessage
): Map<string, SurfaceState> {
  const next = new Map(surfaces);

  switch (msg.type) {
    case "beginRendering": {
      next.set(msg.surfaceId, createSurface(msg.surfaceId, msg.rootComponentId));
      break;
    }
    case "surfaceUpdate": {
      const surface = next.get(msg.surfaceId);
      if (surface) {
        const updated = { ...surface, components: new Map(surface.components) };
        for (const comp of msg.components) {
          updated.components.set(comp.id, comp);
        }
        next.set(msg.surfaceId, updated);
      }
      break;
    }
    case "dataModelUpdate": {
      const surface = next.get(msg.surfaceId);
      if (surface) {
        next.set(msg.surfaceId, {
          ...surface,
          dataModel: deepMerge(surface.dataModel, msg.data),
        });
      }
      break;
    }
  }

  return next;
}

// Resolve a bound path like "/contact/name" from the data model
export function resolveDataPath(
  dataModel: Record<string, unknown>,
  path: string
): unknown {
  const parts = path.replace(/^\//, "").split("/");
  let current: unknown = dataModel;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// Set a value at a bound path in the data model
export function setDataPath(
  dataModel: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const parts = path.replace(/^\//, "").split("/");
  const result = { ...dataModel };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const existing = current[parts[i]];
    current[parts[i]] = typeof existing === "object" && existing != null
      ? { ...(existing as Record<string, unknown>) }
      : {};
    current = current[parts[i]] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
  return result;
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key]) &&
      typeof result[key] === "object" &&
      result[key] !== null
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
