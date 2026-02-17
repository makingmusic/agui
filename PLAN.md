# AG-UI POC: Dynamic LLM-Driven UI

## Context

Build a small proof-of-concept that uses the AG-UI protocol to dynamically generate UI from an LLM's output. The backend calls Claude (Anthropic API) and streams AG-UI events. The frontend uses CopilotKit to render streaming chat, tool calls, shared state, generative UI, and activity indicators.

## Architecture

```
┌─────────────────────────────┐     AG-UI events (SSE)     ┌──────────────────────┐
│  Python Backend (port 8000) │ ◄─────────────────────────► │  Next.js Frontend    │
│  FastAPI + ag-ui-protocol   │                             │  CopilotKit + React  │
│  + anthropic SDK            │                             │  (port 3000)         │
└─────────────────────────────┘                             └──────────────────────┘
         │                                                           │
         ▼                                                           ▼
   Anthropic Claude API                                   Browser renders:
   (streaming messages)                                   - Chat UI
                                                          - Tool call cards
                                                          - Shared state panel
                                                          - Activity indicators
                                                          - Generative UI components
```

The Next.js app has a thin API route (`/api/copilotkit`) that creates a `CopilotRuntime` pointing to the Python backend as a remote AG-UI agent. CopilotKit handles all event parsing and UI rendering.

## Project Structure

```
agui/
├── backend/
│   ├── server.py              # FastAPI app, AG-UI event streaming, Claude integration
│   └── requirements.txt       # ag-ui-core, ag-ui-encoder, anthropic, fastapi, uvicorn
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Main page: chat + state panel + generative UI area
│   │   ├── globals.css
│   │   └── api/
│   │       └── copilotkit/
│   │           └── route.ts   # CopilotRuntime proxy to Python backend
│   └── components/
│       ├── AgentTools.tsx      # Frontend tool registrations (weather, chart, etc.)
│       ├── StatePanel.tsx      # Shared state display
│       └── GenerativeUI.tsx    # Custom component renderer for generative UI
└── readme.md
```

## Implementation Steps

### Step 1: Backend — Python FastAPI server

**File: `backend/requirements.txt`**
- `ag-ui-core`, `ag-ui-encoder`, `anthropic`, `fastapi`, `uvicorn`

**File: `backend/server.py`**
- FastAPI app with CORS middleware (allow `localhost:3000`)
- Single `POST /` endpoint accepting `RunAgentInput`
- Async generator that:
  1. Emits `RunStartedEvent`
  2. Emits `StateSnapshotEvent` (baseline shared state)
  3. Emits `StepStartedEvent` + `ActivitySnapshotEvent` ("Thinking...")
  4. Calls `anthropic.AsyncAnthropic().messages.stream()` with conversation history + frontend-defined tools
  5. Maps Claude stream events to AG-UI events:
     - `content_block_start(text)` → `TextMessageStartEvent`
     - `content_block_delta(text_delta)` → `TextMessageContentEvent`
     - `content_block_stop(text)` → `TextMessageEndEvent`
     - `content_block_start(tool_use)` → `ToolCallStartEvent`
     - `content_block_delta(input_json_delta)` → `ToolCallArgsEvent`
     - `content_block_stop(tool_use)` → `ToolCallEndEvent`
  6. Emits `StateDeltaEvent` (update response metadata)
  7. Emits `StepFinishedEvent` + `RunFinishedEvent`
  8. On error: `RunErrorEvent`
- Helper functions: `convert_agui_messages()`, `convert_agui_tools()`, `extract_system_prompt()`

### Step 2: Frontend — Next.js + CopilotKit

**File: `frontend/app/api/copilotkit/route.ts`**
- Creates `CopilotRuntime` with a remote `HttpAgent` pointing at `http://localhost:8000`
- Uses `copilotRuntimeNextJSAppRouterEndpoint`

**File: `frontend/app/page.tsx`**
- Wraps everything in `<CopilotKit runtimeUrl="/api/copilotkit" agent="claude_agent">`
- Layout: left panel (shared state + generative UI area) + right panel (`<CopilotChat>`)
- Includes `<AgentTools />`, `<StatePanel />`, `<GenerativeUI />`

**File: `frontend/components/AgentTools.tsx`**
- Registers 3 demo frontend tools via `useCopilotAction`:
  1. `get_weather` — mock weather lookup, renders a weather card
  2. `create_chart` — renders a simple bar chart from data
  3. `show_image` — renders an image card
- Each tool has a `render` prop showing loading → complete states

**File: `frontend/components/StatePanel.tsx`**
- Uses `useCoAgent` to display/edit shared state (message count, last query, agent status)
- Shows real-time state updates as the agent streams

**File: `frontend/components/GenerativeUI.tsx`**
- Renders custom UI components based on agent output
- Maps component names to React components (cards, alerts, data displays)

### Step 3: Wiring & Testing

1. Start backend: `cd backend && uvicorn server:app --reload --port 8000`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:3000`
4. Test each pattern:
   - **Streaming chat**: Ask any question, see token-by-token streaming
   - **Tool calls**: Ask "What's the weather in Tokyo?" → weather card renders
   - **Shared state**: Watch state panel update as conversation progresses
   - **Activity indicators**: See "Thinking..." while Claude processes
   - **Generative UI**: Ask "Show me a chart of monthly sales" → chart renders

## Verification

- Backend starts without errors on port 8000
- Frontend starts without errors on port 3000
- Chat messages stream token-by-token
- Tool calls render custom UI cards inline in chat
- State panel reflects real-time shared state changes
- Activity indicator shows during agent processing
- Error states are handled gracefully (e.g., missing API key)
