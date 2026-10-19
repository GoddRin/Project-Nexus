# Viber site reports -> Nexus assistant

Turns the company Viber group chats into redacted daily digests that the Nexus assistant can
search, so it can answer questions like "has the adit 2 compressor broken down before?" or
"what was poured at the weir this week?" with the actual dates and wording from site.

Only **company** groups are ingested. The "LOVE THE PHILIPPINES" group is not company related and must
not be exported. (Authorised by the project manager for daily and weekly project data.)

## What it costs: nothing required

| Part | Cost |
| --- | --- |
| Reading the export, redaction, keyword structuring | Free, runs locally, no AI |
| AI structuring (`--ai`) | Free tier of Google AI Studio (`GOOGLE_AI_API_KEY`); about 1 request per day of chat. Optional: without it the keyword rules are used |
| Embeddings and search | Already in use by the assistant (Gemini embeddings, Supabase pgvector). Roughly 1-3 chunks per day, a few hundred a year |
| Viber | Free. The built-in *Email chat history* export needs no paid tool |

Caveat: Google's free tier may use submitted text to improve its products. That is why only redacted
work lines go to it, and safety lines never do (see below). If that is not acceptable, leave off `--ai`.

## Getting the data in (no bot, no terms-of-service risk)

1. In Viber, open the group, then the group info screen, then **Email chat history**, and send it to yourself.
2. Save the attachment (`.csv` or `.txt`), and do not forward it onwards.
3. On your own computer:

   ```bash
   export VIBER_ALIAS_SALT=<long random secret, keep it, never commit it>
   npx tsx scripts/viber/ingest.ts export.csv --out digests.json            # keyword rules only
   npx tsx scripts/viber/ingest.ts export.csv --out digests.json --ai       # plus free Gemini structuring
   VIBER_INGEST_TOKEN=... npx tsx scripts/viber/ingest.ts export.csv --upload https://<site> --project <projectId>
   ```

Check `digests.json` before uploading the first time. Do it weekly (or daily) with the newest export;
re-uploading a day replaces that day, so there are no duplicates.

## Privacy rules (enforced in code)

- **Redaction happens on your machine**, before anything is uploaded. The raw export never reaches the server.
- Sender names become stable aliases (`Staff-3F9A`) from a secret salt; nobody can be looked up from them.
- Phone numbers, e-mail addresses and links are removed. Names written in the text (the group members' names,
  and "Sir/Mang/Kuya + Name") are replaced.
- Non-work chatter (greetings, stickers, birthdays, thanks, emoji-only lines) is dropped.
- **Injury and safety-event lines are split off.** They are stored as `SiteReport.safetyText` and as `restricted`
  chunks that only ADMINISTRATOR, PROJECT_MANAGER and SAFETY can retrieve. They are structured by keyword rules only
  and never sent to an AI service.
- General work digests are readable by ADMINISTRATOR, PROJECT_MANAGER, ENGINEER, SUPERVISOR, SAFETY and WAREHOUSE
  (`lib/viber/access.ts`). Everyone else does not see them in assistant answers.
- Uploading needs `VIBER_INGEST_TOKEN`, or a signed-in ADMINISTRATOR / PROJECT_MANAGER.

Limits to know about: redaction is rule-based, so an unusual nickname written without a title can slip
through. Read the first few digests, and add names to the group-member list if one is missed. Treat injuries as the
project's safety record, not the assistant's: it quotes what was reported and tells people to confirm with ESH.

## Files

- `lib/viber/parse.ts` reads the export (CSV, bracketed and dashed text; day-first dates, Manila time)
- `lib/viber/redact.ts` aliases, scrubbing, work-only filter, safety flag
- `lib/viber/digest.ts` / `structure.ts` per-day grouping, AI or keyword structuring, digest text
- `lib/viber/access.ts` who may read what
- `app/api/site-reports/ingest/route.ts` upload endpoint; `lib/rag/index.ts` `indexSiteReport`; `lib/rag/search.ts` access filter
- `scripts/viber/sample-export.csv` synthetic chat for trying the pipeline

## Not built yet

- Giving the Atlas/SCIC map AI a "latest site digest" per area (it does not use the document search today).
- Weekly roll-up summaries, recurring-fault detection, and photo captions from the chat images.
- A Site Reports page in the dashboard, and a retention rule (suggested: raw exports deleted after upload).
