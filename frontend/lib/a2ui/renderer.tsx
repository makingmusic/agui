"use client";

import React from "react";
import { WIDGET_REGISTRY } from "@/components/a2ui/components";
import { SurfaceState, resolveDataPath, setDataPath } from "./store";

interface RendererProps {
  surface: SurfaceState;
  onAction: (actionName: string, formData: Record<string, unknown>) => void;
  onDataChange: (surfaceId: string, newDataModel: Record<string, unknown>) => void;
}

export function A2UIRenderer({ surface, onAction, onDataChange }: RendererProps) {
  const { rootComponentId, components, dataModel } = surface;

  const getValue = (path: string): unknown => {
    return resolveDataPath(dataModel, path);
  };

  const setValue = (path: string, value: unknown) => {
    const updated = setDataPath(dataModel, path, value);
    onDataChange(surface.surfaceId, updated);
  };

  const handleAction = (actionName: string) => {
    onAction(actionName, dataModel);
  };

  const renderComponent = (componentId: string): React.ReactNode => {
    const comp = components.get(componentId);
    if (!comp) return null;

    const Widget = WIDGET_REGISTRY[comp.type];
    if (!Widget) {
      return (
        <div key={comp.id} className="a2ui-unknown">
          Unknown: {comp.type}
        </div>
      );
    }

    const renderChildren = (ids: string[]): React.ReactNode => {
      return ids.map((id) => (
        <React.Fragment key={id}>{renderComponent(id)}</React.Fragment>
      ));
    };

    return (
      <Widget
        key={comp.id}
        component={comp}
        renderChildren={renderChildren}
        getValue={getValue}
        setValue={setValue}
        onAction={handleAction}
      />
    );
  };

  const rootComp = components.get(rootComponentId);
  if (!rootComp) {
    return <div className="a2ui-loading">Building interface...</div>;
  }

  return (
    <div className="a2ui-surface">{renderComponent(rootComponentId)}</div>
  );
}
