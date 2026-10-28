import { closePool } from '../server/db.js'
import { runMigrations } from '../server/migrations.js'

runMigrations()
  .then((count) => console.log(count === 0 ? 'Database is up to date.' : `Applied ${count} migration(s).`))
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(closePool)
