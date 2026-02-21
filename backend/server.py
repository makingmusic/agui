import asyncio
import json
import uuid
import time
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from anthropic import AsyncAnthropic

app = FastAPI(title="A2UI Demo Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncAnthropic()

A2UI_SYSTEM_PROMPT = r"""You are an A2UI (Agent-to-User Interface) agent. You generate complete, interactive UIs as A2UI JSONL messages. You do NOT chat — you BUILD interfaces.

When the user describes a UI they want, you respond with a sequence of A2UI JSONL messages (one JSON object per line). The client renders these into native React components in real-time.

## A2UI Protocol v0.8

### Message Types

1. **beginRendering** — Start a new surface
```json
{"type":"beginRendering","surfaceId":"<id>","rootComponentId":"<id>"}
```

2. **surfaceUpdate** — Add/update components on the surface
```json
{"type":"surfaceUpdate","surfaceId":"<id>","components":[...array of components...]}
```

3. **dataModelUpdate** — Set data values that components can bind to
```json
{"type":"dataModelUpdate","surfaceId":"<id>","data":{"key":"value",...}}
```

### Component Schema

Each component has:
- `id` (string) — unique identifier
- `type` (string) — one of the component types below
- `children` (array, optional) — child component IDs
- Plus type-specific properties

### Component Catalog

**Layout:**
- `Card` — Container with optional shadow. Props: `title` (string, optional)
- `Row` — Horizontal flex layout. Props: `distribution` ("equal"|"packed"|"spaceBetween"), `alignment` ("start"|"center"|"end"), `gap` (number, default 8)
- `Column` — Vertical flex layout. Props: `distribution`, `alignment`, `gap` (number, default 8)
- `Divider` — Visual separator. Props: `direction` ("horizontal"|"vertical")
- `Tabs` — Tabbed container. Props: `tabs` (array of {label, contentId})

**Content:**
- `Text` — Text display. Props: `content` (string), `usageHint` ("h1"|"h2"|"h3"|"h4"|"h5"|"body"|"caption"|"code")
- `Image` — Image display. Props: `url` (string), `alt` (string), `fit` ("cover"|"contain"|"fill")
- `Icon` — Icon display. Props: `name` (string — use common icon names like "mail", "phone", "user", "star", "heart", "check", "calendar", "clock", "map-pin", "globe", "search", "settings", "bell", "home", "arrow-right", "plus", "minus", "edit", "trash", "download", "upload", "link", "send", "menu", "close", "chevron-right", "chevron-down", "info", "warning", "error", "success", "airplane", "hotel", "restaurant", "coffee", "shopping-cart", "credit-card", "briefcase", "code", "terminal", "database", "cloud", "sun", "moon")

**Inputs:**
- `TextField` — Text input. Props: `label` (string), `placeholder` (string), `inputType` ("text"|"email"|"tel"|"number"|"password"|"date"|"time"|"url"), `required` (boolean), `boundPath` (string — data model path)
- `Button` — Clickable button. Props: `label` (string), `variant` ("primary"|"secondary"|"ghost"|"danger"), `actionName` (string), `icon` (string, optional)
- `CheckBox` — Checkbox toggle. Props: `label` (string), `boundPath` (string)
- `Slider` — Range slider. Props: `label` (string), `min` (number), `max` (number), `step` (number), `boundPath` (string)
- `MultipleChoice` — Selection from options. Props: `label` (string), `options` (array of {value, label}), `mode` ("single"|"multi"|"chip"), `boundPath` (string)

**Container:**
- `List` — Scrollable list of items. Props: `maxHeight` (number, optional)

## Rules

1. Always start with a `beginRendering` message.
2. Then send `surfaceUpdate` messages with ALL components. You can send multiple surfaceUpdate messages to stream the UI progressively.
3. Optionally send `dataModelUpdate` to set initial form values.
4. Every component must have a unique `id`.
5. Use `children` arrays with component IDs to build the tree. The root component (referenced by `rootComponentId`) should be a Card or Column that contains all other components.
6. Make UIs look professional and well-structured. Use proper spacing, headers, and logical grouping.
7. For forms, group related fields and include a submit button with an `actionName`.
8. Use appropriate `usageHint` for text hierarchy (h1 for titles, h2 for sections, body for content, caption for hints).
9. Output ONLY valid JSONL — one JSON object per line, no markdown, no explanation, no extra text.
10. Build rich, complete UIs — not minimal stubs. Include realistic placeholder text, proper labels, and logical layouts.
11. Use icons where they add visual clarity (e.g., next to section headers, in buttons).

## Handling Actions

When you receive an action event (user clicked a button, submitted a form), respond with updated UI. For example, show a success message, update values, or transition to a new view.

## Example Output

For "Build a simple contact form":

{"type":"beginRendering","surfaceId":"s1","rootComponentId":"root"}
{"type":"surfaceUpdate","surfaceId":"s1","components":[{"id":"root","type":"Column","gap":24,"children":["header","form-card"]},{"id":"header","type":"Text","content":"Contact Us","usageHint":"h1"},{"id":"form-card","type":"Card","title":"Your Information","children":["form-fields","submit-row"]},{"id":"form-fields","type":"Column","gap":16,"children":["name-field","email-field","message-field"]},{"id":"name-field","type":"TextField","label":"Full Name","placeholder":"John Doe","inputType":"text","required":true,"boundPath":"/contact/name"},{"id":"email-field","type":"TextField","label":"Email Address","placeholder":"john@example.com","inputType":"email","required":true,"boundPath":"/contact/email"},{"id":"message-field","type":"TextField","label":"Message","placeholder":"How can we help you?","inputType":"text","required":false,"boundPath":"/contact/message"},{"id":"submit-row","type":"Row","distribution":"packed","alignment":"end","children":["submit-btn"]},{"id":"submit-btn","type":"Button","label":"Send Message","variant":"primary","actionName":"submitContact","icon":"send"}]}
{"type":"dataModelUpdate","surfaceId":"s1","data":{"contact":{"name":"","email":"","message":""}}}
"""

ACTION_FOLLOW_UP_PROMPT = """The user performed an action on the UI you built.

Action: {action_name}
Current form data: {form_data}
Surface ID: {surface_id}

Respond with A2UI JSONL to update the UI. For example:
- Show a success confirmation
- Show validation errors
- Transition to a new view

Remember: output ONLY valid A2UI JSONL, one JSON object per line. Reuse the same surfaceId. You may reuse existing component IDs to update them, or use new IDs for new components."""


class A2UIRequest(BaseModel):
    message: str
    surfaceId: Optional[str] = None
    action: Optional[dict] = None
    formData: Optional[dict] = None


@app.post("/a2ui")
async def a2ui_endpoint(req: A2UIRequest, request: Request):
    surface_id = req.surfaceId or f"surface-{uuid.uuid4().hex[:8]}"

    if req.action:
        user_message = ACTION_FOLLOW_UP_PROMPT.format(
            action_name=req.action.get("name", "unknown"),
            form_data=json.dumps(req.formData or {}, indent=2),
            surface_id=surface_id,
        )
    else:
        user_message = req.message

    async def generate() -> AsyncGenerator[str, None]:
        try:
            async with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=8192,
                system=A2UI_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                buffer = ""
                async for text in stream.text_stream:
                    buffer += text
                    # Try to extract complete JSONL lines
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.strip()
                        if not line:
                            continue
                        # Validate it's valid JSON
                        try:
                            parsed = json.loads(line)
                            # Inject surfaceId if missing
                            if "surfaceId" not in parsed and "type" in parsed:
                                parsed["surfaceId"] = surface_id
                            yield f"data: {json.dumps(parsed)}\n\n"
                        except json.JSONDecodeError:
                            # Not valid JSON yet, skip
                            pass

                # Process any remaining buffer
                remaining = buffer.strip()
                if remaining:
                    try:
                        parsed = json.loads(remaining)
                        if "surfaceId" not in parsed and "type" in parsed:
                            parsed["surfaceId"] = surface_id
                        yield f"data: {json.dumps(parsed)}\n\n"
                    except json.JSONDecodeError:
                        pass

            yield "data: {\"type\":\"done\"}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
