import { useRef, useState } from 'react'
import RippleTransition, {
  DEFAULT_PARAMS,
  type Params,
  type RippleHandle,
} from './components/RippleTransition'
import Controls from './components/Controls'
import './App.css'

function App() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS)
  const [scrubValue, setScrubValue] = useState(0)
  const handleRef = useRef<RippleHandle | null>(null)

  return (
    <main className="stage">
      <RippleTransition
        params={params}
        onReady={(h) => {
          handleRef.current = h
        }}
      />
      <Controls
        params={params}
        onChange={setParams}
        onReset={() => setParams(DEFAULT_PARAMS)}
        scrubValue={scrubValue}
        onScrub={(v) => {
          setScrubValue(v)
          handleRef.current?.scrub(v)
        }}
        onReplay={() => {
          setScrubValue(0)
          handleRef.current?.trigger()
        }}
      />
    </main>
  )
}

export default App
