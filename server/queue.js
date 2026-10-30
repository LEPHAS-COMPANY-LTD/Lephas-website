import amqp from 'amqplib'

export const emailQueue = () => process.env.EMAIL_QUEUE || 'lephas.emails'

export const queueEnabled = () => Boolean(process.env.RABBITMQ_URL)

export async function connectQueue() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL, { timeout: 8000 })
  const channel = await connection.createConfirmChannel()
  const queue = emailQueue()
  await channel.assertQueue(`${queue}.failed`, { durable: true })
  await channel.assertQueue(queue, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `${queue}.failed` },
  })
  return { connection, channel }
}

export async function publishEmail(message) {
  const { connection, channel } = await connectQueue()
  try {
    channel.sendToQueue(emailQueue(), Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json',
      timestamp: Math.floor(Date.now() / 1000),
    })
    await channel.waitForConfirms()
  } finally {
    await connection.close().catch(() => {})
  }
}
