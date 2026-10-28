import { one } from './db.js'
import { HttpError } from './http.js'

export async function rateLimit(bucket, limit, windowSeconds) {
  const row = await one(
    `insert into rate_limits (bucket, window_start, hits)
     values ($1, now(), 1)
     on conflict (bucket) do update set
       hits = case when rate_limits.window_start < now() - make_interval(secs => $2) then 1 else rate_limits.hits + 1 end,
       window_start = case when rate_limits.window_start < now() - make_interval(secs => $2) then now() else rate_limits.window_start end
     returning hits`,
    [bucket, windowSeconds],
  )
  if (row.hits > limit) {
    throw new HttpError(429, 'Too many requests. Please wait a few minutes and try again.')
  }
}
