# A2UI Demo — Agent-Driven UI Showcase

A demo that showcases the **A2UI (Agent-to-User Interface)** concept: instead of chatting, the AI agent **builds entire interactive UIs** from natural language descriptions. You describe what you want, and the agent streams a complete React interface into existence — forms, dashboards, cards, menus — rendered in real-time.

---

## How It Works

The user types a description like "Build a contact form" and the agent responds with **A2UI JSONL** — a stream of declarative JSON messages that the frontend renders as native React components. No chat bubbles. No markdown. Real, interactive UI.

```
User Input → Python Backend (Claude + A2UI system prompt)
           → Streams A2UI JSONL via SSE
           → React Frontend A2UI Renderer
           → Native React components rendered from declarative JSON
           → User interactions sent back as actions
```

---

## Architecture

```
┌─────────────────────────────┐     A2UI JSONL (SSE)          ┌──────────────────────────┐
│  Python Backend (port 8000) │ ──────────────────────────►   │  Next.js Frontend        │
│  FastAPI + Anthropic SDK    │                               │  A2UI Renderer + React   │
│  POST /a2ui                 │ ◄──────────────────────────   │  (port 3000)             │
└─────────────────────────────┘     Actions (POST)            └──────────────────────────┘
         │                                                            │
         ▼                                                            ▼
   Anthropic Claude API                                    Browser renders:
   (streaming text → JSONL)                                - Interactive forms
                                                           - Dashboards & cards
                                                           - Menus & layouts
                                                           - Real-time streaming
```

**Request flow:**

1. User types a UI description in the prompt bar (or clicks an example chip).
2. Frontend POSTs to `http://localhost:8000/a2ui` with the message.
3. Backend calls Claude with an A2UI system prompt that teaches it the component catalog.
4. Claude generates A2UI JSONL — one JSON object per line.
5. Backend streams each line as an SSE `data:` event.
6. Frontend parses each message and builds the React component tree in real-time.
7. User interactions (button clicks) are sent back as actions for Claude to respond to.

---

## Project Structure

```
agui/
├── backend/
│   ├── server.py          # FastAPI app — /a2ui endpoint, A2UI system prompt, SSE streaming
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── layout.tsx     # Root HTML layout
│   │   ├── page.tsx       # Main page: prompt bar, surface area, JSONL inspector
│   │   └── globals.css    # Global styles (dark theme)
│   ├── lib/a2ui/
│   │   ├── types.ts       # A2UI protocol TypeScript types
│   │   ├── store.ts       # Component buffer, data model, state management
│   │   └── renderer.tsx   # React renderer — walks component tree, dispatches to widgets
│   ├── components/a2ui/
│   │   └── components.tsx # All 14 A2UI component implementations
│   ├── package.json
│   └── next.config.js
├── scripts/
│   ├── start.sh           # Start both services
│   └── stop.sh            # Stop both services
└── readme.md
```

---

## A2UI Protocol

The agent communicates with the frontend using three message types:

| Message | Purpose |
|---------|---------|
| `beginRendering` | Declares a new surface with a root component ID |
| `surfaceUpdate` | Adds or updates components on the surface |
| `dataModelUpdate` | Sets bound data values (form state, etc.) |

### Component Catalog

| Category | Components |
|----------|-----------|
| **Layout** | `Card`, `Row`, `Column`, `Tabs`, `Divider`, `List` |
| **Content** | `Text`, `Image`, `Icon` |
| **Inputs** | `TextField`, `Button`, `CheckBox`, `Slider`, `MultipleChoice` |

