"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { A2UIRenderer } from "@/lib/a2ui/renderer";
import { SurfaceState, applyMessage } from "@/lib/a2ui/store";
import { A2UIServerMessage } from "@/lib/a2ui/types";

const EXAMPLES = [
  "Build a contact form with name, email, phone, and preferred contact method",
  "Create a restaurant menu with appetizers, mains, and desserts",
  "Show me a project dashboard with task status, team members, and deadlines",
  "Make a flight booking form with departure, arrival, dates, and passenger count",
  "Design a user profile card with avatar, bio, and social links",
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [surfaces, setSurfaces] = useState<Map<string, SurfaceState>>(new Map());
  const [jsonlLog, setJsonlLog] = useState<{ ts: number; msg: A2UIServerMessage }[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [jsonlLog]);

  const streamA2UI = useCallback(
    async (message: string, action?: { name: string }, formData?: Record<string, unknown>) => {
      setIsStreaming(true);
      startTimeRef.current = Date.now();

      const body: Record<string, unknown> = { message };
      if (action) {
        body.action = action;
        body.formData = formData || {};
        // Reuse current surface ID
        const currentSurface = Array.from(surfaces.keys())[0];
        if (currentSurface) body.surfaceId = currentSurface;
      }

      try {
        const res = await fetch("http://localhost:8000/a2ui", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok || !res.body) {
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const msg = JSON.parse(jsonStr) as A2UIServerMessage;

              if (msg.type === "done" || msg.type === "error") {
                continue;
              }

              setJsonlLog((prev) => [
                ...prev,
                { ts: (Date.now() - startTimeRef.current) / 1000, msg },
              ]);

              setSurfaces((prev) => applyMessage(prev, msg));
            } catch {
              // skip invalid JSON
            }
          }
        }
      } catch (err) {
        console.error("Stream error:", err);
      } finally {
        setIsStreaming(false);
      }
    },
    [surfaces]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;
    setSurfaces(new Map());
    setJsonlLog([]);
    streamA2UI(prompt.trim());
    setPrompt("");
  };

  const handleExample = (text: string) => {
    if (isStreaming) return;
    setSurfaces(new Map());
    setJsonlLog([]);
    streamA2UI(text);
  };

  const handleAction = (actionName: string, formData: Record<string, unknown>) => {
    if (isStreaming) return;
    streamA2UI("", { name: actionName }, formData);
  };

  const handleDataChange = (surfaceId: string, newDataModel: Record<string, unknown>) => {
    setSurfaces((prev) => {
      const next = new Map(prev);
      const surface = next.get(surfaceId);
      if (surface) {
        next.set(surfaceId, { ...surface, dataModel: newDataModel });
      }
      return next;
    });
  };

  const activeSurface = Array.from(surfaces.values())[0];

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>A2UI</h1>
          <span className="header-badge">Agent-to-User Interface</span>
        </div>
        <div className="header-right">
          <span className="header-proto">Protocol v0.8</span>
        </div>
      </header>

      {/* Prompt Bar */}
      <div className="prompt-section">
        <form onSubmit={handleSubmit} className="prompt-form">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the UI you want to build..."
            className="prompt-input"
            disabled={isStreaming}
          />
          <button
            type="submit"
            className="prompt-submit"
            disabled={!prompt.trim() || isStreaming}
          >
            {isStreaming ? (
              <span className="spinner" />
            ) : (
              "Build"
            )}
          </button>
        </form>
        <div className="example-chips">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              className="example-chip"
              onClick={() => handleExample(ex)}
              disabled={isStreaming}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Rendered Surface */}
      <main className="surface-area">
        {activeSurface ? (
          <A2UIRenderer
            surface={activeSurface}
            onAction={handleAction}
            onDataChange={handleDataChange}
          />
        ) : (
          <div className="surface-empty">
            <div className="empty-icon">&#9670;</div>
            <p className="empty-title">Describe a UI to get started</p>
            <p className="empty-subtitle">
              The agent will generate a complete, interactive interface from your description
            </p>
          </div>
        )}
      </main>

      {/* JSONL Inspector */}
      <div className={`inspector ${inspectorOpen ? "open" : ""}`}>
        <button
          className="inspector-toggle"
          onClick={() => setInspectorOpen(!inspectorOpen)}
        >
          <span className="inspector-title">
            JSONL Stream Inspector
            {jsonlLog.length > 0 && (
              <span className="inspector-count">{jsonlLog.length}</span>
            )}
          </span>
          <span className={`toggle-caret ${inspectorOpen ? "open" : ""}`}>
            &#9650;
          </span>
        </button>
        {inspectorOpen && (
          <div className="inspector-body">
            {jsonlLog.length === 0 ? (
              <div className="inspector-empty">
                Waiting for A2UI messages...
              </div>
            ) : (
              <div className="inspector-scroll">
                {jsonlLog.map((entry, i) => (
                  <div key={i} className="inspector-line">
                    <span className="inspector-ts">
                      {entry.ts.toFixed(2)}s
                    </span>
                    <span className={`inspector-type type-${entry.msg.type}`}>
                      {entry.msg.type}
                    </span>
                    <span className="inspector-json">
                      {JSON.stringify(entry.msg)}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
