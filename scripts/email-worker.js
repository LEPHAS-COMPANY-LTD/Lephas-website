import { deliverEmail, emailProvider } from '../server/email.js'
import { connectQueue, emailQueue } from '../server/queue.js'

const MAX_ATTEMPTS = Number(process.env.EMAIL_MAX_ATTEMPTS || 4)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let stopping = false
let current = null

async function handle(channel, msg) {
  const attempts = Number(msg.properties.headers?.['x-attempts'] || 0) + 1
  let message
  try {
    message = JSON.parse(msg.content.toString())
  } catch {
    console.error('[worker] dropped a message that is not valid JSON')
    channel.nack(msg, false, false)
    return
  }

  const result = await deliverEmail(message)
  if (result.sent || result.reason === 'no recipient') {
    if (result.sent) console.info(`[worker] sent "${message.subject}" to ${message.to}`)
    channel.ack(msg)
    return
  }

  if (attempts >= MAX_ATTEMPTS) {
    console.error(`[worker] giving up on "${message.subject}" after ${attempts} attempts, moved to ${emailQueue()}.failed`)
    channel.nack(msg, false, false)
    return
  }

  const delay = 5000 * 2 ** (attempts - 1)
  console.warn(`[worker] attempt ${attempts} failed for "${message.subject}", retrying in ${delay / 1000}s`)
  await wait(delay)
  channel.sendToQueue(emailQueue(), msg.content, {
    persistent: true,
    contentType: 'application/json',
    headers: { 'x-attempts': attempts },
  })
  await channel.waitForConfirms()
  channel.ack(msg)
}

async function start() {
  if (!process.env.RABBITMQ_URL) {
    console.error('[worker] RABBITMQ_URL is not set')
    process.exit(1)
  }
  if (emailProvider() === 'none') console.warn('[worker] no email provider configured, emails will be skipped')

  while (!stopping) {
    try {
      current = await connectQueue()
      const { connection, channel } = current
      await channel.prefetch(5)
      console.info(`[worker] waiting for emails on ${emailQueue()}`)
      await channel.consume(emailQueue(), (msg) => {
        if (msg) handle(channel, msg).catch((error) => console.error('[worker]', error?.message || error))
      })
      await new Promise((resolve) => {
        connection.once('close', resolve)
        connection.once('error', (error) => console.error('[worker] connection error:', error?.message || error))
      })
      if (!stopping) console.warn('[worker] connection closed, reconnecting in 5s')
    } catch (error) {
      console.error('[worker] cannot reach RabbitMQ:', error?.message || error)
    }
    current = null
    if (!stopping) await wait(5000)
  }
}

async function stop() {
  stopping = true
  if (current) await current.connection.close().catch(() => {})
  process.exit(0)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
start()
