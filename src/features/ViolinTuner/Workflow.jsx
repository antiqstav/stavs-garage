import FlowDiagram from '../../components/FlowDiagram.jsx'

// From microphone samples to "flat by 12 cents", about 30 times a second.
export default function Workflow() {
  return (
    <FlowDiagram
      title="How the violin tuner works"
      description="The microphone provides 2,048 samples at a time. Quiet buffers are skipped. YIN compares the sound with shifted copies of itself, the first deep dip gives the period and so the frequency, a median of recent readings steadies it, and the result is shown as the nearest string or note and how many cents off it is. This repeats about 30 times a second."
      steps={[
        { title: 'Microphone', lines: ['2,048 samples at a time,', 'about 43 ms of sound'], kind: 'data' },
        { title: 'Loudness gate', lines: ['skip silence and', 'very quiet noise'] },
        { title: 'Compare with itself', lines: ['how different is the sound', 'from itself shifted by each lag?'] },
        { title: 'Find the period', lines: ['the first deep dip is one cycle;', 'refine it between samples'], kind: 'key' },
        { title: 'Steady it', lines: ['median of the last', 'five readings'] },
        { title: 'Note and cents', lines: ['nearest string or note, and', 'how far sharp or flat'], kind: 'out' },
      ]}
      edges={['audio', 'loud enough', 'difference curve', 'rate ÷ period = Hz', '']}
      lanes={[{ from: 5, to: 0, side: 'right', label: 'about 30 times a second' }]}
    />
  )
}
