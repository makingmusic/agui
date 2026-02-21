"use client";

import React from "react";
import { A2UIComponent } from "@/lib/a2ui/types";

// ── Shared types ──────────────────────────────────────────────────────────

interface ComponentProps {
  component: A2UIComponent;
  renderChildren: (ids: string[]) => React.ReactNode;
  getValue: (path: string) => unknown;
  setValue: (path: string, value: unknown) => void;
  onAction: (actionName: string) => void;
}

// ── Icon mapping ──────────────────────────────────────────────────────────

const ICON_MAP: Record<string, string> = {
  mail: "\u2709", phone: "\u260E", user: "\u263A", star: "\u2605",
  heart: "\u2665", check: "\u2713", calendar: "\uD83D\uDCC5", clock: "\uD83D\uDD50",
  "map-pin": "\uD83D\uDCCD", globe: "\uD83C\uDF10", search: "\uD83D\uDD0D", settings: "\u2699",
  bell: "\uD83D\uDD14", home: "\uD83C\uDFE0", "arrow-right": "\u2192", plus: "\u002B",
  minus: "\u2212", edit: "\u270E", trash: "\uD83D\uDDD1", download: "\u2B07",
  upload: "\u2B06", link: "\uD83D\uDD17", send: "\u27A4", menu: "\u2630",
  close: "\u2715", "chevron-right": "\u203A", "chevron-down": "\u2304", info: "\u2139",
  warning: "\u26A0", error: "\u26D4", success: "\u2714", airplane: "\u2708",
  hotel: "\uD83C\uDFE8", restaurant: "\uD83C\uDF7D", coffee: "\u2615",
  "shopping-cart": "\uD83D\uDED2", "credit-card": "\uD83D\uDCB3",
  briefcase: "\uD83D\uDCBC", code: "\uD83D\uDCBB", terminal: "\u276F",
  database: "\uD83D\uDDC4", cloud: "\u2601", sun: "\u2600", moon: "\uD83C\uDF19",
};

function getIcon(name: string): string {
  return ICON_MAP[name] || name;
}

// ── Components ────────────────────────────────────────────────────────────

function A2UIText({ component }: ComponentProps) {
  const hint = component.usageHint || "body";
  const content = component.content || "";

  const classMap: Record<string, string> = {
    h1: "a2ui-text-h1",
    h2: "a2ui-text-h2",
    h3: "a2ui-text-h3",
    h4: "a2ui-text-h4",
    h5: "a2ui-text-h5",
    body: "a2ui-text-body",
    caption: "a2ui-text-caption",
    code: "a2ui-text-code",
  };

  const TagMap: Record<string, keyof React.JSX.IntrinsicElements> = {
    h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5",
    body: "p", caption: "span", code: "pre",
  };

  const Tag = TagMap[hint] || "p";
  return <Tag className={classMap[hint] || "a2ui-text-body"}>{content}</Tag>;
}

function A2UIImage({ component }: ComponentProps) {
  return (
    <div className="a2ui-image">
      <img
        src={component.url || ""}
        alt={component.alt || ""}
        style={{ objectFit: component.fit || "cover" }}
      />
      {component.alt && <span className="a2ui-image-alt">{component.alt}</span>}
    </div>
  );
}

function A2UIIcon({ component }: ComponentProps) {
  return (
    <span className="a2ui-icon" role="img" aria-label={component.name}>
      {getIcon(component.name || "")}
    </span>
  );
}

function A2UICard({ component, renderChildren }: ComponentProps) {
  return (
    <div className="a2ui-card">
      {component.title && (
        <div className="a2ui-card-title">{component.title}</div>
      )}
      <div className="a2ui-card-body">
        {component.children && renderChildren(component.children)}
      </div>
    </div>
  );
}

function A2UIRow({ component, renderChildren }: ComponentProps) {
  const dist = component.distribution || "packed";
  const align = component.alignment || "start";
  const gap = component.gap ?? 8;

  const justifyMap: Record<string, string> = {
    equal: "space-evenly",
    packed: "flex-start",
    spaceBetween: "space-between",
  };

  return (
    <div
      className="a2ui-row"
      style={{
        justifyContent: justifyMap[dist] || "flex-start",
        alignItems: align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start",
        gap: `${gap}px`,
      }}
    >
      {component.children && renderChildren(component.children)}
    </div>
  );
}

function A2UIColumn({ component, renderChildren }: ComponentProps) {
  const align = component.alignment || "start";
  const gap = component.gap ?? 8;

  const alignMap: Record<string, string> = {
    start: "stretch",
    center: "center",
    end: "flex-end",
  };

  return (
    <div
      className="a2ui-column"
      style={{
        alignItems: alignMap[align] || "stretch",
        gap: `${gap}px`,
      }}
    >
      {component.children && renderChildren(component.children)}
    </div>
  );
}

function A2UIButton({ component, onAction }: ComponentProps) {
  const variant = component.variant || "primary";
  return (
    <button
      className={`a2ui-button a2ui-button-${variant}`}
      onClick={() => component.actionName && onAction(component.actionName)}
    >
      {component.icon && (
        <span className="a2ui-button-icon">{getIcon(component.icon)}</span>
      )}
      {component.label}
    </button>
  );
}

