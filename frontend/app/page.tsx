"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { AgentTools } from "@/components/AgentTools";
import { StatePanel } from "@/components/StatePanel";
import { useState, useEffect } from "react";

function AppContent() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="claude_agent">
      <AgentTools />
      <div className="app-container" suppressHydrationWarning>
        <div className="left-panel">
          <div className="header">
            <h1>AG-UI POC</h1>
            <span className="badge">AG-UI Protocol</span>
          </div>
          <div style={{ padding: "24px 0" }}>
            <StatePanel />
            <div className="section">
              <h2>About This Demo</h2>
              <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6 }}>
                This POC demonstrates the AG-UI protocol with Claude. Try these:
              </p>
              <ul style={{ color: "#888", fontSize: 14, lineHeight: 1.8, paddingLeft: 20, marginTop: 8 }}>
                <li><strong style={{ color: "#aaa" }}>Streaming chat</strong> — Ask any question</li>
                <li><strong style={{ color: "#aaa" }}>Weather tool</strong> — &quot;What&apos;s the weather in Tokyo?&quot;</li>
                <li><strong style={{ color: "#aaa" }}>Chart tool</strong> — &quot;Show me a chart of quarterly revenue&quot;</li>
                <li><strong style={{ color: "#aaa" }}>Image tool</strong> — &quot;Show me an image of a sunset&quot;</li>
                <li><strong style={{ color: "#aaa" }}>Shared state</strong> — Watch the panel above update in real-time</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="right-panel">
          <div className="chat-wrapper">
            <CopilotChat
              labels={{
                title: "Claude Agent",
                initial: "Hi! I can chat, show weather, create charts, and display images. Try asking me something!",
              }}
            />
          </div>
        </div>
      </div>
    </CopilotKit>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Suppress custom element re-registration errors during hot reload
    const originalCustomElementsDefine = window.customElements.define;
    window.customElements.define = function(name, constructor, options) {
      if (!customElements.get(name)) {
        originalCustomElementsDefine.call(customElements, name, constructor, options);
      }
    };
  }, []);

  if (!mounted) {
    return (
      <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#888" }}>
        <div className="spinner" />
      </div>
    );
  }

  return <AppContent />;
}
