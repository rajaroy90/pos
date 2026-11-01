# Design System

## Principles
- Glass materials over solid panels
- High contrast text on glass
- Calm motion (respects prefers-reduced-motion)
- Touch targets ≥ 44 px
- One accent colour driven by the active theme

## Tokens (css/base.css)
- `--tx` text
- `--mu` muted
- `--ac` accent
- `--ok` / `--er` success / error
- `--bd` border
- Glass surfaces use backdrop-filter + subtle borders

## Themes
Auto / Light / Dark / AMOLED plus selectable palettes and wallpapers.  
Controlled from Appearance Studio (module 05).

## Icons
Inline SVG paths defined in core. New sections should add a path to the `P` map and a colour to `SEC`.

## Liquid Glass v2

Loaded last (`css/liquid.css`, scoped to `html.lq`), so it wins the cascade without relying on `!important` in nearly every case.

**Material.** A glass surface is a translucent fill (`--lq-fill-1` to `--lq-fill-2`), a top-left rim light (`--lq-rim-hi`) with a dimmer bottom-right rim (`--lq-rim-lo`), and a soft sheen gradient. Blur is deliberately off on cards in the default "fast" glass mode (Appearance Studio); only the tab bar, sheets and cards that opt in carry blur. Do not add `backdrop-filter` to list rows.

**Colour.** One accent (`--ac`) drives buttons, links and chart lines. Row icons take their colour from the `--c` variable set by `ico()`. Progress uses a warm amber-to-white "beam" so the leading edge reads as light, independent of the accent. Dark mode uses a deeper blue for primary buttons so white text keeps its contrast.

**Rows.** A row is icon, title and subtitle on the first line. Actions live in an action bar underneath so names and amounts never wrap one word per line on a phone. Keep a screen to one title (the shell renders it; modules must not repeat it).

**Home.** One dashboard, in order: collection beam, needs attention, at a glance, cash flow, occupancy by property, recent activity. Do not append more wrappers to `V.home`; add to the dashboard builder in module 15.

**Overlays.** Sheets use `.sh.g` with a grab handle. Control Center uses a 92% scrim (`html.lq .ov.cc8`) because overlays carry no blur in fast mode. Counts on the launcher are badges on the icon (`.lq-cnt`).

**Motion.** Entrances are short and staggered once per screen. `prefers-reduced-motion` and lite mode (4 cores or fewer, or the Low-power glass toggle) disable the animated wallpaper and chart draw.

**Class names to avoid.** `.bl` is the wallpaper layer and `.cl` is the setup checklist. Do not reuse them for new components.

## Reference skin (css/reference.css + module 17)

Scoped to `html.lq.rf`; remove the `rf` class to fall back to Liquid Glass v2.
- **Icons:** `.ic` badges swap their line glyph for a glossy 3D tile from `assets/ico/NN.webp` (cut from the 50-icon sheet). Mapping lives in `TILE` in `js/modules/17-reference-skin.js`.
- **Switch:** green track, capsule glass thumb with white rim (both `label.sw` and `button.sw`).
- **Tab bar:** lens is a ghost pill plus a frosted front pill; pressing the bar magnifies it with colour fringing.
- **Create button:** frosted round glass with a thin plus.
- **Control tiles:** `.tg8` are pills with a white icon puck. **Progress:** `.lq-beam` has an amber-to-white leading glow. **KPI cards:** droplet finish.
- **Wallpaper:** jade swirl in light themes, dusk (purple to orange) in dark.
