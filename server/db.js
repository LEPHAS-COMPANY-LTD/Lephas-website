import pg from 'pg'

pg.types.setTypeParser(1082, (value) => value)

let pool = null

function getPool() {
  if (pool) return pool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to your .env file or Vercel environment variables.')
  }
  const local = /localhost|127\.0\.0\.1|host=\/|@\/|\?host=/.test(connectionString)
  pool = new pg.Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 3),
    idleTimeoutMillis: 10000,
    ssl: local || /sslmode=disable/.test(connectionString) ? undefined : { rejectUnauthorized: false },
  })
  return pool
}

export function query(text, params = []) {
  return getPool().query(text, params)
}

export async function one(text, params = []) {
  const result = await query(text, params)
  return result.rows[0] ?? null
}

export async function many(text, params = []) {
  const result = await query(text, params)
  return result.rows
}

export async function transaction(work) {
  const client = await getPool().connect()
  try {
    await client.query('begin')
    const result = await work({
      query: (text, params = []) => client.query(text, params),
      one: async (text, params = []) => (await client.query(text, params)).rows[0] ?? null,
      many: async (text, params = []) => (await client.query(text, params)).rows,
    })
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
