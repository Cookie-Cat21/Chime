# Chime brand assets

Official lockup from the Claude branding pass (merged via `#14`).

- `chime-logo.svg` / `chime-logo.png` — full lowercase **chime** wordmark (square master export)
- `chime-mark.svg` / `chime-mark.png` — standalone **C** mark (favicon, app icon, avatar)
- `chime-logo-tight.svg` / `chime-mark-tight.svg` — same paths, tight `viewBox` for UI chrome

SVGs are the source of truth. Square PNGs are 6250×6250 masters.

**Web runtime copies** live under `web/public/brand/` and use the **tight** crop so nav/hero
wordmarks are not drowned in empty square padding. Prefer `/brand/chime-logo.svg` via
`ChimeWordmark` / `ChimeMark` in `web/src/components/brand/chime-brand.tsx`.

Ink color in the paths is `#1e1e1e` — keep dash/marketing paper light so the mark stays readable.
Do not swap in the Signal Ice all-caps SVG candidates under `docs/brand/svg/` for product chrome;
those remain research archives after the red treatment was rejected.
