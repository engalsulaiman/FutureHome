# Banana Claude – AI Image Generation Creative Director

## Overview

Banana Claude is a Claude Code skill built on Google's Gemini image models for AI image generation and creative direction. It operates as a **Creative Director** that orchestrates image creation rather than passing raw user requests directly to the API.

## Key Commands

The skill responds to triggers including `/banana generate`, `/banana edit`, `/banana chat`, `/banana inspire`, and `/banana batch`:

- **Generate** – Creates images with full prompt engineering optimization
- **Edit** – Intelligently modifies existing images with enhanced instructions
- **Chat** – Multi-turn sessions with consistent style and character
- **Inspire** – Prompt database browsing for ideation
- **Batch** – Generates multiple variations with systematic component rotation

## Core Workflow: The 5-Component Formula

Before any generation, the agent must:

1. Read reference documents (`gemini-models.md` and `prompt-engineering.md`)
2. Analyze intent through clarifying questions about use case and style
3. Check for presets matching brands or styles
4. Select domain mode (Cinema, Product, Portrait, Editorial, UI/Web, Logo, Landscape, Abstract, Infographic)
5. Construct prompts using: Subject → Action → Location/Context → Composition → Style

Use specific, visceral descriptions with real camera models, brand names, and micro-details rather than abstract concepts.

## Critical Rules

- Never use banned keywords: "8K," "masterpiece," "ultra-realistic"
- Use aspect ratio selection appropriate to platform (1:1 for social, 16:9 for blogs, 9:16 for mobile)
- Apply safety rephrase strategies if content is blocked, offering alternatives
- Log all generations for cost tracking
- Response format: image path, crafted prompt, settings used, refinement suggestions

## Error Handling

- Rate limiting (429): exponential backoff
- IMAGE_SAFETY blocks: rephrase and retry once
- MCP unavailable: see references/mcp-tools.md for direct API parameters

## Source

Adapted from https://github.com/AgriciDaniel/banana-claude
