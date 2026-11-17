import FlowDiagram from '../../components/FlowDiagram.jsx'

// The two PID loops, one inside the other, run 480 times a second.
export default function Workflow() {
  return (
    <FlowDiagram
      title="How the PID balancer works"
      description="Sensors read the cart's position and speed and the stick's angle and spin. The cart loop compares the cart with the flag and picks a lean toward it. The stick loop compares the real lean with that target and decides how hard to push. The motor delivers the push after a short delay, the physics moves the cart and tips the stick, and the sensors read it again."
      steps={[
        { title: 'Sensors', lines: ['cart position and speed,', 'stick angle and spin'], kind: 'data' },
        { title: 'Cart loop (PID)', lines: ['how far from the flag?', 'pick a lean toward it'] },
        { title: 'Stick loop (PD)', lines: ['how far from that lean?', 'decide how hard to push'], kind: 'key' },
        { title: 'Motor', lines: ['up to 30 N, and', 'about 50 ms to respond'] },
        { title: 'Physics', lines: ['the cart slides, the stick tips;', 'plus wind and your pushes'], kind: 'out' },
      ]}
      edges={['position, speed', 'target lean', 'push command', 'force']}
      lanes={[
        { from: 0, to: 2, side: 'left', label: 'angle, spin' },
        { from: 4, to: 0, side: 'right', label: '480 times a second' },
      ]}
    />
  )
}
