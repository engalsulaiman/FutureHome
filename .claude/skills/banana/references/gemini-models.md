# Gemini Image Generation Models

## Available Models

### gemini-3.1-flash-image-preview — Nano Banana 2 (default)
- Fast, high-volume use. Aspect ratios: all 14, including extreme (1:4, 4:1, 1:8, 8:1)
- Max resolution: up to 4096×4096 (4K)
- Input tokens: 131,072. Output: ~1,290 tokens/image
- Features: Google Search grounding, thinking levels, image-only output

### gemini-2.5-flash-image — Nano Banana (original)
- Aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 2:3, 3:2, 4:5, 5:4, 21:9 (10 ratios)
- Max resolution: up to 1024×1024 (1K)
- Best for free-tier/budget workflows. ~$0.039/image at 1K

### Deprecated — do not use
- `gemini-3-pro-image-preview` (shut down by Google March 9, 2026 — replace with `gemini-3.1-flash-image-preview`)
- `gemini-2.0-flash-exp`

## API Configuration

Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model-id}:generateContent`

```json
{
  "contents": [{"parts": [{"text": "your prompt here"}]}],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9",
      "imageSize": "2K"
    }
  }
}
```

`imageSize` must be uppercase ("2K", not "2k") — lowercase is silently ignored. Default is `1K` if omitted.

## Resolution Tiers

| Value | Pixel Range | Availability |
|---|---|---|
| `512` | up to 512×512 | Nano Banana 2 only |
| `1K` | up to 1024×1024 | All models |
| `2K` | up to 2048×2048 | Nano Banana 2 only |
| `4K` | up to 4096×4096 | Nano Banana 2 only |

## Safety Filters

| `finishReason` | Meaning | Retryable? |
|---|---|---|
| `STOP` | Success | n/a |
| `IMAGE_SAFETY` | Output blocked | Rephrase |
| `PROHIBITED_CONTENT` | Policy violation | No |
| `SAFETY` | General safety block | Rephrase |
| `RECITATION` | Copyrighted content detected | Rephrase |

## Key Limitations

- No video generation (image only)
- No transparent backgrounds natively — use green-screen workaround (see post-processing.md)
- Gemini generates ONE image per API call — no batch parameter
- No negative-prompt parameter — use semantic reframing instead

## Source

Adapted from https://github.com/AgriciDaniel/banana-claude
