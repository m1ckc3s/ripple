import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { Params, RippleHandle } from './rippleParams'

const IMG_A = '/image-a.png'
const IMG_B = '/image-b.png'

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform sampler2D u_texA;
uniform sampler2D u_texB;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_progress;
uniform float u_sigma;
uniform float u_waveFreq;
uniform float u_pushAmt;
uniform float u_caStrength;
uniform float u_glow;
uniform float u_noiseWarp;
uniform float u_swap;
uniform float u_pinch;

varying vec2 v_uv;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, int octaves) {
  float val = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    val += amp * vnoise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return val;
}

void main() {
  vec2 uv = v_uv;
  vec2 size = u_resolution;
  vec2 center = u_center;

  vec2 p = uv - center;
  float aspect = size.x / size.y;
  p.x *= aspect;

  float dist = length(p);
  float maxDist = length(vec2(0.5 * aspect, 0.5));
  float normDist = clamp(dist / maxDist, 0.0, 1.0);

  float noiseLarge = fbm(p * 4.0 + vec2(u_progress * 1.0, u_progress * 0.5), 4);
  float noiseSmall = fbm(p * 12.0 + vec2(u_progress * 2.0, -u_progress * 1.5), 3);

  float coverage = 1.0 + 0.5 * u_noiseWarp + 0.1;
  float waveFront = u_progress * coverage;

  float warpScale = smoothstep(0.0, 0.05, u_progress);
  float warpedDist = normDist
    + (noiseLarge - 0.5) * u_noiseWarp * warpScale
    + (noiseSmall - 0.5) * (u_noiseWarp * 0.9) * warpScale;

  float delta = warpedDist - waveFront;
  float baseEnvelope = exp(-delta * delta / (2.0 * u_sigma * u_sigma));
  float ripples = max(0.0, cos(delta * u_waveFreq));
  float envelope = baseEnvelope * ripples;

  float gate = smoothstep(0.0, 0.05, u_progress)
             * (1.0 - smoothstep(0.85, 1.0, u_progress));
  envelope *= gate;

  vec2 dir = (dist > 0.001) ? normalize(p) : vec2(0.0);
  float pushAmt = envelope * u_pushAmt;

  float pinchSigma = 0.10;
  float pinchG = exp(-dist * dist / (2.0 * pinchSigma * pinchSigma));
  float pinchDisp = (dist / (pinchSigma * pinchSigma)) * pinchG * 0.01 * u_pinch;

  vec2 toEdge = min(uv, 1.0 - uv);
  float edgeFade = smoothstep(0.0, 0.14, min(toEdge.x, toEdge.y));
  pinchDisp *= edgeFade;

  vec2 uvOffset = dir * (pushAmt - pinchDisp);
  uvOffset.x /= aspect;

  float caStrength = envelope * u_caStrength;
  vec2 caOffset = dir * caStrength;
  caOffset.x /= aspect;

  vec2 uvR = uv - uvOffset - caOffset;
  vec2 uvG = uv - uvOffset;
  vec2 uvB = uv - uvOffset + caOffset;

  vec4 colorA = vec4(
    texture2D(u_texA, uvR).r,
    texture2D(u_texA, uvG).g,
    texture2D(u_texA, uvB).b,
    1.0
  );
  vec4 colorB = vec4(
    texture2D(u_texB, uvR).r,
    texture2D(u_texB, uvG).g,
    texture2D(u_texB, uvB).b,
    1.0
  );

  float feather = 0.04 + 0.05 * noiseLarge;
  float reveal = smoothstep(waveFront + feather, waveFront - feather, warpedDist);
  reveal *= smoothstep(0.0, 0.05, u_progress);

  vec4 base = mix(colorA, colorB, u_swap);
  vec4 target = mix(colorB, colorA, u_swap);
  vec4 color = mix(base, target, reveal);

  float glow = envelope * u_glow;
  color.rgb = clamp(color.rgb / max(1.0 - glow, 0.01), 0.0, 1.0);

  color.rgb *= 1.0 - 0.16 * pinchG * edgeFade * u_pinch;
  color.rgb = clamp(color.rgb, 0.0, 1.0);

  gl_FragColor = vec4(color.rgb, 1.0);
}
`

function compileShader(gl: WebGLRenderingContext, src: string, type: number) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh) || 'shader compile error'
    gl.deleteShader(sh)
    throw new Error(info)
  }
  return sh
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function uploadTexture(
  gl: WebGLRenderingContext,
  unit: number,
  img: HTMLImageElement,
) {
  const tex = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

interface Props {
  params: Params
  imageA?: string
  imageB?: string
  onReady?: (h: RippleHandle) => void
}

export default function RippleTransition({
  params,
  imageA = IMG_A,
  imageB = IMG_B,
  onReady,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const paramsRef = useRef(params)
  const renderRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    let cancelled = false
    let cleanup: (() => void) | null = null

    const setup = async () => {
      const [imgA, imgBraw] = await Promise.all([
        loadImage(imageA),
        loadImage(imageB),
      ])
      if (cancelled || !imgA) return
      const imgB = imgBraw ?? imgA

      const isMobile = window.innerWidth <= 640
      const maxW = window.innerWidth * (isMobile ? 0.9 : 0.7)
      const maxH = window.innerHeight * (isMobile ? 0.8 : 0.86)
      const aspect = imgA.naturalWidth / imgA.naturalHeight
      let dispW = maxW
      let dispH = dispW / aspect
      if (dispH > maxH) {
        dispH = maxH
        dispW = dispH * aspect
      }
      wrapper.style.width = `${dispW}px`
      wrapper.style.height = `${dispH}px`

      const gl = canvas.getContext('webgl', { premultipliedAlpha: false })
      if (!gl) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(dispW * dpr)
      canvas.height = Math.round(dispH * dpr)

      const vs = compileShader(gl, VERT, gl.VERTEX_SHADER)
      const fs = compileShader(gl, FRAG, gl.FRAGMENT_SHADER)
      const program = gl.createProgram()!
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'program link error')
      }
      gl.useProgram(program)

      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      )
      const aPos = gl.getAttribLocation(program, 'a_pos')
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

      const texA = uploadTexture(gl, 0, imgA)
      const texB = uploadTexture(gl, 1, imgB)
      gl.uniform1i(gl.getUniformLocation(program, 'u_texA'), 0)
      gl.uniform1i(gl.getUniformLocation(program, 'u_texB'), 1)

      const u = {
        res: gl.getUniformLocation(program, 'u_resolution'),
        center: gl.getUniformLocation(program, 'u_center'),
        progress: gl.getUniformLocation(program, 'u_progress'),
        sigma: gl.getUniformLocation(program, 'u_sigma'),
        waveFreq: gl.getUniformLocation(program, 'u_waveFreq'),
        pushAmt: gl.getUniformLocation(program, 'u_pushAmt'),
        caStrength: gl.getUniformLocation(program, 'u_caStrength'),
        glow: gl.getUniformLocation(program, 'u_glow'),
        noiseWarp: gl.getUniformLocation(program, 'u_noiseWarp'),
        swap: gl.getUniformLocation(program, 'u_swap'),
        pinch: gl.getUniformLocation(program, 'u_pinch'),
      }

      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(u.res, canvas.width, canvas.height)

      const state = { progress: 0, cx: 0.5, cy: 0.5, swap: 0, pinch: 0 }

      const render = () => {
        const p = paramsRef.current
        gl.uniform2f(u.center, state.cx, state.cy)
        gl.uniform1f(u.progress, state.progress)
        gl.uniform1f(u.sigma, p.sigma)
        gl.uniform1f(u.waveFreq, p.waveFreq)
        gl.uniform1f(u.pushAmt, p.pushAmt)
        gl.uniform1f(u.caStrength, p.caStrength)
        gl.uniform1f(u.glow, p.glow)
        gl.uniform1f(u.noiseWarp, p.noiseWarp)
        gl.uniform1f(u.swap, state.swap)
        gl.uniform1f(u.pinch, state.pinch)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
      renderRef.current = render
      render()

      let animating = false

      const trigger = (
        cx?: number,
        cy?: number,
        withPinch: boolean = paramsRef.current.pinch,
      ) => {
        if (animating) return
        if (cx !== undefined) state.cx = cx
        if (cy !== undefined) state.cy = cy
        gsap.killTweensOf(state)
        state.progress = 0
        state.pinch = 0
        animating = true

        if (withPinch) {
          gsap.to(state, {
            keyframes: [
              { pinch: paramsRef.current.pinchStrength, duration: 0.1, ease: 'power3.out' },
              { pinch: 0, duration: 0.4, ease: 'power2.in' },
            ],
            onUpdate: render,
          })
        }

        gsap.to(state, {
          progress: 1,
          duration: paramsRef.current.duration,
          ease: paramsRef.current.ease,
          onUpdate: render,
          onComplete: () => {
            state.swap = state.swap > 0.5 ? 0 : 1
            state.progress = 0
            animating = false
            render()
          },
        })
      }

      const scrub = (progress: number) => {
        gsap.killTweensOf(state)
        animating = false
        state.pinch = 0
        state.progress = progress
        render()
      }

      const coords = (e: {
        clientX: number
        clientY: number
      }): [number, number] => {
        const r = canvas.getBoundingClientRect()
        return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]
      }
      const handlePointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return
        const [cx, cy] = coords(e)
        trigger(cx, cy)
      }
      canvas.addEventListener('pointerdown', handlePointerDown)

      onReady?.({ trigger, scrub })

      cleanup = () => {
        canvas.removeEventListener('pointerdown', handlePointerDown)
        gsap.killTweensOf(state)
        renderRef.current = null
        gl.deleteTexture(texA)
        gl.deleteTexture(texB)
        gl.deleteBuffer(buf)
        gl.deleteProgram(program)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
      }
    }

    setup()

    return () => {
      cancelled = true
      cleanup?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageA, imageB])

  useEffect(() => {
    paramsRef.current = params
    renderRef.current?.()
  }, [params])

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        borderRadius: 32,
        overflow: 'hidden',
        cursor: 'default',
        lineHeight: 0,
        background: '#141416',
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}
