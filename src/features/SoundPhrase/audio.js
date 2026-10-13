// Turns an uploaded audio or video file into what Whisper wants:
// mono audio sampled at 16,000 Hz, as a Float32Array.

export const MAX_FILE_MB = 100
export const MAX_MINUTES = 10

const TARGET_RATE = 16000

export async function decodeToMono16k(file) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`That file is over ${MAX_FILE_MB} MB. Try a smaller or shorter one.`)
  }

  const bytes = await file.arrayBuffer()
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const ctx = new AudioCtx()

  let decoded
  try {
    decoded = await ctx.decodeAudioData(bytes)
  } catch {
    throw new Error("Your browser couldn't read the audio in that file. Try an MP3, WAV, M4A or MP4.")
  } finally {
    ctx.close?.()
  }

  if (decoded.duration > MAX_MINUTES * 60) {
    throw new Error(`That recording is over ${MAX_MINUTES} minutes. Try a shorter clip.`)
  }

  // Resample to 16 kHz and mix down to one channel.
  const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE))
  const offline = new OfflineAudioContext(1, frames, TARGET_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()

  // Copy, so the array owns its memory and can be handed to the worker.
  return new Float32Array(rendered.getChannelData(0))
}
