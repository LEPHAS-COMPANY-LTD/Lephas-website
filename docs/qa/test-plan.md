# QA test plan

Owner: QA lead. Tests run on the Vercel preview link of each pull request.

## Core test cases

| ID | Scenario | Expected result |
| --- | --- | --- |
| QA-01 | Submit quote form with all valid fields | Success message, quote saved, team email and client confirmation sent |
| QA-02 | Submit with empty required fields | Clear error under each field, nothing saved |
| QA-03 | Submit with invalid email | Email error shown, nothing saved |
| QA-04 | Submit the form twice quickly | Only one quote saved, button disabled while sending |
| QA-05 | Send many requests from one IP | Later requests rejected with 429 |
| QA-06 | Open the portfolio page | Projects load; empty and error states look correct |
| QA-07 | Open `/admin` without logging in | Redirected to login, no data visible |
| QA-08 | Call an admin endpoint without a token | 401 response |
| QA-09 | Log in as admin and change a quote's status | Status updates and persists after refresh |
| QA-10 | Open a page that does not exist | Friendly 404 page |
| QA-11 | Open every page on a 360px phone | No sideways scrolling, menu works, buttons tappable |
| QA-12 | Run Lighthouse on Home | 90 or more for performance, accessibility and SEO |

## Bug reports

Every bug is a GitHub Issue labelled `bug` with: page or endpoint, steps to reproduce,
expected result, actual result, screenshot, browser and device, severity (Critical, High, Medium, Low).

## Release sign-off checklist

- [ ] QA-01 to QA-12 pass on the production-like preview link
- [ ] No open Critical or High bugs
- [ ] Tested on Chrome, Firefox and Safari, and on a real phone
- [ ] Quote emails arrive and are not in spam
- [ ] Environment variables set in Vercel, no secrets in the repo
- [ ] Favicon, page titles and meta descriptions on every page
