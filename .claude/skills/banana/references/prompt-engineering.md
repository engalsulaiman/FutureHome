# Prompt Engineering Reference — Banana Claude

## Core Framework: The 5-Component Formula

1. **Subject** — Specific physical characteristics (age, material, expression)
2. **Action** — Present-tense verbs describing movement or state
3. **Location/Context** — Environmental details, time, atmosphere
4. **Composition** — Camera angle, framing, focal length
5. **Style** — Visual aesthetic, lighting, medium references

Write each component as descriptive prose, not keyword lists.

## Critical Restrictions

Banned terms that degrade output quality: "4K," "8K," "masterpiece," "hyperrealistic," "ultra detailed," "trending on artstation." Use prestigious anchors instead, e.g. "Vanity Fair editorial" or "National Geographic cover."

There is no negative-prompt API parameter. Rephrase exclusions positively — replace "no blur" with "sharp, in-focus detail."

## Domain-Specific Libraries

Specialized vocabulary exists for: Cinema, Product photography, Portrait, Fashion/Editorial, UI/Web design, Landscape, Abstract composition.

## Advanced Techniques

- **Character consistency**: use reference images and repeated identifiers across generations
- **Text rendering**: keep under 25 characters with high contrast
- **Search-grounded generation**: integrate live data for infographics

## Safety Navigation

When blocked by output filters, rephrase through abstraction, artistic framing, metaphor, or context shifting.

## Source

Adapted from https://github.com/AgriciDaniel/banana-claude
