# CLAUDE.md

Context and working notes for AI agents (and humans) continuing this project.
This is an **open-source** repo — keep everything here professional and free of
private detail.

## What this is

`Ripple` is a web recreation of **Minsang's (@radiofun8)** "Ripple with Noise"
Metal shader: a distortion transition that expands from a tap point and dissolves
one photo into another (glowing, noise-warped wavefront with chromatic split).

It is **inspired by and recreated from** his work — not a literal port. The
original is Metal/MSL; this is GLSL/WebGL with meaningful changes (see
"Deviations from the original"). Credit him in any public-facing copy.

## Stack

- **React 19 + TypeScript + Vite** (standard scaffold).
- **Raw WebGL** — one fragment shader on a full-screen quad. No three.js / R3F /
  OGL.
- **GSAP** — animates a single `progress` uniform `0 → 1`; the shader does the
  rest on the GPU.

## Layout

| File | Role |
| --- | --- |
| `src/components/RippleTransition.tsx` | Everything: GLSL source (VERT/FRAG), WebGL setup, texture loading, GSAP trigger/scrub, `Params` type, `DEFAULT_PARAMS`, `EASE_OPTIONS`. |
| `src/components/Controls.tsx` / `.css` | Collapsible, shadcn-style control panel (top-left) + Dev/Scrub section. Holds the `open` collapse state, the "Controls" pill, and the close (✕) button. |
| `src/App.tsx` | Wires the component to the controls; holds `params` + `scrubValue` state. |
| `public/image-a.png`, `image-b.png` | Demo images (Pinterest placeholders — not owned; see README). |

## How the effect works (fragment shader)

