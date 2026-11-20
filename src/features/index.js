// Your features live here. Each entry gets a card on /features
// and its own page at /features/<slug>.
//
// To add one:
//   1. Put your component in this folder, e.g. src/features/MyFeature.jsx
//      (export it as the default export).
//   2. Import it below and add an entry to the list.
//
// import MyFeature from './MyFeature.jsx'
//
// export const features = [
//   {
//     slug: 'my-feature',                 // used in the URL: /features/my-feature
//     title: 'My feature',
//     ticker: 'MYFT',                     // short symbol shown on cards and project pages
//     tags: ['Topic', 'Topic'],
//     summary: 'One sentence shown on the card.',
//     details: 'A few sentences about how it works, shown under the demo.',
//     Demo: MyFeature,
//   },
// ]

import SoundPhrase from './SoundPhrase/SoundPhrase.jsx'
import OrderBookReplay from './OrderBookReplay/OrderBookReplay.jsx'
import OrderBookWorkflow from './OrderBookReplay/Workflow.jsx'
import PidBalancer from './PidBalancer/PidBalancer.jsx'
import PidBalancerWorkflow from './PidBalancer/Workflow.jsx'
import ViolinTuner from './ViolinTuner/ViolinTuner.jsx'
import ViolinTunerWorkflow from './ViolinTuner/Workflow.jsx'

export const features = [
  {
    slug: 'soundphrase',
    title: 'SoundPhrase',
    ticker: 'SNDP',
    tags: ['ML', 'Audio'],
    stack: ['React', 'Web Worker', 'transformers.js', 'ONNX Runtime (WebAssembly)'],
    summary: 'Drop in an audio or video file and get a text transcript, powered by Whisper.',
    details:
      "SoundPhrase turns speech in an audio or video file into text with OpenAI's Whisper model. The full version, Whisperly, is a full-stack app: a Flask REST API transcribes uploaded files on the server, and a FastAPI WebSocket server streams microphone audio in chunks for live captions. This demo runs the small English Whisper \"tiny\" model right in your browser instead, so your file never leaves your device. The first run downloads the model and your browser keeps it for next time. Long or noisy recordings can take a while, so short clips work best.",
    repo: 'https://github.com/antiqstav/Whisperly',
    Demo: SoundPhrase,
  },
  {
    slug: 'hft-simulator',
    title: 'HFT Simulator',
    ticker: 'HFT',
    tags: ['Quant', 'Simulation'],
    stack: ['Java (original engine)', 'JavaScript port', 'React', 'Node data pipeline'],
    summary: 'Replay real GOOG exchange messages and watch a market-making bot quote, wait in line, and win or lose.',
    details:
      "This is the core of my Java HFT simulator, ported to JavaScript so it runs in your browser. It replays about 12 minutes of real Nasdaq messages for GOOG (LOBSTER sample data, June 21, 2012) into a limit order book with price-time priority. A simple market maker keeps one bid and one ask at the best prices, holding at most 300 shares either way. The question is how many of its quotes would really have filled. That depends on where it sits in each price level's line, which the data doesn't record, so the four fill models make different guesses, and latency delays every order the bot sends. The port matches the Java version's fills and profit on all 288 experiment runs. One demo-only addition: the data file records just 10 price levels, so whenever the replayed book drifts from the exchange's snapshot, the top levels are re-synced to it. Treat the profit as a way to compare the models, not as a trading record.",
    repo: 'https://github.com/antiqstav/hft-simulator',
    Demo: OrderBookReplay,
    Diagram: OrderBookWorkflow, // optional: shown beside "How it works"
  },
  {
    slug: 'pid-balancer',
    title: 'PID Balancer',
    ticker: 'PID',
    tags: ['Controls', 'Robotics'],
    stack: ['JavaScript', 'Runge-Kutta physics', 'Canvas', 'React'],
    repo: 'https://github.com/antiqstav/stavs-garage/tree/main/src/features/PidBalancer',
    summary: 'Tune a PID controller to balance a stick on a sliding cart, then see if it survives a shove and a gust of wind.',
    details:
      "PID control is what keeps FRC arms, elevators and drivetrains where they're told to be, so I built a playground for it: an inverted pendulum, a stick balanced on a cart that can only slide left and right. It runs on two PID loops, one inside the other, the way real robots stack them. The stick loop watches the angle: P pushes the cart harder the further the stick leans, and D pushes against how fast it's tipping. The cart loop watches where the cart is: to drive somewhere, the stick has to lean that way first, so it picks a small lean toward the flag. Each preset shows one lesson. Too little P can't catch the stick. P without D wobbles until it falls, because the motor takes 50 ms to respond. The stick loop alone keeps the stick up but lets the cart drift off the track. Wind needs the cart loop's I, because the stick has to lean into a steady wind to stay up, and only I keeps adding up the leftover distance until the cart is back at the flag. The physics are the standard cart-pole equations with friction left out, and every preset's behavior was checked in tests.",
    Demo: PidBalancer,
    Diagram: PidBalancerWorkflow,
  },
  {
    slug: 'violin-tuner',
    title: 'Violin Tuner',
    ticker: 'TUNE',
    tags: ['DSP', 'Audio'],
    stack: ['Web Audio API', 'YIN pitch detection', 'SVG', 'React'],
    repo: 'https://github.com/antiqstav/stavs-garage/tree/main/src/features/ViolinTuner',
    summary: 'A violin tuner in your browser that hears your pitch and shows how many cents sharp or flat you are.',
    details:
      "I play the violin, so I built the tuner I'd want. It listens through your microphone and finds the pitch with the YIN algorithm: it compares the sound wave with copies of itself shifted by every possible lag, and the first lag where they nearly match is one cycle of the note. A violin's overtones can be louder than the note itself, which fools simpler methods that look for the loudest frequency and makes them jump an octave. YIN measures the repeat directly, so it doesn't. In tests on 1,026 synthetic violin-like tones from 180 to 1,400 Hz, with and without added noise, every reading landed within 5 cents, and clean tones within 1 cent. No violin handy? Play a reference string and drag the detune slider to watch the needle follow.",
    Demo: ViolinTuner,
    Diagram: ViolinTunerWorkflow,
  },
]
