# SMHY web changes — 16 November 2026 scope

Prepared on `feat/smhy-16nov-scope`; not deployed. Automatic Vercel Git deployment is disabled for this branch. The matching backend branch contains the API, migration and detailed requirement mapping.

## Where to use the changes after deployment

- **Customer profile → Record follow-up & next action:** choose any future Melbourne date. Dates outside the early 3-day / 5-day window automatically request manager review. The form preserves a failed request's draft and reuses its ID. Pending requests display “Awaiting Manager Approval”. Historical enquiries use their source date, so importing/reassigning them does not restart the clock.
- **Today → Manager approval queue:** review follow-up dates, losses, consent requests and duplicate merges in one section. Rejecting a date requires a reason and returns a replacement-date task to the current salesperson. All sources share the same loss categories.
- **Customer profile → Communication consent:** opt out or restore contact with a reason. Managers apply changes directly. Staff restoration requests wait for review; opt-out takes effect immediately. SMS sending is blocked while opted out.
- **Customer profile → CRM Activity & Diary Notes:** manager badges and distinct styling identify manager notes. Filter by role, person and action type, including video sent/viewed. Saved notes use request IDs. Touch-friendly note and date forms remain available on the floor; a completed action without a replacement offers the next action prompt.
- **Leads → current consultant-name filter → Bulk reassignment:** find a former owner by exact name (for example George Jacobs), select cards from the current page, choose an eligible salesperson or manager, and reassign up to 100. Per-card conflicts remain selected for review. Dates and history stay intact; pending/open tasks follow the current owner. Managers, including Quoc, can assign to themselves.
- **My Sales Day:** only due-today and overdue open tasks appear. Completed, future and awaiting-approval actions leave this list while remaining in the diary/history. Team activity labels distinguish completed updates from work still to action.
- **Leads table:** fixed column proportions and wrapped customer/contact/vehicle text improve readability. Responsive card layouts remain available.
- **Add prospect:** a debounced phone/email check warns about an existing identity before submission. Existing cards are shown only when the user has access. Conflicting/manual duplicates still enter manager review; compatible imported enquiries attach to the existing card in the backend.
- **Customer profile → SMS & Photos / Videos:** larger upload chunks, safe completion retries, progress feedback and automatic attachment when rendering finishes reduce repeated work. Video-view status appears on the profile and in its activity feed. Ready recordings satisfy record/upload-video tasks; successful sends satisfy send/share-video tasks. Unrelated calls and pending approvals remain open.
- **Customer profile → Good Showroom video library:** attach a manager-approved generic clip without uploading it again. Each attachment gets its own customer link and view counts. Managers must explicitly confirm that a published clip contains no customer information; they can withdraw it later.
- **Today → Hyundai Connex → Contact-release manager:** choose Mark or another eligible manager using the exact Connex salesperson mapping. The worker releases masked contacts through that manager inside Connex while retaining the Sales Floor salesperson assignment.

## Verification and release boundaries

Frontend component/handler tests, type checking and a local Webpack production build validate this code. The local Windows Turbopack PostCSS worker did not start, so the supported Webpack builder was used for build verification. No new production test leads, messages, merges, account changes or Connex updates were made.

Live Connex contact release, registered-device push delivery and real video transfer speed require post-deployment verification. The duplicate-fold script is prepared in the backend and has not been run on production. No release or migration is automatically executed by pushing this branch.
