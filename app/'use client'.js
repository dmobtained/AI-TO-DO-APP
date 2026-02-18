'use client'

import { useState } from 'react'

export default function Page() {
  const [count, setCount] = useState(0)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000, #111827)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif'
      }}
    >
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
        AI TO-DO LAB
      </h1>

      <p style={{ opacity: 0.7 }}>
        Als je dit ziet werkt je Next.js app gewoon.
      </p>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px' }}>{count}</h2>

        <button
          onClick={() => setCount(count + 1)}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            background: '#2563eb',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Klik mij
        </button>
      </div>
    </div>
  )
}
