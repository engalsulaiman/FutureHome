# MCP Tools Reference — @ycse/nanobanana-mcp

> Package: `@ycse/nanobanana-mcp`
> GitHub: https://github.com/YCSE/nanobanana-mcp

## Tools

### gemini_generate_image
`prompt` (string, required) → image data + file path, saved to `~/Documents/nanobanana_generated/`

### gemini_edit_image
`imagePath` (string, required), `prompt` (string, required) → modified image data + file path

### gemini_chat
`message` (string, required) → text response + optional image. Maintains session context across turns.

### set_aspect_ratio
`ratio` (string, required) — one of 1:1, 16:9, 9:16, 4:3, 3:4, 2:3, 3:2, 4:5, 5:4, 1:4, 4:1, 1:8, 8:1, 21:9

### set_model
`model` (string, required) — `gemini-3.1-flash-image-preview` (default) or `gemini-2.5-flash-image` (stable fallback)

### get_image_history
No params. Returns array of image entries with paths and prompts.

### clear_conversation
No params. Resets session context.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_AI_API_KEY` | Yes | API key from https://aistudio.google.com/apikey |
| `NANOBANANA_MODEL` | No | Override default model |

## Parameters That Do NOT Exist for Gemini Image Models

`numberOfImages` / `n` / `sampleCount`, `negativePrompt`, `output_mime_type`, `candidate_count`, `seed` — these are Imagen/Vertex artifacts and are silently ignored by the Gemini API.

## Error Response Taxonomy

| Error | Cause | Response |
|---|---|---|
| HTTP 429 | Rate limit | Exponential backoff |
| HTTP 400 FAILED_PRECONDITION | Billing not enabled | Enable billing in AI Studio |
| `finishReason: "IMAGE_SAFETY"` | Content policy block | Rephrase, retry once |
| Empty `parts` | Wrong `response_modalities` | Must include "IMAGE" |

## Source

Adapted from https://github.com/AgriciDaniel/banana-claude