Components reference each other by ID via `children` arrays, forming a tree rooted at the `rootComponentId`. Input components bind to the data model via `boundPath` (e.g., `"/contact/name"`).

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.9+ | `python3 --version` |
| uv | latest | `uv --version` — [install](https://docs.astral.sh/uv/) |
| Node.js | 18+ | `node --version` |
| npm | 9+ | comes with Node |
| Anthropic API key | — | [Get one here](https://console.anthropic.com/) |

---

## Quick Start

### 1. Set your API key

Create a `~/.env` file with your Anthropic API key:

```bash
echo 'export ANTHROPIC_API_KEY=sk-ant-...' > ~/.env
```

The start script automatically sources `~/.env` if `ANTHROPIC_API_KEY` is not already in your environment.

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

**Backend:**
```bash
cd backend
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/uvicorn server:app --reload --port 8000
```

**Frontend** (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```

---

## Demo Scenarios

The app includes pre-built example chips. Click any of them or type your own:

| Prompt | What gets built |
|--------|----------------|
| "Build a contact form with name, email, phone, and preferred contact method" | Multi-field form with text inputs, radio buttons, and a submit button |
| "Create a restaurant menu with appetizers, mains, and desserts" | Tabbed or sectioned menu with cards, prices, and descriptions |
| "Show me a project dashboard with task status, team members, and deadlines" | Dashboard layout with cards, lists, and status indicators |
| "Make a flight booking form with departure, arrival, dates, and passenger count" | Form with date pickers, text fields, sliders, and booking button |
| "Design a user profile card with avatar, bio, and social links" | Profile card with image, text sections, and link buttons |

### Interacting with generated UIs

- **Form fields** are fully interactive — type in text fields, toggle checkboxes, move sliders
- **Buttons with actions** send the current form data back to Claude, which responds with an updated UI (e.g., a success confirmation)
- The **JSONL Stream Inspector** (bottom panel) shows every protocol message in real-time

---

## The App Layout

The page has three areas:

1. **Prompt Bar** (top) — Text input + example chips
2. **Rendered Surface** (center) — Where the A2UI-generated UI appears, streamed in real-time
3. **JSONL Stream Inspector** (collapsible bottom) — Raw protocol messages for educational purposes

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | _(required)_ | Your Anthropic API key (auto-loaded from `~/.env` if present) |

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

---

## What to Try Next

Ideas to deepen your understanding of the protocol and agent-driven UIs, roughly ordered by complexity:

### 1. Add a New Component Type

Add a `ProgressBar` or `Badge` component to the catalog. This touches every layer:
- Add the component spec to `A2UI_SYSTEM_PROMPT` in `backend/server.py`
- Add the TypeScript type in `frontend/lib/a2ui/types.ts`
- Implement the React component in `frontend/components/a2ui/components.tsx`
- Register it in the renderer switch in `frontend/lib/a2ui/renderer.tsx`

Then prompt: "Show a file upload progress dashboard" and see if Claude uses it.

### 2. Persist Conversation Context

Right now each prompt is a one-shot — Claude has no memory of previous UIs it built. Add message history so you can say "now add a phone number field to that form" and it updates the existing UI rather than rebuilding from scratch.

### 3. Swap the Model

Replace `claude-sonnet-4-20250514` with a different model (GPT-4o via OpenAI, Gemini, or a local model via Ollama). The frontend shouldn't change at all — if it does, that's a protocol violation. This is the core value prop: backend and frontend are decoupled.

### 4. Add Validation and Error States

When a user clicks "Submit" on a form, have Claude check the bound data and return either a success view or an error view highlighting which fields are invalid. This exercises the action round-trip: frontend → backend → Claude → updated UI.

### 5. Build a Second Frontend

Create a minimal CLI or terminal frontend that reads the same A2UI JSONL stream and renders it as ASCII text (tables, bordered boxes, etc.). This proves the protocol is truly frontend-agnostic — same backend, completely different renderer.

### 6. Add Agent-to-Agent (A2A) Communication

Add a second agent (e.g., a "data lookup" agent) that the main UI agent can delegate to. The main agent asks the lookup agent for real data (weather, stock prices, etc.) via a standardized A2A message format, then renders the result as A2UI. This demonstrates both protocols working together.

### 7. Stream Component-Level Loading States

Right now the full UI appears as components stream in. Add skeleton/placeholder states: when a `surfaceUpdate` references a component ID that hasn't arrived yet, render a shimmer placeholder. When the component data arrives, animate the transition. This makes the streaming feel more polished.

### 8. Add a "View Source" Mode

Add a toggle that shows the raw A2UI JSON side-by-side with the rendered component. Click any rendered component and see the exact JSON that produced it. Great for understanding the mapping between protocol and pixels.
