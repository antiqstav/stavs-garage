import FlowDiagram from '../../components/FlowDiagram.jsx'

// How one replayed message flows through the simulator.
export default function Workflow() {
  return (
    <FlowDiagram
      title="How Order Book Replay works"
      description="Recorded messages update the order book. The market maker reads the best bid and ask and sends quotes, which arrive after a latency delay and join the queue. The fill model compares each recorded trade with your place in line to decide your fills, which update profit and position. Position feeds back to cap the quotes."
      steps={[
        { title: 'LOBSTER messages', lines: ['3,000 real GOOG order events', 'from June 21, 2012'], kind: 'data' },
        { title: 'Order book', lines: ['price-time priority, top 10 levels', 're-synced to exchange snapshots'] },
        { title: 'Market maker', lines: ['quotes 100 shares at the', 'best bid and the best ask'] },
        { title: 'Latency', lines: ['orders reach the book', '0 to 10 ms after they are sent'] },
        { title: 'Fill model', lines: ['decides how much of each trade', 'reaches your place in line'], kind: 'key' },
        { title: 'Profit and position', lines: ['cash plus shares held,', 'marked at the mid price'], kind: 'out' },
      ]}
      edges={['apply', 'best bid & ask', 'place / cancel', 'join the queue', 'fills']}
      lanes={[
        { from: 0, to: 4, side: 'left', label: 'trades at your price' },
        { from: 5, to: 2, side: 'right', label: 'position limit ±300' },
      ]}
    />
  )
}
