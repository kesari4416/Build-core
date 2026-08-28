"""AI helpers for the Design Concept module.

Two calls per generation:
  1. Gemini Nano Banana (gemini-3.1-flash-image-preview) — image edit with the
     user's uploaded reference photo to produce a restyled render.
  2. Claude Sonnet 4.6 — strict-JSON itemized cost estimate (retry once on
     malformed output).
"""
import base64
import json
import logging
import os
import re
import uuid

from emergentintegrations.llm.chat import (ImageContent, LlmChat, UserMessage)

logger = logging.getLogger(__name__)

IMAGE_MODEL = "gemini-3.1-flash-image-preview"
COST_MODEL = "claude-sonnet-4-6"

COST_CATEGORIES = ["Flooring", "Paint/Wall Finish", "Furniture",
                     "Lighting", "Fixtures", "Labour"]


def _restyle_prompt(space_type: str, style: str) -> str:
    return (
        f"Restyle this {space_type.lower()} in a {style} interior design style. "
        "STRICTLY preserve the room's architectural layout — walls, windows, doors, "
        "ceiling, and the position of large fixed elements. Do not change the "
        "camera angle. Update surfaces (walls, floor), furniture, decor, textiles, "
        "and lighting to match the requested style. Produce a photorealistic, "
        "professionally photographed interior design render suitable for a client "
        "presentation. Realistic lighting, no text or watermarks."
    )


async def generate_render(reference_bytes: bytes, space_type: str, style: str) -> bytes:
    """Return PNG bytes of a restyled render, preserving room structure.

    Raises RuntimeError on failure.
    """
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY missing")

    b64 = base64.b64encode(reference_bytes).decode("utf-8")
    chat = LlmChat(api_key=api_key, session_id=f"concept-{uuid.uuid4()}",
                    system_message="You are an expert interior design render assistant.")
    chat.with_model("gemini", IMAGE_MODEL).with_params(modalities=["image", "text"])

    msg = UserMessage(text=_restyle_prompt(space_type, style),
                        file_contents=[ImageContent(b64)])

    _, images = await chat.send_message_multimodal_response(msg)
    if not images:
        raise RuntimeError("Image model returned no images")
    # First image is the restyled render
    return base64.b64decode(images[0]["data"])


def _cost_system() -> str:
    return (
        "You are a senior construction cost estimator for India. You produce "
        "itemized renovation estimates in INR (Indian rupees). ALWAYS respond "
        "with a single JSON object matching the requested schema — no prose, no "
        "markdown fences, no explanation."
    )


def _cost_user_prompt(space_type: str, style: str, sqft: float, region: str) -> str:
    cats = ", ".join(COST_CATEGORIES)
    return (
        f"Generate a realistic renovation cost estimate for a {sqft} sq ft "
        f"{space_type} restyled in {style} style, in {region}. Return between 8 "
        f"and 14 line items spanning these categories: {cats}. Rates should be "
        "credible mid-market {region} prices in {reg} INR.\n\n"
        "Return this exact JSON shape and NOTHING else:\n"
        "{\n"
        '  "lines": [\n'
        '    {\n'
        '      "category": "one of Flooring | Paint/Wall Finish | Furniture | Lighting | Fixtures | Labour",\n'
        '      "description": "short human description",\n'
        '      "quantity": 12.5,\n'
        '      "unit": "sqft | pcs | day | job | m",\n'
        '      "rate": 250,\n'
        '      "subtotal": 3125\n'
        '    }\n'
        '  ]\n'
        "}\n\n"
        "Rules:\n"
        "- subtotal MUST equal round(quantity * rate).\n"
        "- All amounts are plain numbers (no ₹, no commas).\n"
        "- Include labour separately (skilled + helper as a single Labour line "
        "  or split as needed).\n"
        "- No trailing commentary."
    ).replace("{region}", region).replace("{reg}", region)


_JSON_BLOCK = re.compile(r"\{[\s\S]*\}")


def _parse_lines(raw: str) -> list[dict]:
    """Extract and validate the `lines` array. Raises ValueError on failure."""
    match = _JSON_BLOCK.search(raw or "")
    if not match:
        raise ValueError("No JSON object found in model output")
    obj = json.loads(match.group(0))
    lines = obj.get("lines")
    if not isinstance(lines, list) or not lines:
        raise ValueError("`lines` missing or empty")
    cleaned = []
    for li in lines:
        try:
            qty = float(li.get("quantity", 0))
            rate = float(li.get("rate", 0))
        except (TypeError, ValueError):
            continue
        subtotal = float(li.get("subtotal", 0)) or round(qty * rate, 2)
        cleaned.append({
            "category": str(li.get("category", "Furniture"))[:60],
            "description": str(li.get("description", ""))[:200],
            "quantity": round(qty, 2),
            "unit": str(li.get("unit", "unit"))[:20],
            "rate": round(rate, 2),
            "subtotal": round(subtotal, 2),
        })
    if not cleaned:
        raise ValueError("All lines failed validation")
    return cleaned


async def generate_cost_estimate(space_type: str, style: str, sqft: float,
                                    region: str = "India") -> list[dict]:
    """Return validated cost lines. One retry on malformed JSON."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY missing")

    prompt = _cost_user_prompt(space_type, style, sqft, region)

    for attempt in (1, 2):
        chat = LlmChat(api_key=api_key, session_id=f"cost-{uuid.uuid4()}",
                        system_message=_cost_system())
        chat.with_model("anthropic", COST_MODEL)
        resp = await chat.send_message(UserMessage(text=prompt))
        try:
            return _parse_lines(resp)
        except (ValueError, json.JSONDecodeError) as e:
            logger.warning("Cost JSON parse failed (attempt %d): %s", attempt, e)
            if attempt == 2:
                raise RuntimeError(f"Cost estimate malformed after retry: {e}")
    return []
