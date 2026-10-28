# QA test plan

Owner: QA lead. Tests run on the Vercel preview link of each pull request.
Automated API tests: `npm test` (needs `TEST_DATABASE_URL`, see `tests/README.md`).

## Core test cases

| ID | Scenario | Expected result | Automated |
| --- | --- | --- | --- |
| QA-01 | Submit the Start a project form with all valid fields | Request page opens with reference number, request saved, team email and client confirmation sent | API |
| QA-02 | Submit with empty required fields | Clear error under each field, nothing saved | API |
| QA-03 | Submit with invalid email | Email error shown, nothing saved | API |
| QA-04 | Submit the form twice quickly | Button disabled while sending, one request saved | Manual |
| QA-05 | Send many requests from one IP | Later requests rejected with 429 | API |
| QA-06 | Open Portfolio and Hire talent | Items load; empty and error states look correct | Manual |
| QA-07 | Open `/admin` without logging in | Login screen, no data visible | Manual |
| QA-08 | Call an admin endpoint without a session | 401 response | API |
| QA-09 | Log in and change a request's status | Status updates and persists after refresh | API |
| QA-10 | Open a page that does not exist | Friendly 404 page | Manual |
| QA-11 | Open every page on a 360px phone | No sideways scrolling, menu works, buttons tappable | Manual |
| QA-12 | Run Lighthouse on Home | 90 or more for performance, accessibility and SEO | Manual |
| QA-13 | Hire a developer from their profile | Request is linked to that developer | API |
| QA-14 | Client replies on their request page, staff replies in admin | Both see the conversation; client gets an email | API |
| QA-15 | Open a request link with a wrong token | "Could not find" message, nothing revealed | API |
| QA-16 | Staff or admin tries to edit team profiles or contact settings | Not allowed (403); only the CTO can | API |
| QA-17 | CTO adds a profile with photo, GitHub and LinkedIn, then publishes it | Appears on Hire talent and About (owners) | Manual |
| QA-18 | "Lost your link?" on Track my request | Email with links arrives | Manual |
| QA-19 | Create a quotation from a request, send it | Client sees it on their request page and by email; totals, tax and discount are correct | API |
| QA-20 | Client accepts a quotation, admin converts it to an invoice and sends it | Invoice has the same lines; request status becomes "Project started" | API |
| QA-21 | Record part and full payments on an invoice | Status goes to Partially paid, then Paid; balance due is correct | API |
| QA-22 | Print an invoice or save it as PDF | Only the invoice prints, on A4, with logo, payment instructions and totals | Manual |
| QA-23 | Staff tries to create or change a quote or invoice | Not allowed (403) | API |
| QA-24 | A sent invoice passes its due date | Shown as Overdue | API |

## Bug reports

Every bug is a GitHub Issue labelled `bug` with: page or endpoint, steps to reproduce,
expected result, actual result, screenshot, browser and device, severity (Critical, High, Medium, Low).

## Release sign-off checklist

- [ ] QA-01 to QA-24 pass on the production-like preview link
- [ ] No open Critical or High bugs
- [ ] Tested on Chrome, Firefox and Safari, and on a real phone
- [ ] Request emails arrive and are not in spam
- [ ] Environment variables set in Vercel, no secrets in the repo
- [ ] Favicon, page titles and meta descriptions on every page
