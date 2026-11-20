// Full-stack and backend projects that live on GitHub rather than as in-browser demos.
// Each point describes what is actually in that repository's code.
export const codeProjects = [
  {
    name: 'Whisperly',
    tagline: 'A speech-to-text platform for people who are hard of hearing.',
    award: '4th · Texas TSA 2025–26',
    points: [
      'Flask REST API: upload an audio file, the server runs Whisper and returns the transcript as JSON',
      'FastAPI WebSocket server that streams microphone audio in chunks for live captions',
      'Three modes: file upload, browser voice notes, and live listening',
    ],
    stack: ['Python', 'Flask', 'FastAPI', 'WebSockets', 'Whisper', 'JavaScript'],
    repo: 'https://github.com/antiqstav/Whisperly',
    demo: 'soundphrase',
  },
  {
    name: 'GreenAcres',
    tagline: 'A crop-planning web app for beginning farmers, built with a team of three.',
    award: '1st · Texas TSA 2024–25',
    points: [
      'Flask API that serves a crop-recommendation model from soil and weather inputs',
      'Pulls live weather for the farmer’s location from the Open-Meteo API',
      'User accounts and a crop-management console with profit tracking, stored in Firebase Firestore',
      'Interactive field map built with Leaflet and OpenStreetMap',
    ],
    stack: ['Python', 'Flask', 'Firebase', 'Firestore', 'JavaScript', 'Leaflet'],
    repo: 'https://github.com/antiqstav/greenAcres',
  },
  {
    name: 'HFT Simulator',
    tagline: 'The original Java engine behind the in-browser demo.',
    points: [
      'Limit order book with price-time priority and an order index, replaying about 39,000 messages a second',
      'Replay driver for LOBSTER market data, checked against exchange snapshots',
      'Randomized invariant tests, four queue fill models, and a latency-aware simulator',
    ],
    stack: ['Java'],
    repo: 'https://github.com/antiqstav/hft-simulator',
    demo: 'hft-simulator',
  },
]
