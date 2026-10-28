# Tests

Owner: QA lead.

- `api/`: automated API tests with Node's built-in test runner. They start the real API against a test database.
- `e2e/`: Playwright (planned): visitor submits a request; admin logs in and replies.

## Running the API tests

1. Create an **empty** Postgres database just for tests, for example `lephas_test`. The tests wipe it on every run.
2. Put its connection string in `.env` as `TEST_DATABASE_URL`.
3. Run `npm test`.

Without `TEST_DATABASE_URL` the tests are skipped. Test cases are listed in `docs/qa/test-plan.md`.
