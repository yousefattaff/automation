# AccountAI CRM — progress so far

Last reviewed: **2026-10-28**

**Status: the 11 capstone workflows and database schema are implemented locally. Live operation has not been verified.** The workflow and outbound checks pass. An earlier database run passed, but today's rerun could not start because its local test dependencies are missing. A separate product-ingestion export also needs a wiring correction before use.

This document covers the AccountAI capstone in `capstone/`. Use the [setup guide](capstone/README.md) for configuration instructions and test payloads, and the [original plan](capstone/PROJECT-PLAN.md) for the intended architecture. Unchecked tasks below mean completion has not been verified in this workspace.

## What has been built

All 11 workflow exports exist in [capstone/workflows](capstone/workflows), begin inactive, and target n8n **2.44.6**. The descriptions below describe the implemented behavior, not confirmed live executions.

| Workflow | Implemented behavior |
| --- | --- |
| 01 — CRM Manager | Reads a Drive-dropped `ICP.pdf` or supplied ICP text; coordinates six sub-workflow tools, CRM updates, outreach drafts, and a result summary. |
| 02 — Lead Qualifier | Accepts an authenticated ElevenLabs tool request; scores budget, authority, need, and timeline (BANT); stores qualification; routes hot/warm/cold leads; returns spoken text. |
| 03 — Prospecting | Uses Firecrawl MCP search/scrape evidence to return prospects; supports optional Hunter email enrichment. |
| 04 — RevOps | Extracts and validates lead data, then creates or updates companies and contacts through a database transaction. |
| 05 — SDR | Creates Gmail outreach drafts for eligible contacts, supports a specific contact scope, and records draft receipts. |
| 06 — Product Expert RAG | Retrieves product evidence from Supabase and returns an answer with sources or reports missing information. |
| 07 — Demo Booker | Checks Calendar availability, creates a booking, updates the deal, sends confirmation, and notifies through Pushover. |
| 08 — MCP Lookup Contact | Exposes a contact lookup tool with company and latest qualification details. |
| 09 — MCP Create Deal | Exposes deal creation for an existing contact, with protection against duplicate requests. |
| 10 — Stale Deal Follow-up | Finds stale open deals, creates follow-up drafts, saves receipts, and sends a summary; includes manual and daily triggers. |
| 11 — Global Error Handler | Handles explicit errors and failed executions, redacts error text, logs to Supabase, and attempts a Pushover alert. |

Supporting work completed:

- [Supabase schema](capstone/supabase-schema.sql): six tables, CRM functions, generated BANT categories, access restrictions, repeat-request handling, booking/follow-up tracking, and a 1536-dimensional vector store.
- [Setup guide](capstone/README.md): import instructions, credentials, environment settings, voice/MCP configuration, test payloads, and recovery limitations.
- [ICP sample](capstone/assets/ICP.pdf) for the manager's Drive trigger.
- [Workflow validator](capstone/scripts/validate-workflows.cjs), [outbound behavior tests](capstone/tests/outbound-behavior.cjs), and [database tests](capstone/scripts/test-database.cjs).

## What has actually been verified

| Check | Latest evidence | Scope and limits |
| --- | --- | --- |
| Workflow validation | **PASS — 2026-10-28:** all 11 workflows, zero errors and zero warnings. [Report](capstone/validation/workflow-validation.json). | JSON/Code/expression syntax, connections, sub-workflow interfaces, and installed n8n 2.44.6 node parameter schemas. Does not run the workflows against external services. |
| Outbound behavior | **PASS — 2026-10-28:** 12 checks. | Tests selected prospecting, RevOps, and SDR code paths: evidence handling, input normalization, contact scope, recipients, enrichment failure, and partial results. No live model calls or Gmail writes. |
| Database behavior | **Earlier PASS — 2026-10-26:** 13 checks. [Report](capstone/validation/database-validation.json). | Unmodified migration ran twice in PGlite PostgreSQL with pgvector and simulated Supabase roles. Covers upserts, BANT boundaries, rollback, replay handling, booking ownership, stale tracking, vector retrieval, and denied anonymous access. |
| Database rerun today | **Could not start — 2026-10-28.** | `@electric-sql/pglite` was missing from the expected test runtime. The script also requires `@electric-sql/pglite-pgvector`. The earlier report remains historical evidence; no new database pass is claimed. |
| Live integrations and full run | **Not verified.** | No confirmed run across hosted Supabase/PostgREST, model APIs, Google services, Firecrawl, ElevenLabs, MCP clients, and Pushover. |

## What needs to be done

### 1. Finish local setup prerequisites

- [ ] Restore the database test dependencies: `@electric-sql/pglite` and `@electric-sql/pglite-pgvector`. The earlier report used PGlite 0.5.11. The test expects modules under `%TEMP%\accountai-capstone-validation\node_modules`, or the directory specified by `CAPSTONE_TEST_MODULES`.
- [ ] Rerun the database test and obtain a fresh passing report.
- [ ] Correct the separate [product-ingestion export](workflows/02-product-rag-ingest.json): connect `Get products from Google Sheets` **main → Supabase Vector Store main**, removing its main connection to `Default Data Loader`. Preserve the loader's `ai_document` and embedding node's `ai_embedding` connections to the vector store. This defect was confirmed on 2026-10-28; this export is outside the 11-workflow capstone validator.

