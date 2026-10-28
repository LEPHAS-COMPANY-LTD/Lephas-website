import { closePool, one } from '../server/db.js'
import { hashPassword } from '../server/auth.js'

async function main() {
  const [, , fullName, email, password] = process.argv
  if (!fullName || !email || !password) {
    console.error('Usage: npm run create-cto -- "Full Name" cto@example.com "a-strong-password"')
    process.exitCode = 1
    return
  }
  if (password.length < 10) {
    console.error('The password must be at least 10 characters.')
    process.exitCode = 1
    return
  }
  const existing = await one("select email from users where role = 'cto'")
  if (existing) {
    console.error(`A CTO account already exists (${existing.email}). There can only be one.`)
    process.exitCode = 1
    return
  }
  const user = await one(
    "insert into users (full_name, email, role, password_hash) values ($1, $2, 'cto', $3) returning email",
    [fullName.trim(), email.trim().toLowerCase(), await hashPassword(password)],
  )
  console.log(`Created the CTO account for ${user.email}. Log in at /admin.`)
}

main()
  .catch((error) => {
    console.error(error.code === '23505' ? 'That email already has an account.' : error.message)
    process.exitCode = 1
  })
  .finally(closePool)