function A2UITextField({ component, getValue, setValue }: ComponentProps) {
  const value = component.boundPath
    ? (getValue(component.boundPath) as string) ?? ""
    : "";

  return (
    <div className="a2ui-textfield">
      {component.label && (
        <label className="a2ui-textfield-label">
          {component.label}
          {component.required && <span className="a2ui-required">*</span>}
        </label>
      )}
      <input
        type={component.inputType || "text"}
        placeholder={component.placeholder || ""}
        value={value}
        onChange={(e) =>
          component.boundPath && setValue(component.boundPath, e.target.value)
        }
        className="a2ui-textfield-input"
      />
    </div>
  );
}

function A2UICheckBox({ component, getValue, setValue }: ComponentProps) {
  const checked = component.boundPath
    ? !!(getValue(component.boundPath))
    : false;

  return (
    <label className="a2ui-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          component.boundPath && setValue(component.boundPath, e.target.checked)
        }
      />
      <span className="a2ui-checkbox-mark" />
      {component.label && (
        <span className="a2ui-checkbox-label">{component.label}</span>
      )}
    </label>
  );
}

function A2UISlider({ component, getValue, setValue }: ComponentProps) {
  const value = component.boundPath
    ? (getValue(component.boundPath) as number) ?? component.min ?? 0
    : component.min ?? 0;

  return (
    <div className="a2ui-slider">
      {component.label && (
        <label className="a2ui-slider-label">
          {component.label}
          <span className="a2ui-slider-value">{value}</span>
        </label>
      )}
      <input
        type="range"
        min={component.min ?? 0}
        max={component.max ?? 100}
        step={component.step ?? 1}
        value={value}
        onChange={(e) =>
          component.boundPath && setValue(component.boundPath, Number(e.target.value))
        }
        className="a2ui-slider-input"
      />
    </div>
  );
}

function A2UIMultipleChoice({ component, getValue, setValue }: ComponentProps) {
  const mode = component.mode || "single";
  const options = component.options || [];
  const currentValue = component.boundPath ? getValue(component.boundPath) : undefined;

  const isSelected = (val: string) => {
    if (mode === "multi") {
      return Array.isArray(currentValue) && currentValue.includes(val);
    }
    return currentValue === val;
  };

  const handleSelect = (val: string) => {
    if (!component.boundPath) return;
    if (mode === "multi") {
      const arr = Array.isArray(currentValue) ? [...currentValue] : [];
      const idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(val);
      setValue(component.boundPath, arr);
    } else {
      setValue(component.boundPath, val);
    }
  };

  if (mode === "chip") {
    return (
      <div className="a2ui-choice">
        {component.label && (
          <div className="a2ui-choice-label">{component.label}</div>
        )}
        <div className="a2ui-chips">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`a2ui-chip ${isSelected(opt.value) ? "selected" : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="a2ui-choice">
      {component.label && (
        <div className="a2ui-choice-label">{component.label}</div>
      )}
      <div className="a2ui-choice-options">
        {options.map((opt) => (
          <label key={opt.value} className="a2ui-choice-option">
            <input
              type={mode === "multi" ? "checkbox" : "radio"}
              name={component.id}
              checked={isSelected(opt.value)}
              onChange={() => handleSelect(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function A2UITabs({ component, renderChildren }: ComponentProps) {
  const tabs = component.tabs || [];
  const [activeTab, setActiveTab] = React.useState(0);

  return (
    <div className="a2ui-tabs">
      <div className="a2ui-tabs-bar">
        {tabs.map((tab, i) => (
          <button
            key={i}
            className={`a2ui-tab ${i === activeTab ? "active" : ""}`}
            onClick={() => setActiveTab(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="a2ui-tabs-content">
        {tabs[activeTab] && renderChildren([tabs[activeTab].contentId])}
      </div>
    </div>
  );
}

function A2UIDivider({ component }: ComponentProps) {
  const dir = component.direction || "horizontal";
  return <div className={`a2ui-divider a2ui-divider-${dir}`} />;
}

function A2UIList({ component, renderChildren }: ComponentProps) {
  return (
    <div
      className="a2ui-list"
      style={{ maxHeight: component.maxHeight ? `${component.maxHeight}px` : undefined }}
    >
      {component.children && renderChildren(component.children)}
    </div>
  );
}

// ── Widget Registry ───────────────────────────────────────────────────────

export const WIDGET_REGISTRY: Record<
  string,
  React.FC<ComponentProps>
> = {
  Text: A2UIText,
  Image: A2UIImage,
  Icon: A2UIIcon,
  Card: A2UICard,
  Row: A2UIRow,
  Column: A2UIColumn,
  Button: A2UIButton,
  TextField: A2UITextField,
  CheckBox: A2UICheckBox,
  Slider: A2UISlider,
  MultipleChoice: A2UIMultipleChoice,
  Tabs: A2UITabs,
  Divider: A2UIDivider,
  List: A2UIList,
};
