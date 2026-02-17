import json
import uuid
import time
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from ag_ui.core import (
    RunAgentInput,
    EventType,
    RunStartedEvent,
    RunFinishedEvent,
    RunErrorEvent,
    StepStartedEvent,
    StepFinishedEvent,
    TextMessageStartEvent,
    TextMessageContentEvent,
    TextMessageEndEvent,
    ToolCallStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    StateSnapshotEvent,
    StateDeltaEvent,
    CustomEvent,
)
from ag_ui.encoder import EventEncoder
from anthropic import AsyncAnthropic

app = FastAPI(title="AG-UI Claude Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncAnthropic()

SYSTEM_PROMPT = """You are a helpful assistant powering a dynamic UI demo.

You have access to frontend tools that render UI components. Use them when appropriate:
- get_weather: Show weather for a city
- create_chart: Display a bar chart with data
- show_image: Display an image card

When the user asks about weather, charts, images, or visual content, use the appropriate tool.
Be concise and helpful."""


def convert_messages(messages):
    """Convert AG-UI messages to Anthropic format."""
    result = []
    for msg in messages:
        role = getattr(msg, "role", None)
        if role in ("system", "developer"):
            continue

        content = getattr(msg, "content", None)

        if role == "tool":
            tool_call_id = getattr(msg, "tool_call_id", None)
            if tool_call_id:
                result.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": tool_call_id,
                        "content": content or "",
                    }],
                })
        elif role == "assistant":
            blocks = []
            if content:
                if isinstance(content, str):
                    blocks.append({"type": "text", "text": content})
                elif isinstance(content, list):
                    for item in content:
                        if hasattr(item, "text"):
                            blocks.append({"type": "text", "text": item.text})

            tool_calls = getattr(msg, "tool_calls", None)
            if tool_calls:
                for tc in tool_calls:
                    func = getattr(tc, "function", tc)
                    blocks.append({
                        "type": "tool_use",
                        "id": tc.id,
                        "name": func.name,
                        "input": json.loads(func.arguments) if isinstance(func.arguments, str) else func.arguments,
                    })
            result.append({"role": "assistant", "content": blocks or content or ""})
        else:
            # user message
            if isinstance(content, str):
                result.append({"role": "user", "content": content})
            elif isinstance(content, list):
                text_parts = []
                for item in content:
                    if hasattr(item, "text"):
                        text_parts.append(item.text)
                    elif isinstance(item, str):
                        text_parts.append(item)
                result.append({"role": "user", "content": " ".join(text_parts) if text_parts else ""})
            elif content:
                result.append({"role": "user", "content": str(content)})

    return result


def convert_tools(tools):
    """Convert AG-UI tool definitions to Anthropic format."""
    if not tools:
        return []
    result = []
    for tool in tools:
        schema = tool.parameters if hasattr(tool, "parameters") else {}
        if isinstance(schema, str):
            schema = json.loads(schema)
        result.append({
            "name": tool.name,
            "description": getattr(tool, "description", "") or "",
            "input_schema": schema,
        })
    return result


