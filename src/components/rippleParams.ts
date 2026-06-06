export type Params = {
  sigma: number
  waveFreq: number
  pushAmt: number
  caStrength: number
  glow: number
  noiseWarp: number
  duration: number
  ease: string
  pinch: boolean
  pinchStrength: number
}

export type RippleHandle = {
  trigger: (cx?: number, cy?: number) => void
  scrub: (progress: number) => void
}

export const DEFAULT_PARAMS: Params = {
  sigma: 0.15,
  waveFreq: 5,
  pushAmt: 0.145,
  caStrength: 0.02,
  glow: 0.73,
  noiseWarp: 1.0,
  duration: 1.4,
  ease: 'power2.inOut',
  pinch: true,
  pinchStrength: 0.3,
}

export const EASE_OPTIONS = [
  { value: 'none', label: 'Linear' },
  { value: 'power1.in', label: 'Ease In (soft)' },
  { value: 'power2.in', label: 'Ease In' },
  { value: 'power3.in', label: 'Ease In (strong)' },
  { value: 'power1.out', label: 'Ease Out (soft)' },
  { value: 'power2.out', label: 'Ease Out' },
  { value: 'power3.out', label: 'Ease Out (strong)' },
  { value: 'power2.inOut', label: 'Ease In-Out' },
  { value: 'power3.inOut', label: 'Ease In-Out (strong)' },
  { value: 'expo.out', label: 'Expo Out' },
  { value: 'back.out(1.4)', label: 'Back Out' },
]
