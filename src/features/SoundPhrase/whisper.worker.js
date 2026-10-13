import { pipeline, env } from '@huggingface/transformers'

// English-only "tiny" Whisper. To try other models, change this ID
// (for example 'Xenova/whisper-tiny' for many languages).
const MODEL = 'Xenova/whisper-tiny.en'

env.allowLocalModels = false

let transcriberPromise = null

function loadModel() {
  if (!transcriberPromise) {
    const files = {}
    transcriberPromise = pipeline('automatic-speech-recognition', MODEL, {
      device: 'wasm',
      progress_callback: (p) => {
        if (p.status === 'progress' && p.total) {
          files[p.file] = { loaded: p.loaded, total: p.total }
          const all = Object.values(files)
          const loaded = all.reduce((sum, f) => sum + f.loaded, 0)
          const total = all.reduce((sum, f) => sum + f.total, 0)
          self.postMessage({ type: 'download', percent: Math.round((100 * loaded) / total) })
        }
      },
    }).catch((err) => {
      transcriberPromise = null // let the next attempt retry the download
      throw err
    })
  }
  return transcriberPromise
}

self.onmessage = async (event) => {
  if (event.data?.type !== 'transcribe') return
  try {
    self.postMessage({ type: 'stage', stage: 'loading' })
    const transcriber = await loadModel()
    self.postMessage({ type: 'stage', stage: 'transcribing' })
    const output = await transcriber(event.data.audio, {
      chunk_length_s: 30, // Whisper reads 30-second windows
      stride_length_s: 5, // overlapping a little so words at the seams aren't cut
    })
    self.postMessage({ type: 'result', text: (output.text || '').trim() })
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message || err) })
  }
}