@app.post("/")
async def run_agent(input_data: RunAgentInput, request: Request):
    accept_header = request.headers.get("accept", "")
    encoder = EventEncoder(accept=accept_header)

    # Debug logging
    print(f"\n=== NEW REQUEST ===")
    print(f"Thread ID: {input_data.thread_id}")
    print(f"Run ID: {input_data.run_id}")
    print(f"Number of messages: {len(input_data.messages)}")
    print(f"Number of tools: {len(input_data.tools) if input_data.tools else 0}")
    if input_data.messages:
        for i, msg in enumerate(input_data.messages[-3:]):  # Show last 3 messages
            role = getattr(msg, "role", "unknown")
            content = getattr(msg, "content", "")
            content_preview = str(content)[:100] if content else ""
            print(f"  Message {i}: role={role}, content={content_preview}")

    async def event_generator() -> AsyncGenerator[bytes, None]:
        try:
            # 1. Run started
            yield encoder.encode(RunStartedEvent(
                type=EventType.RUN_STARTED,
                thread_id=input_data.thread_id,
                run_id=input_data.run_id,
            ))

            # 2. State snapshot
            yield encoder.encode(StateSnapshotEvent(
                type=EventType.STATE_SNAPSHOT,
                snapshot={
                    "messageCount": len(input_data.messages),
                    "lastQuery": "",
                    "agentStatus": "processing",
                },
            ))

            # 3. Step started
            yield encoder.encode(StepStartedEvent(
                type=EventType.STEP_STARTED,
                step_name="claude_inference",
            ))

            # Prepare Claude API call
            anthropic_messages = convert_messages(input_data.messages)
            anthropic_tools = convert_tools(input_data.tools)

            print(f"Converted messages: {len(anthropic_messages)}")
            print(f"Converted tools: {[t['name'] for t in anthropic_tools] if anthropic_tools else []}")

            if not anthropic_messages:
                anthropic_messages = [{"role": "user", "content": "Hello"}]

            create_kwargs = {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 4096,
                "system": SYSTEM_PROMPT,
                "messages": anthropic_messages,
            }
            if anthropic_tools:
                create_kwargs["tools"] = anthropic_tools

            # 4. Stream from Claude
            message_id = str(uuid.uuid4())
            text_started = False
            current_tool_id = None

            async with client.messages.stream(**create_kwargs) as stream:
                async for event in stream:
                    if event.type == "content_block_start":
                        block = event.content_block
                        if block.type == "text":
                            if not text_started:
                                yield encoder.encode(TextMessageStartEvent(
                                    type=EventType.TEXT_MESSAGE_START,
                                    message_id=message_id,
                                    role="assistant",
                                ))
                                text_started = True

                        elif block.type == "tool_use":
                            current_tool_id = block.id
                            yield encoder.encode(ToolCallStartEvent(
                                type=EventType.TOOL_CALL_START,
                                tool_call_id=block.id,
                                tool_call_name=block.name,
                                parent_message_id=message_id,
                            ))

                    elif event.type == "content_block_delta":
                        delta = event.delta
                        if delta.type == "text_delta":
                            yield encoder.encode(TextMessageContentEvent(
                                type=EventType.TEXT_MESSAGE_CONTENT,
                                message_id=message_id,
                                delta=delta.text,
                            ))

                        elif delta.type == "input_json_delta":
                            if current_tool_id:
                                yield encoder.encode(ToolCallArgsEvent(
                                    type=EventType.TOOL_CALL_ARGS,
                                    tool_call_id=current_tool_id,
                                    delta=delta.partial_json,
                                ))

                    elif event.type == "content_block_stop":
                        if current_tool_id is not None:
                            yield encoder.encode(ToolCallEndEvent(
                                type=EventType.TOOL_CALL_END,
                                tool_call_id=current_tool_id,
                            ))
                            current_tool_id = None

            # Close text message if opened
            if text_started:
                yield encoder.encode(TextMessageEndEvent(
                    type=EventType.TEXT_MESSAGE_END,
                    message_id=message_id,
                ))

            # 5. State delta
            last_query = ""
            for msg in reversed(input_data.messages):
                content = getattr(msg, "content", None)
                if getattr(msg, "role", None) == "user" and content:
                    last_query = content if isinstance(content, str) else str(content)
                    break

            yield encoder.encode(StateDeltaEvent(
                type=EventType.STATE_DELTA,
                delta=[
                    {"op": "replace", "path": "/messageCount", "value": len(input_data.messages) + 1},
                    {"op": "replace", "path": "/lastQuery", "value": last_query},
                    {"op": "replace", "path": "/agentStatus", "value": "idle"},
                ],
            ))

            # 6. Step finished + Run finished
            yield encoder.encode(StepFinishedEvent(
                type=EventType.STEP_FINISHED,
                step_name="claude_inference",
            ))

            yield encoder.encode(RunFinishedEvent(
                type=EventType.RUN_FINISHED,
                thread_id=input_data.thread_id,
                run_id=input_data.run_id,
            ))

        except Exception as e:
            yield encoder.encode(RunErrorEvent(
                type=EventType.RUN_ERROR,
                message=str(e),
            ))

    return StreamingResponse(
        event_generator(),
        media_type=encoder.get_content_type(),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
