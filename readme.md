# AG-UI POC — Dynamic LLM-Driven UI

A proof-of-concept that uses the [AG-UI protocol](https://github.com/ag-ui-protocol/ag-ui) to let an LLM (Claude) drive a live React UI in real time. The backend streams structured events over SSE; the frontend renders them as chat messages, tool-call cards, and a live shared-state panel — all without any page refreshes.

---

## What is AG-UI?

AG-UI is an open protocol that standardises how AI agents communicate with front-end applications. Instead of returning a plain text response, the agent emits a stream of typed events (`TextMessageStart`, `ToolCallStart`, `StateSnapshot`, etc.). The frontend knows exactly what each event means and can render rich UI for each one.

Think of it as "SSE with a schema" — a common language between your AI backend and your React components.

---

## Architecture

```
┌─────────────────────────────┐     AG-UI events (SSE)     ┌──────────────────────────┐
│  Python Backend (port 8000) │ ◄─────────────────────────► │  Next.js Frontend        │
│  FastAPI + ag-ui-protocol   │                             │  CopilotKit + React      │
│  + Anthropic SDK            │                             │  (port 3000)             │
└─────────────────────────────┘                             └──────────────────────────┘
         │                                                            │
         ▼                                                            ▼
   Anthropic Claude API                                    Browser renders:
   (streaming messages)                                    - Token-by-token chat
                                                           - Tool call UI cards
                                                           - Live shared state panel
                                                           - Activity indicators
```

**Request flow:**

1. User types a message in the chat UI.
2. CopilotKit sends the conversation to the Next.js API route `/api/copilotkit`.
3. That route proxies it to the Python backend at `http://localhost:8000`.
4. The backend calls Claude via the Anthropic SDK and maps each Claude stream event to an AG-UI event.
5. Events are streamed back through the chain and CopilotKit renders them live.

---

## Project Structure

```
agui/
├── backend/
│   ├── server.py          # FastAPI app — AG-UI event streaming + Claude integration
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Root HTML layout
│   │   ├── page.tsx                 # Main page: left info panel + right chat panel
│   │   ├── globals.css              # Global styles
│   │   └── api/copilotkit/route.ts  # Next.js API route — proxies to Python backend
│   ├── components/
│   │   ├── AgentTools.tsx   # Frontend tool registrations (weather, chart, image)
│   │   └── StatePanel.tsx   # Live shared-state display
│   ├── package.json
│   └── next.config.js
├── scripts/
│   ├── start.sh   # Start both services
│   └── stop.sh    # Stop both services
└── readme.md
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.9+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | comes with Node |
| Anthropic API key | — | [Get one here](https://console.anthropic.com/) |

---

## Quick Start

### 1. Set your API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

> Tip: add this line to your `~/.zshrc` or `~/.bashrc` so you don't have to re-enter it every session.

### 2. Start both services

```bash
./scripts/start.sh
```

This script will:
- Create a Python virtualenv in `backend/.venv` (first run only)
- Install Python and Node dependencies (first run only)
- Launch the FastAPI backend on port 8000
- Launch the Next.js dev server on port 3000

### 3. Open the app

```
http://localhost:3000
```

### 4. Stop both services

```bash
./scripts/stop.sh
```

---

## Running Services Manually

If you prefer to run each service yourself (e.g. to see logs directly in the terminal):

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

**Frontend** (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```

---

## What You Can Demo

Open the chat on the right side and try these prompts:

| What to ask | What happens |
|-------------|-------------|
| "What is the capital of Japan?" | Streams a text response token-by-token |
| "What's the weather in Tokyo?" | Renders an inline weather card via the `get_weather` tool |
| "Show me a chart of quarterly revenue" | Renders an inline bar chart via the `create_chart` tool |
| "Show me an image of a sunset" | Renders an inline image card via the `show_image` tool |
| Any follow-up message | Watch the **Shared State** panel update in real time (message count, last query, status) |

---

## Key Concepts for New Developers

### AG-UI Events

The backend emits a sequence of typed events per request. Here is what a typical turn looks like:

```
RunStartedEvent        ← marks the start of a new agent run
StateSnapshotEvent     ← pushes the current shared state to the frontend
StepStartedEvent       ← logical step inside the run (e.g. "claude_inference")
  TextMessageStartEvent    ← Claude is about to stream a text response
  TextMessageContentEvent  ← each streamed token
  TextMessageEndEvent      ← text stream complete
  ToolCallStartEvent       ← Claude decided to call a tool
  ToolCallArgsEvent        ← streaming the JSON arguments for the tool
  ToolCallEndEvent         ← tool call arguments complete
StateDeltaEvent        ← patches the shared state (JSON Patch operations)
StepFinishedEvent
RunFinishedEvent       ← marks the end of the run
```

If something goes wrong at any point, a `RunErrorEvent` is emitted instead.

### Frontend Tools (CopilotKit)

Tools are registered in the frontend (`AgentTools.tsx`) using the `useCopilotAction` hook. When Claude decides to call a tool, CopilotKit:

1. Calls the `handler` function with the parsed arguments.
2. Renders the `render` component inline in the chat, showing a loading state while the handler runs, then the result card.

The backend does **not** execute tools — it only emits `ToolCall*` events. The frontend is responsible for the actual tool logic and rendering.

### Shared State

The backend can push arbitrary state to the frontend using `StateSnapshotEvent` (full replace) and `StateDeltaEvent` (JSON Patch). The `StatePanel` component subscribes to this state via `useCoAgent` and renders it live.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | _(required)_ | Your Anthropic API key |
| `AGENT_URL` | `http://localhost:8000` | Backend URL used by the Next.js API route |

Set `AGENT_URL` as an environment variable or in a `frontend/.env.local` file if you run the backend on a different host or port.

---

## Log Files

When using the start script, logs are written to:

```
scripts/backend.log    # uvicorn / FastAPI output
scripts/frontend.log   # Next.js dev server output
```

Tail both at once:
```bash
tail -f scripts/backend.log scripts/frontend.log
```
