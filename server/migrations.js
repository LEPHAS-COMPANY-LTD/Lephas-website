import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { query, transaction } from './db.js'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations')

export async function runMigrations(log = console.log) {
  await query(`create table if not exists schema_migrations (
    filename text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  )`)
  const applied = new Map((await query('select filename, checksum from schema_migrations')).rows.map((r) => [r.filename, r.checksum]))
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  let count = 0
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    const checksum = crypto.createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex')
    if (applied.has(file)) {
      if (applied.get(file) !== checksum) {
        throw new Error(`${file} was changed after it was applied. Add a new migration file instead of editing it.`)
      }
      continue
    }
    await transaction(async (tx) => {
      await tx.query(sql)
      await tx.query('insert into schema_migrations (filename, checksum) values ($1, $2)', [file, checksum])
    })
    log(`Applied ${file}`)
    count += 1
  }
  return count
}
