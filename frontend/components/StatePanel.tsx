"use client";

import { useCoAgent } from "@copilotkit/react-core";

interface AgentState {
  messageCount: number;
  lastQuery: string;
  agentStatus: string;
}

export function StatePanel() {
  const { state } = useCoAgent<AgentState>({
    name: "claude_agent",
    initialState: {
      messageCount: 0,
      lastQuery: "",
      agentStatus: "idle",
    },
  });

  const statusColor = state.agentStatus === "processing" ? "#f59e0b" : "#4ade80";

  return (
    <div className="section">
      <h2>Shared State (Live)</h2>
      <div className="state-grid">
        <div className="state-item">
          <div className="label">Messages</div>
          <div className="value">{state.messageCount}</div>
        </div>
        <div className="state-item">
          <div className="label">Agent Status</div>
          <div className="value" style={{ color: statusColor }}>
            {state.agentStatus}
          </div>
        </div>
        <div className="state-item" style={{ gridColumn: "1 / -1" }}>
          <div className="label">Last Query</div>
          <div className="value" style={{ fontSize: 14 }}>
            {state.lastQuery || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
