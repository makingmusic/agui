// A2UI Protocol Types v0.8

// ── Component Types ────────────────────────────────────────────────────────

export type ComponentType =
  | "Text"
  | "Image"
  | "Icon"
  | "Card"
  | "Row"
  | "Column"
  | "Button"
  | "TextField"
  | "CheckBox"
  | "Slider"
  | "MultipleChoice"
  | "Tabs"
  | "Divider"
  | "List";

export interface A2UIComponent {
  id: string;
  type: ComponentType;
  children?: string[];
  // Text
  content?: string;
  usageHint?: "h1" | "h2" | "h3" | "h4" | "h5" | "body" | "caption" | "code";
  // Image
  url?: string;
  alt?: string;
  fit?: "cover" | "contain" | "fill";
  // Icon
  name?: string;
  // Card
  title?: string;
  // Row / Column
  distribution?: "equal" | "packed" | "spaceBetween";
  alignment?: "start" | "center" | "end";
  gap?: number;
  // Button
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  actionName?: string;
  icon?: string;
  // TextField
  placeholder?: string;
  inputType?: "text" | "email" | "tel" | "number" | "password" | "date" | "time" | "url";
  required?: boolean;
  boundPath?: string;
  // Slider
  min?: number;
  max?: number;
  step?: number;
  // MultipleChoice
  options?: { value: string; label: string }[];
  mode?: "single" | "multi" | "chip";
  // Tabs
  tabs?: { label: string; contentId: string }[];
  // Divider
  direction?: "horizontal" | "vertical";
  // List
  maxHeight?: number;
}

// ── Server-to-Client Messages ──────────────────────────────────────────────

export interface BeginRenderingMessage {
  type: "beginRendering";
  surfaceId: string;
  rootComponentId: string;
}

export interface SurfaceUpdateMessage {
  type: "surfaceUpdate";
  surfaceId: string;
  components: A2UIComponent[];
}

export interface DataModelUpdateMessage {
  type: "dataModelUpdate";
  surfaceId: string;
  data: Record<string, unknown>;
}

export interface DoneMessage {
  type: "done";
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type A2UIServerMessage =
  | BeginRenderingMessage
  | SurfaceUpdateMessage
  | DataModelUpdateMessage
  | DoneMessage
  | ErrorMessage;

// ── Client-to-Server ───────────────────────────────────────────────────────

export interface UserAction {
  name: string;
  surfaceId: string;
  formData: Record<string, unknown>;
}
