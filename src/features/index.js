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
//     summary: 'One sentence shown on the card.',
//     details: 'A few sentences about how it works, shown under the demo.',
//     Demo: MyFeature,
//   },
// ]

import SoundPhrase from './SoundPhrase/SoundPhrase.jsx'
import OrderBookReplay from './OrderBookReplay/OrderBookReplay.jsx'

export const features = [
  {
    slug: 'soundphrase',
    title: 'SoundPhrase',
    summary: 'Drop in an audio or video file and get a text transcript, powered by Whisper.',
    details:
      "SoundPhrase turns speech in an audio or video file into text with OpenAI's Whisper model. The full version has a web front end and a Python Flask API that runs Whisper on my own machine. This demo runs the small English Whisper \"tiny\" model right in your browser instead, so your file never leaves your device. The first run downloads the model and your browser keeps it for next time. Long or noisy recordings can take a while, so short clips work best.",
    repo: 'https://github.com/antiqstav/Whisperly',
    Demo: SoundPhrase,
  },
  {
    slug: 'order-book-replay',
    title: 'Order Book Replay',
    summary: 'Replay real GOOG exchange messages and watch a market-making bot quote, wait in line, and win or lose.',
    details:
      "This is the core of my Java HFT simulator, ported to JavaScript so it runs in your browser. It replays about 12 minutes of real Nasdaq messages for GOOG (LOBSTER sample data, June 21, 2012) into a limit order book with price-time priority. A simple market maker keeps one bid and one ask at the best prices, holding at most 300 shares either way. The question is how many of its quotes would really have filled. That depends on where it sits in each price level's line, which the data doesn't record, so the four fill models make different guesses, and latency delays every order the bot sends. The port matches the Java version's fills and profit on all 288 experiment runs. One demo-only addition: the data file records just 10 price levels, so whenever the replayed book drifts from the exchange's snapshot, the top levels are re-synced to it. Treat the profit as a way to compare the models, not as a trading record.",
    repo: 'https://github.com/antiqstav/hft-simulator',
    Demo: OrderBookReplay,
  },
]
