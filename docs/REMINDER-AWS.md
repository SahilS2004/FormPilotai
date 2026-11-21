# Reminder deployment

The same dispatcher runs locally and in AWS. Only the clock and the object store change.

## What a reminder does

1. The dashboard writes one row in Postgres (`reminders`) with a deadline, a lead time, and a policy: notify, fill a draft, or submit.
2. A dispatcher wakes about every minute, claims rows whose fire time has arrived, and moves them to `auto_action_in_progress`.
3. **Notify only** finishes in the dispatcher. It writes a `notifications` row and marks the reminder completed.
4. **Fill** and **submit** stay in progress. The Chrome extension claims the row, opens the page, fills it from the knowledge base, and submits only when every required field is at or above the confidence threshold.

Fire time is `deadline - lead time`.

## AWS

| Piece | Service | Role |
| --- | --- | --- |
| Knowledge-base files | S3 `formpilot-kb` | Original PDF, Word, PowerPoint, text, and images |
| Records and vectors | RDS PostgreSQL 16 with pgvector | `documents`, `document_chunks.embedding vector(768)`, `reminders`, `notifications` |
| Clock | EventBridge Scheduler, `rate(1 minute)` | Starts a dispatch |
| Queue | SQS `formpilot-reminders` | One message per tick so a slow run does not overlap |
| Dispatcher | Lambda `formpilot-reminder-dispatcher` | Runs `processDueReminders` |
| Fill and submit | The user's Chrome extension | Opens the tab, fills, and maybe submits |
| Later, unattended submit | ECS Fargate task with Playwright | Same claim API, no browser required |

The Lambda environment is `DATABASE_URL`, `S3_BUCKET`, and `AWS_REGION`. It does not need a public IP if RDS and S3 are in the same VPC. The extension calls `GET /api/reminders?actionable=1` and `PATCH /api/reminders` with `{ "claim": true }`.

## Local

`docker compose up -d postgres localstack` is the AWS stand-in:

- Postgres is RDS.
- LocalStack on port 4566 is S3. The app creates the `formpilot-kb` bucket on the first upload. Credentials are `test` / `test`.
- The Next.js process runs the dispatcher every 15 seconds (`instrumentation.ts`). Opening the dashboard also triggers a pass, because `GET /api/reminders` claims anything that is due.

In AWS, replace the LocalStack endpoint with real S3 (omit `S3_ENDPOINT`) and replace the in-process loop with EventBridge Scheduler → SQS → Lambda running the same `processDueReminders` function.

```bash
docker compose up -d postgres localstack
pnpm --filter @formpilot/web dev
```

Create a reminder whose deadline is a minute away and whose lead time is 5 minutes. It fires on the next pass. A notify-only reminder completes by itself. Fill and submit wait for the extension, which checks once a minute.
