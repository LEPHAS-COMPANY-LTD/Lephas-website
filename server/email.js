import nodemailer from 'nodemailer'
import { publishEmail, queueEnabled } from './queue.js'

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

export function emailProvider() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp'
  if (process.env.EMAIL_API_KEY) return 'resend'
  return 'none'
}

let transporter = null
let transporterKey = ''

function smtpTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 465)
  const key = `${host}:${port}:${process.env.SMTP_USER}`
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
    transporterKey = key
  }
  return transporter
}

function fromAddress(provider) {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM
  if (provider === 'smtp') return `Lephas Company Ltd <${process.env.SMTP_USER}>`
  return 'Lephas <onboarding@resend.dev>'
}

async function sendWithSmtp(message) {
  await smtpTransport().sendMail({
    from: fromAddress('smtp'),
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    html: message.html,
    text: message.text,
    attachments: message.attachments?.map((a) => ({ filename: a.filename, content: a.content, encoding: 'base64', contentType: a.contentType })),
  })
  return { sent: true }
}

async function sendWithResend(message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromAddress('resend'),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: message.replyTo,
      attachments: message.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
    }),
  })
  if (!response.ok) {
    console.error('[email] provider rejected message', response.status, await response.text().catch(() => ''))
    return { sent: false, reason: 'provider error' }
  }
  return { sent: true }
}

export async function deliverEmail({ to, subject, html, text, replyTo, attachments }) {
  if (!to) return { sent: false, reason: 'no recipient' }
  const provider = emailProvider()
  if (provider === 'none') {
    console.info(`[email] no email provider configured, skipped "${subject}" to ${to}`)
    return { sent: false, reason: 'not configured' }
  }
  try {
    const message = { to, subject, html, text, replyTo, attachments }
    return provider === 'smtp' ? await sendWithSmtp(message) : await sendWithResend(message)
  } catch (error) {
    console.error(`[email] failed to send "${subject}" via ${provider}:`, error?.message || error)
    return { sent: false, reason: 'send failed', error: error?.message || String(error) }
  }
}

export async function sendEmail(message) {
  if (!message?.to) return { sent: false, reason: 'no recipient' }
  if (queueEnabled()) {
    try {
      await publishEmail(message)
      return { sent: true, queued: true }
    } catch (error) {
      console.error(`[email] queue unavailable, sending "${message.subject}" directly:`, error?.message || error)
    }
  }
  return deliverEmail(message)
}
