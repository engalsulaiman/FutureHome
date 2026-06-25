# Post-Processing Pipeline Reference

> Load on-demand when the user needs image manipulation after generation.

## Prerequisites

```bash
which magick    # ImageMagick 7 (preferred)
which ffmpeg    # video/animation
```

## Common Operations

```bash
# Instagram post (1080x1080)
magick input.png -resize 1080x1080^ -gravity center -extent 1080x1080 instagram.png

# Remove solid background (transparency)
magick input.png -fuzz 10% -transparent white output.png

# PNG to WebP
magick input.png -quality 85 output.webp
```

## Green Screen Transparency Pipeline

Gemini cannot generate transparent backgrounds natively. Workaround:

1. Append to prompt: `on a solid bright green (#00FF00) chroma key background with a thin white outline separating the subject from the background`
2. Remove green screen: `magick input.png -fuzz 20% -transparent "#00FF00" output.png`
3. Clean edges: `magick output.png -channel A -blur 0x1 -level 50%,100% -trim +repage final.png`

## Source

Adapted from https://github.com/AgriciDaniel/banana-claude
