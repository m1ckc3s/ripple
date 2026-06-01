import { useState } from 'react'
import type { Params } from './RippleTransition'
import { EASE_OPTIONS } from './RippleTransition'
import './Controls.css'

type NumericKey = {
  [K in keyof Params]: Params[K] extends number ? K : never
}[keyof Params]

type SliderDef = {
  key: NumericKey
  label: string
  min: number
  max: number
  step: number
}

const SLIDERS: SliderDef[] = [
  { key: 'waveSpeed', label: 'Wave Speed', min: 0.3, max: 3, step: 0.05 },
  { key: 'sigma', label: 'Wave Width', min: 0.05, max: 0.5, step: 0.01 },
  { key: 'waveFreq', label: 'Ripple Density', min: 5, max: 100, step: 1 },
  { key: 'pushAmt', label: 'Displacement', min: 0, max: 0.5, step: 0.005 },
  { key: 'caStrength', label: 'RGB Split', min: 0, max: 0.05, step: 0.0005 },
  { key: 'glow', label: 'Glow', min: 0, max: 1, step: 0.01 },
  { key: 'noiseWarp', label: 'Noise Warp', min: 0, max: 1, step: 0.01 },
  { key: 'duration', label: 'Duration', min: 0.3, max: 4, step: 0.05 },
]

function formatValue(v: number, step: number) {
  const decimals =
    step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : step >= 0.001 ? 3 : 4
  return v.toFixed(decimals)
}

interface Props {
  params: Params
  onChange: (next: Params) => void
  onReset: () => void
  scrubValue: number
  onScrub: (v: number) => void
  onReplay: () => void
}

export default function Controls({
  params,
  onChange,
  onReset,
  scrubValue,
  onScrub,
  onReplay,
}: Props) {
  const [open, setOpen] = useState(true)

  return (
    <div className={`rc-root${open ? ' is-open' : ''}`}>
      {/* Collapsed state: a pill in the top-left that expands into the panel. */}
      <button
        type="button"
        className="rc-collapsed"
        onClick={() => setOpen(true)}
        aria-label="Open controls"
      >
        <SlidersIcon />
        Controls
      </button>

      <aside className="rc-panel">
        <header className="rc-header">
          <h2 className="rc-title">Ripple</h2>
          <div className="rc-header-actions">
            <button className="rc-ghost" onClick={onReset} type="button">
              Reset
            </button>
            <button
              className="rc-icon-btn"
              onClick={() => setOpen(false)}
              type="button"
              aria-label="Close controls"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

      <div className="rc-sliders">
        {SLIDERS.map((s) => (
          <div key={s.key} className="rc-control">
            <div className="rc-label">
              <span>{s.label}</span>
              <span className="rc-value">
                {formatValue(params[s.key], s.step)}
              </span>
            </div>
            <input
              className="rc-slider"
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={params[s.key]}
              onChange={(e) =>
                onChange({ ...params, [s.key]: parseFloat(e.target.value) })
              }
            />
          </div>
        ))}

        <div className="rc-control">
          <div className="rc-label">
            <span>Easing</span>
          </div>
          <select
            className="rc-select"
            value={params.ease}
            onChange={(e) => onChange({ ...params, ease: e.target.value })}
          >
            {EASE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rc-control rc-toggle-row">
          <span>Pinch</span>
          <button
            type="button"
            role="switch"
            aria-checked={params.pinch}
            className={`rc-switch${params.pinch ? ' is-on' : ''}`}
            onClick={() => onChange({ ...params, pinch: !params.pinch })}
          >
            <span className="rc-switch-knob" />
          </button>
        </div>
      </div>

      <div className="rc-dev">
        <div className="rc-dev-head">
          <span className="rc-dev-tag">Dev</span>
          <span className="rc-dev-title">Scrub</span>
        </div>
        <div className="rc-control">
          <div className="rc-label">
            <span>Progress</span>
            <span className="rc-value">{scrubValue.toFixed(3)}</span>
          </div>
          <input
            className="rc-slider"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={scrubValue}
            onChange={(e) => onScrub(parseFloat(e.target.value))}
          />
        </div>
        <button className="rc-secondary" onClick={onReplay} type="button">
          Replay
        </button>
      </div>
      </aside>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2 4h6M11 4h1M2 10h1M6 10h6" />
      <circle cx="9.5" cy="4" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
