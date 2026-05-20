export async function sendEmail({ to, subject, body }) {
  try {
    const response = await fetch(
      `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/sendEmail`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      }
    )
    if (!response.ok) {
      console.error('Email send failed:', await response.text())
    }
    return response.ok
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}