1. **Wavefront** — `waveFront = progress × coverage`, where
   `coverage = 1.0 + 0.5*noiseWarp + 0.1` is auto-derived so the front always
   reaches the farthest corner (normalized distance maxes at 1.0) plus the noise
   margin by `progress` 1 — the sweep completes on any canvas/aspect. Distance
   from `u_center` (the normalized tap point) is compared to it. A Gaussian
   envelope around the front × a `cos(delta × waveFreq)` term defines the bright
   ripple band. (There is no Wave Speed uniform — see "Wave Speed → Transition
   Speed" below.)
2. **Noise warp** — two cartesian FBM layers (`p*4` and `p*12`, value-noise +
   Hermite smoothing) perturb the distance field into cloud lobes. Amplitude is
   scaled by `warpScale = smoothstep(0.0, 0.05, progress)` so it starts as a
   small clean seed, then the `noiseWarp` slider has full authority.
3. **Displacement** — band pixels pushed radially out (`pushAmt`, melt look).
4. **Chromatic aberration** — R/G/B sampled at offset UVs (`caStrength`).
5. **Color-dodge glow** — band blown toward white (`glow`).
6. **Two-image reveal** — behind the front, `base` mixes into `target`.
   `u_swap` (0/1) flips which texture is base vs target.
7. **Tail gate** — envelope fades out by `progress` 1 so nothing lingers.

## Interaction model

- **Press the canvas → ripple + pinch fire from the press point.** The whole
  effect is bound to `pointerdown` (mouse/touch/pen), not click — there is no
  release/click path. `pointerdown` is guarded to the primary button, and pairs
  with the image wrapper's `touch-action: none` so a press can't be a scroll.
- **Pinch poke:** a snappy push-in dimple fires together with the wave when the
  `pinch` toggle is on. Its depth is scaled by `pinchStrength` — the pinch tween
  peaks at `pinchStrength` (no separate uniform; `u_pinch` already multiplies the
  displacement). On by default at strength 0.3.
- **Ping-pong:** on tween complete, `state.swap` toggles and `progress` resets to
  0 *in the same frame*. The new base equals the just-revealed image, so there's
  no flicker — successive presses alternate A→B, B→A, …
- **Press guard:** `animating` flag ignores presses until the current transition
  finishes (no mid-animation restarts/double-swaps). `scrub()` clears it.
- **Progress scrub slider** (bottom of the panel, above Replay) sets `progress`
  directly (kills any tween) for frame-by-frame inspection. It scrubs the current
  direction. (The old "Dev / Scrub" label row was removed — it's just the
  Progress slider + Replay now.)

## Controls panel & responsiveness

- **Collapse pattern** (matches the sibling `shimmering-dots` repo, but anchored
  **top-left** instead of bottom-right): the panel and a "Controls" pill share
  one fixed `.rc-root` anchor and cross-fade via scale + opacity, toggled by the
  `open` state. The ✕ in the header collapses; the pill re-opens. Header buttons
  (Reset + ✕) are matched to 26px; the bottom **Replay** uses the outlined
  uppercase `.rc-secondary` style.
- **`.rc-root` is `pointer-events: none`** — it's only a positioning anchor and
  is sized to the (sometimes hidden) panel, so leaving it interactive made it
  swallow taps over the canvas even while collapsed. The pill and the open panel
  re-enable `pointer-events: auto` themselves.
- **Breakpoint width:** mobile (`≤640px`) caps the panel at the **same 280px** as
  desktop, not wider — otherwise the panel *grew* when crossing into mobile.
  Below ~312px it shrinks via `calc(100vw - 32px)`.
- **Image sizing** is computed once at mount from `window.innerWidth`: desktop
  uses 0.7w / 0.86h, mobile (`≤640px`) uses 0.9w / 0.8h. It adapts on load /
  rotation-then-reload, **not** live on desktop window drags (would require
  re-running the WebGL setup on resize).
- **Touch lock:** `html, body, #root` are `overflow: hidden` +
  `overscroll-behavior: none`, and the image wrapper is `touch-action: none`, so
  a touch-drag fires a tap (ripple) instead of scrolling/panning the canvas.

## Deviations from the original Metal shader

- **Removed the scatter/dissolve block.** In the original it flung pixels behind
  the wave to random UVs and faded to black. It caused a "shake," a hard edge,
  and a destructive image-scramble. Replaced with a clean two-image reveal.
- **Replaced the `atan2`-based polar FBM with a second cartesian FBM.** The
  `atan` branch cut produced a visible seam radiating from the center (invisible
  in his hardcoded-center version, visible once center follows the tap).
- **Tail gate** added so the wavefront dies out cleanly.
- **Center parameterized** as `u_center` from the press point.
- **Ping-pong `u_swap`**, warp ramp, and press guard are all additions.
- **Texture orientation:** `UNPACK_FLIP_Y_WEBGL` is **false** (the vertex shader
  already flips v so screen-top → uv.y 0). Two flips = upside down; keep one.

## Current defaults (`DEFAULT_PARAMS`)

`sigma (Wave Width) 0.15 · waveFreq (Ripple Density) 5 ·
pushAmt (Displacement) 0.145 · caStrength (RGB Split) 0.02 · glow 0.73 ·
noiseWarp 1.0 · duration 1.4 · ease power2.inOut · pinch true ·
pinchStrength (Pinch Intensity) 0.3`

These were dialed in by hand against reference frames. **When the user tunes new
values, bake them into `DEFAULT_PARAMS`** so reloads/edits don't lose them.

## Wave Speed → Transition Speed (control consolidation)

- **Wave Speed was removed.** Its old completion-gating job is now automatic: the
  shader uses `coverage` (above) as the front's endpoint, so the sweep always
  finishes. The old default Wave Speed (1.6) equals `coverage` at the default
  Noise Warp (1.0), so removing it left the animation **byte-identical** at
  defaults.
- **Why:** Wave Speed and Duration both read as "perceived speed"
  (`screen speed ≈ waveSpeed × 1/duration`). The only thing Wave Speed uniquely
  did post-completion-fix was an "overshoot/hold" (finishing early then lingering)
  — too subtle to keep as a slider. So they were merged into one knob.
- **"Transition Speed"** is the renamed `duration` param. The slider is
  **inverted** in `Controls.tsx` (`value = DUR_MIN + DUR_MAX - duration`) so
  right = faster, and the readout is a multiplier vs the 1.4s default
  (`DUR_DEFAULT / duration`, so default shows `1.00×`). The underlying param is
  still `duration` in seconds — GSAP reads it unchanged.

## Credit

Original effect by **Minsang (@radiofun8)** — https://x.com/radiofun8.
MIT © Mick Cesanek.
