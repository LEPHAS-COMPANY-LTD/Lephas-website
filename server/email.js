const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function emailLayout(title, paragraphs, action) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
  const button = action
    ? `<p style="margin:22px 0"><a href="${escapeHtml(action.url)}" style="background:#3A4650;color:#EEF5FB;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">${escapeHtml(action.label)}</a></p>`
    : ''
  return `<div style="background:#EEF5FB;padding:28px;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#3A4650">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;padding:28px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;color:#8DBFE3;font-weight:700">LEPHAS COMPANY LTD</p>
    <h1 style="margin:0 0 18px;font-size:20px">${escapeHtml(title)}</h1>
    ${body}${button}
    <p style="margin:24px 0 0;font-size:12px;color:#6b7782">Transforming the future.</p>
  </div>
</div>`
}

export async function sendEmail({ to, subject, html, text, replyTo }) {
  const apiKey = process.env.EMAIL_API_KEY
  const from = process.env.EMAIL_FROM || 'Lephas <onboarding@resend.dev>'
  if (!to) return { sent: false, reason: 'no recipient' }
  if (!apiKey) {
    console.info(`[email] EMAIL_API_KEY not set, skipped "${subject}" to ${to}`)
    return { sent: false, reason: 'not configured' }
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text, reply_to: replyTo }),
    })
    if (!response.ok) {
      console.error('[email] provider rejected message', response.status, await response.text().catch(() => ''))
      return { sent: false, reason: 'provider error' }
    }
    return { sent: true }
  } catch (error) {
    console.error('[email] failed to send', error)
    return { sent: false, reason: 'network error' }
  }
}
