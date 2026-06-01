# Ripple

A wavy, rippling distortion transition that sweeps out from wherever you tap and
dissolves one photo into another — a glowing, noise-warped wavefront with
chromatic fringing, recreated for the web and tunable live from a floating
control panel until it looks exactly the way you want.

<img width="800" height="884" alt="Screen Recording 2026-05-30 at 1 45 27 AM (1)" src="https://github.com/user-attachments/assets/e77ae880-c8ca-4adc-93e6-273976289f0d" />

Inspired by [**Minsang** (@radiofun8)](https://x.com/radiofun8)'s "Ripple with
Noise" Metal shader. This is a fresh implementation in **GLSL / WebGL** with
**GSAP** driving the animation — significantly altered from the original, but
the idea is his. Full credit below.

## What it is

Click the image and a ripple expands from that point: a turbulent, cloud-like
glowing band races outward, displacing and color-splitting the pixels at its
edge, and behind it the photo dissolves into a second one. Click again and it
transitions back the other way — it never restarts or snaps, it just reverses.

All the heavy lifting runs on the GPU in a single fragment shader on a
full-screen quad. GSAP animates one `progress` uniform from 0 → 1; the shader
does the rest.

## The transition, technically

- **Wavefront** — the distance from the tap point is compared against an
  expanding radius (`progress × waveSpeed`). A Gaussian envelope around that
  radius defines the active band; a cosine term inside it adds the ripples.
- **Noise warp** — two layered cartesian FBM fields (value-noise, Hermite
  smoothing) perturb the distance field so the front breaks into organic cloud
  lobes instead of a clean ring. The warp amplitude ramps in over the first few
  percent of progress, so the effect starts as a small clean seed and only
  develops turbulence as it grows.
- **Displacement** — pixels on the band are pushed radially outward, giving the
  melted, burning-edge look.
- **Chromatic aberration** — the R, G and B channels are sampled at slightly
  different offsets along the wavefront, producing the rainbow split.
- **Color-dodge glow** — the band is blown toward white with a dodge blend,
  creating the hot, smoky edge.
- **Two-image ping-pong reveal** — behind the wavefront the base image is mixed
  into the target image. A `swap` flag flips base/target each time a transition
  completes, so successive clicks alternate A→B, B→A, … seamlessly.

The wavefront fully dies out by the end of each run, so no distortion lingers on
the settled image.

## Live controls

A collapsible, shadcn-style panel (top-left) tunes every uniform in real time,
plus a **Dev / Scrub** section to freeze and step through any frame of the
animation. Hit the **✕** to collapse it into a small "Controls" pill, and tap
the pill to bring it back. The whole layout is responsive — on mobile the panel
caps its width to the viewport and the image is centered and sized to fit.

| Control | What it does |
| --- | --- |
| **Wave Speed** | How fast the wavefront expands outward. |
| **Wave Width** | Thickness of the Gaussian band the glow and displacement ride on. |
| **Ripple Density** | Number of cosine ripples inside the band. |
| **Displacement** | How hard pixels are pushed at the wavefront. |
| **RGB Split** | Strength of the chromatic aberration. |
| **Glow** | Intensity of the white color-dodge burn. |
| **Noise Warp** | How turbulent / non-circular the front is. |
| **Duration** | Length of the transition. |
| **Easing** | GSAP easing curve for the `progress` tween. |
| **Scrub** | Manually scrub progress 0 → 1 to inspect any frame. |

## Try it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Click the image to fire the transition; tune it with the panel in the top-left.

Other scripts:

```bash
npm run build      # tsc -b && vite build
npm run preview    # serve the production build
npm run lint       # eslint .
```

Swap in your own photos by replacing `public/image-a.png` and
`public/image-b.png`.

> **Images:** the placeholder photos (`image-a.png`, `image-b.png`) are
> demo images found on Pinterest. Copyright belongs to the original
> creators — I do not own them, and they are included for demonstration
> purposes only.

## Built with

- **React + TypeScript + Vite**
- **WebGL** (raw — no three.js / R3F / OGL), single fragment shader
- **GSAP** for the progress tween

## Credit

The original "Ripple with Noise" effect is by **Minsang
([@radiofun8](https://x.com/radiofun8))**, written as a Metal shader. This
project is inspired by and recreated from that work — thanks for sharing it.
