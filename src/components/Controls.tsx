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
  return (
    <aside className="rc-panel">
      <header className="rc-header">
        <h2 className="rc-title">Ripple</h2>
        <button className="rc-ghost" onClick={onReset} type="button">
          Reset
        </button>
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
        <button className="rc-primary" onClick={onReplay} type="button">
          Replay
        </button>
      </div>
    </aside>
  )
}
