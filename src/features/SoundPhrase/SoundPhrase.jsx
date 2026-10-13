import { useEffect, useRef, useState } from 'react'
import { decodeToMono16k, MAX_MINUTES } from './audio.js'

const FRIENDLY_WORKER_ERROR =
  "Something went wrong while transcribing. The model downloads the first time, so check your connection and try again."

export default function SoundPhrase() {
  const [stage, setStage] = useState('idle') // idle | decoding | loading | transcribing | done | error
  const [percent, setPercent] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const workerRef = useRef(null)

  useEffect(() => () => workerRef.current?.terminate(), [])

  const getWorker = () => {
    if (!workerRef.current) {
      const worker = new Worker(new URL('./whisper.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (event) => {
        const msg = event.data
        if (msg.type === 'download') setPercent((p) => Math.max(p, msg.percent))
        else if (msg.type === 'stage') setStage(msg.stage)
        else if (msg.type === 'result') {
          setText(msg.text)
          setStage('done')
        } else if (msg.type === 'error') {
          console.error('SoundPhrase worker error:', msg.message)
          setError(FRIENDLY_WORKER_ERROR)
          setStage('error')
        }
      }
      worker.onerror = (event) => {
        console.error('SoundPhrase worker crashed:', event.message)
        setError(FRIENDLY_WORKER_ERROR)
        setStage('error')
      }
      workerRef.current = worker
    }
    return workerRef.current
  }

  const transcribe = async (file) => {
    if (!file) return
    setFileName(file.name)
    setError('')
    setText('')
    setCopied(false)
    setStage('decoding')
    try {
      const audio = await decodeToMono16k(file)
      setStage('loading')
      getWorker().postMessage({ type: 'transcribe', audio }, [audio.buffer])
    } catch (err) {
      setError(err.message)
      setStage('error')
    }
  }

  const cancel = () => {
    workerRef.current?.terminate()
    workerRef.current = null
    setPercent(0)
    setStage('idle')
  }

  const reset = () => {
    setStage('idle')
    setText('')
    setError('')
    setFileName('')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName.replace(/\.[^.]+$/, '') || 'transcript'}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const busy = stage === 'decoding' || stage === 'loading' || stage === 'transcribing'

  if (busy) {
    const label =
      stage === 'decoding'
        ? 'Reading your file…'
        : stage === 'loading'
          ? `Loading the Whisper model (first time only)… ${percent}%`
          : 'Transcribing…'
    return (
      <div>
        <p className="status" role="status">{label}</p>
        <div className={stage === 'transcribing' || stage === 'decoding' ? 'gauge busy' : 'gauge'}>
          <span style={stage === 'loading' ? { width: `${percent}%` } : undefined} />
        </div>
        <p className="hint">{fileName}</p>
        <button type="button" className="btn small" onClick={cancel}>Cancel</button>
      </div>
    )
  }

  if (stage === 'done') {
    return (
      <div>
        {text ? (
          <p className="transcript">{text}</p>
        ) : (
          <p className="status">No speech was found in that file.</p>
        )}
        <div className="row">
          {text && <button type="button" className="btn primary small" onClick={copy}>{copied ? 'Copied' : 'Copy text'}</button>}
          {text && <button type="button" className="btn small" onClick={download}>Download .txt</button>}
          <button type="button" className="btn small" onClick={reset}>Transcribe another</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {stage === 'error' && <p className="error-msg" role="alert">{error}</p>}
      <label
        className={dragging ? 'dropzone drag' : 'dropzone'}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); transcribe(e.dataTransfer.files[0]) }}
      >
        <strong>Drop an audio or video file here</strong>
        <span>or click to choose one</span>
        <span className="hint">English speech, up to {MAX_MINUTES} minutes. Your file stays on your device.</span>
        <span className="hint">Accepted formats: mp4, mov, wmv, wav, mp3, flac, and wma.</span>
        <input
          className="sr-only"
          type="file"
          accept="audio/*,video/*"
          onChange={(e) => { transcribe(e.target.files[0]); e.target.value = '' }}
        />
      </label>
    </div>
  )
}