### 2. Configure the intended n8n and Supabase instances

- [ ] Select the target n8n instance/project and confirm version compatibility. Check existing workflow IDs before importing; repeated imports can update matching IDs.
- [ ] Apply [supabase-schema.sql](capstone/supabase-schema.sql) to the intended Supabase project and verify its tables/functions. Review compatibility first if that project already contains older CRM tables.
- [ ] Import all 11 capstone workflows. Verify the manager's six child links, qualifier-to-booker link, MCP tool targets, explicit error-handler calls, and Error Workflow settings after import.
- [ ] Assign OpenRouter, Supabase, OpenAI embeddings, Google Drive, Gmail, Google Calendar, and Pushover credentials in the relevant nodes. Assign Google Sheets credentials in the ingestion workflow.
- [ ] Configure Firecrawl MCP URL/authentication, voice webhook Header Auth, and MCP trigger Bearer Auth. Configure Hunter only if enabling enrichment.
- [ ] Set `SUPABASE_URL`, `ICP_FOLDER_ID`, `PUSHOVER_USER_KEY`, and `FIRECRAWL_MCP_URL`. Review optional `CALENDAR_ID`, `BOOKING_TIMEZONE`, and `HUNTER_ENABLED`, plus environment access for n8n and any separate task runners.
- [ ] Verify the chosen chat model supports tools and structured output. The exported OpenRouter model is `meta-llama/llama-3.3-70b-instruct`; that model ID does not guarantee free usage. Confirm model and embedding costs before running.
- [ ] Provide a reachable HTTPS production endpoint for ElevenLabs and remote MCP clients, with MCP streaming supported by any proxy.

### 3. Load knowledge and connect voice/MCP

- [ ] Import the corrected ingestion workflow, configure the spreadsheet using [Products.xlsx](week2/Products.xlsx), and load product content into `knowledgebase` with 1536-dimensional `text-embedding-3-small` embeddings.
- [ ] Verify stored content/embeddings and add useful source metadata. Avoid duplicating documents when rerunning insert-only ingestion.
- [ ] Configure an ElevenLabs conversational server tool to POST to workflow 02 with the matching auth header. Map conversation evidence and contact fields, and speak the returned `speech` field.
- [ ] Configure the MCP client with the actual production URLs and auth tokens for workflows 08/09. Confirm both tools can be listed and invoked.

### 4. Run live acceptance tests

Use the payloads and expected results in [the setup guide](capstone/README.md). Use controlled test contacts and a test calendar for steps that send confirmations or create bookings.

- [ ] **RevOps:** save a lead twice; verify the same contact/company IDs and preserved lifecycle status.
- [ ] **Prospecting:** verify returned prospects and source URLs against actual Firecrawl responses; check optional enrichment failures.
- [ ] **SDR:** create a scoped draft; verify recipient, saved receipt, no repeat draft, and no drafts for an explicit empty contact list.
- [ ] **Product Expert:** verify a supported answer against ingested products and an explicit missing-information response for an unsupported question.
- [ ] **Qualification:** verify stored BANT results and spoken output; exercise hot/warm/cold paths and repeat-request handling.
- [ ] **Demo booking:** verify a free slot, busy/no-availability paths, CRM updates after event creation, confirmation/notification receipts, and replay recovery.
- [ ] **MCP:** invoke lookup/create-deal from the configured client; verify matching results, missing-contact errors, and repeated/changed request handling.
- [ ] **Stale follow-up:** verify one draft for an eligible stale deal, no duplicate on rerun, and no action for closed or ineligible deals.
- [ ] **Error handler:** verify redacted logs and notifications for explicit errors and failed production executions.
- [ ] **Full manager run:** upload a new `ICP.pdf` to the watched folder or supply ICP text; verify the actual research → contact save → scoped draft sequence and compare the final summary with saved records.
- [ ] **Full voice run:** complete an ElevenLabs conversation through qualification and, when requested, demo booking.
- [ ] Record execution IDs, expected/actual results, and any required fixes; rerun affected checks after fixes.

### 5. Enable ongoing operation after verification

- [ ] Publish the required triggers for controlled endpoint tests when their dependencies are configured. Enable ongoing Drive and scheduled processing after the relevant acceptance checks pass.
- [ ] Confirm the daily follow-up schedule and booking timezone. Workflow 10 is configured for 09:00 Africa/Cairo.
- [ ] Verify recovery procedures before concurrent use. Gmail/Calendar writes cannot be atomic with Supabase: a failure after an external write may require reconciling receipts before retrying. Current booking logic also has no lock across separate deals competing for one calendar slot.

## Commands to resume local validation

Run from `D:\Dev\N8N`; the database command requires the dependencies described above.

```powershell
node capstone/scripts/validate-workflows.cjs
node capstone/tests/outbound-behavior.cjs
node capstone/scripts/test-database.cjs
```

The next practical steps are to restore the database test runtime and correct the ingestion connection, then configure the live services and start with the RevOps test. Successful end-to-end operation remains the completion criterion.
