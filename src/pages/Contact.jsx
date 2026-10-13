import { useState } from 'react'

const EMAIL = 'you@example.com' // TODO: replace with your real address

export default function Contact() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  const href = `mailto:${EMAIL}?subject=${encodeURIComponent(`Hello from ${name || 'your website'}`)}&body=${encodeURIComponent(message)}`

  return (
    <>
      <p className="eyebrow">Leave a note</p>
      <h1 className="page-title">Contact</h1>
      <p>Write a note below and it opens in your email app, ready to send.</p>
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="message">Message</label>
        <textarea id="message" rows="5" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <a className="btn primary" href={href}>Open in email</a>
    </>
  )
}
