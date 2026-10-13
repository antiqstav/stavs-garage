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
]
