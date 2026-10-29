# n8n Learning Path -- Agentic AI Builder

A guided path through the material already sitting in this folder: the Ed Donner
course **"AI Builder with n8n -- Create Agents and Voice Agents"** (3 weeks /
15 days), the exported workflows, the data files, and the resource notes.

The goal is not "watch every slide". The goal is: **by the end you can design,
build, debug, and explain an agentic AI system in n8n, and prove it with three
working projects.**

---

## 1. How to use this path

You have two things in this folder:

1. **Material** -- the 15 slide decks (`week1/`, `week2/`, `week3/`), the
   workflow JSON exports, the spreadsheets, `voice.html`, and the official
   resource list (`res.pdf`).
2. **A tutor** -- `.agents/md/tutor.md` tells an AI agent how to walk you
   through this directory from first principles (Karpathy-style intuition,
   Ed Donner-style build-along). Open a session, point the agent at a day,
   and ask it to explain code line by line.

The path below turns the material into a repeatable loop. For every day:

> **Read -> Build -> Break -> Explain**

- **Read**: skim the day's deck. You are hunting for the one idea that is new.
- **Build**: recreate the workflow yourself. Do not import the JSON first.
- **Break**: change one thing and predict what happens. This is where learning lives.
- **Explain**: say it out loud (or to the tutor agent) in plain words. If you
  can't explain it, you don't own it yet.

Only after Build + Break should you open the matching exported JSON and diff it
against yours.

---

## 2. What is in this folder

| Path | What it is | How to use it |
| --- | --- | --- |
| `week1/` | Decks `n8n W1D1..W1D5.pptx`, `Equity Portfolio Rebalancer.json`, `portfolio.xlsx` | Week 1 material + project 1 assets |
| `week2/` | Decks `n8n W2D1..W2D5.pptx`, `Products.xlsx`, `voice.html` | Week 2 material + project 2 assets |
| `week3/` | Decks `n8n W3D1..W3D5.pptx`, `MCP overview.pptx`, `ICP.pdf`, `Workflows - Business Development/`, `Workflows - Account Executive/` | Week 3 multi-agent capstone |
| `res.pdf` | Official "RESOURCES" page (rendered to PDF) | Resource links, gotchas, SQL, Docker commands |
| `workflows/` | Importable JSON I authored to fill the gaps: hello agent, prospecting sub-agent, RAG ingest, product expert, ElevenLabs bridge | Ready-to-import starting points (see `workflows/README.md`) |
| `n8n-extension/` | A VS Code / Antigravity extension that embeds n8n in your editor | Optional convenience while building |
| `.agents/md/tutor.md` | Tutor agent instructions | Ask it to explain any file or day |
| `SETUP.md` | Accounts + environment checklist | Do this before Week 1 |
| `PROGRESS.md` | Checkbox tracker for every day | Tick as you go |

---

## 3. What you will build (the three projects)

These are the actual artifacts; the decks are just teaching.

1. **Week 1 -- Equity Portfolio Rebalancer** (`week1/Equity Portfolio Rebalancer.json`)
   A form-triggered AI agent that reads a portfolio from Google Sheets, fetches
   prices (Marketstack), decides trades, writes them back, and emails + push-notifies.
2. **Week 2 -- Product Expert Voice Agent** (voice + RAG)
   A knowledge base of products in Supabase, retrieved by an agentic RAG agent,
   reachable by voice through ElevenLabs. `week2/voice.html` is the browser
   record -> webhook -> play test harness.
3. **Week 3 -- Multi-agent outbound sales system** (capstone)
   A Business Development Manager agent that calls Prospecting / RevOps / SDR
   sub-agents as tools, plus an Account Executive agent (deal recording, demo
   booking), with MCP to reuse and share tools.

If you finish all three and can explain them on a whiteboard, you are done.

---

## 4. Prerequisites (30-60 min)

You do **not** need to code. But you do need to be comfortable with:

- **JSON** -- objects `{}`, arrays `[]`, key/value pairs, nesting.
- **HTTP basics** -- GET vs POST, endpoint, body, API key.
- **A browser + terminal** -- and the willingness to read error messages.

The decks teach JSON in Week 1 Day 4 and APIs/HTTP across Weeks 1-2, so if any
of the above is fuzzy, that is fine -- just don't skip those days.

---

## 5. Setup

See **`SETUP.md`**. Short version: create n8n cloud (free trial), OpenAI *or*
OpenRouter (free models), Google (Sheets/Drive/Calendar/Gmail), Pushover,
Marketstack, and -- for Week 2/3 -- Supabase, ElevenLabs, Firecrawl, Pipedrive.

Nothing is mandatory except n8n + one LLM. Every integration is swap-able;
the decks repeat this on purpose.

---

## 6. Pacing options

The course is 3 weeks / ~1 hour per day. Pick the pace that fits your life.

| Pace | Duration | Daily load | Best for |
| --- | --- | --- | --- |
| Sprint | 3 weeks | 1-1.5 h/day | Matching the course exactly |
| **Steady (recommended)** | 6 weeks | ~45 min/day | Working adults, real retention |
| Explorer | 10 weeks | ~30 min/day | Absolute beginners, deeper side quests |

The Steady plan: spend 2 days per course-day -- day A for Read + Build, day B
for Break + Explain + extend. Your progress tracker works for any pace.

---

## 7. Concept dependency map

```
JSON + Expressions
        |
        v
Nodes -> Connections -> Workflows -> Executions
        |
        v
Triggers (Form / Webhook) ---> HTTP Request / API integration
        |
        v
LLM basics: prompts, statelessness, chaining, tools, the loop
        |
        v
AI Agent node (cluster node) + Tools + Structured Outputs
        |
        +--> Week 1 project: Portfolio Rebalancer
        |
        v
Embeddings -> Vector store -> RAG -> Agentic RAG
        |
        +--> Week 2 project: Product Expert Voice Agent
        |
        v
Sub-workflows -> Sub-agents -> MCP (tools as a standard) -> Context engineering
        |
        +--> Week 3 capstone: multi-agent sales system
```

Each arrow is a checkpoint. If you can't draw the earlier box, go back -- the
later material assumes it.

---

## 8. Week 1 -- AUTOMATE (workflows in n8n cloud)

Project: **Equity Portfolio Rebalancer**. See `week1/README.md` for detail.

| Day | Core idea | Assets | Build / proof |
| --- | --- | --- | --- |
| W1D1 | What is an agent, what is n8n, cloud vs cost | `n8n W1D1.pptx` | First live agent; be able to say "an agent runs tools in a loop to reach a goal" |
| W1D2 | Prompting -> context engineering; 5 tricks + 1 trap; n8n terminology | `n8n W1D2.pptx` | Name node, connection, workflow, execution, template; explain the "human trap" |
| W1D3 | Navigate cloud; integrations recap | `n8n W1D3.pptx` | Create + run a 3-node workflow; know where everything lives |
| W1D4 | JSON in 4 steps; expressions; auth patterns; integrations | `n8n W1D4.pptx` | Write `{{ $json.name }}` and `{{ $json.address.city }}` from memory |
| W1D5 | Webhooks; node types; items; the project | `n8n W1D5.pptx`, `Equity Portfolio Rebalancer.json`, `portfolio.xlsx` | Build the rebalancer end to end |

**Week 1 checkpoint:** run the rebalancer from a form, watch the agent loop in
the execution view, and explain why `$json` behaves differently inside a
sub-node.

---

## 9. Week 2 -- ACCELERATE (voice agents + RAG)

Project: **Product Expert Voice Agent**. See `week2/README.md` for detail.

| Day | Core idea | Assets | Build / proof |
| --- | --- | --- | --- |
| W2D1 | ElevenLabs: products, pricing, creative vs agents platform | `n8n W2D1.pptx` | Skim; know which plan you're on |
| W2D2 | Two voice+workflow patterns; HTTP deep dive; generic nodes | `n8n W2D2.pptx`, `voice.html` | Wire a webhook and drive it from `voice.html` |
| W2D3 | RAG: the small idea, embeddings, semantic search, agentic RAG | `n8n W2D3.pptx` | Explain embedding = "a point in space for meaning" |
| W2D4 | Two phases of RAG; data ingest; Supabase; Edit Fields mapping | `n8n W2D4.pptx`, `Products.xlsx` | Ingest products into Supabase (see SQL in `res.pdf`) |
| W2D5 | Question answering + voice wiring | `n8n W2D5.pptx` | Ask the product expert a question, then ask it by voice |

**Week 2 checkpoint:** explain the difference between traditional RAG and
agentic RAG, and why an agent can choose *not* to retrieve.

---

## 10. Week 3 -- AMPLIFY (multi-agent systems + MCP)

Project: **Multi-agent outbound sales capstone**. See `week3/README.md`.

| Day | Core idea | Assets | Build / proof |
| --- | --- | --- | --- |
| W3D1 | Self-hosted vs cloud; when to go local; Ollama | `n8n W3D1.pptx` | Run self-hosted n8n in Docker (or note why you skip it) |
| W3D2 | Advanced integrations; HTTP/JSON body gotchas | `n8n W3D2.pptx` | POST JSON to a webhook correctly |
| W3D3 | MCP: host/client/server, transports, 3 ways in n8n, structured outputs | `n8n W3D3.pptx`, `MCP overview.pptx` | Say what MCP actually standardizes |
| W3D4 | Context engineering; sub-agents; the lethal trifecta; evals; capstone intro | `n8n W3D4.pptx` | Explain "context engineering is the successor to prompt engineering" |
| W3D5 | Capstone build + security + evals + wrap | `n8n W3D5.pptx`, `ICP.pdf`, `Workflows - */` | Assemble the agents; run an eval |

**Week 3 checkpoint:** build the BDM agent with three sub-agent tools, then the
Account Executive agent with a webhook entry point. Explain how data flows
across sub-workflows.

---

## 11. The session loop (use this every single day)

1. **Warm-up (3 min)** -- restate yesterday's idea without notes.
2. **Read (10 min)** -- the day's deck. Write down exactly one new concept.
3. **Build (25 min)** -- recreate the workflow on a blank canvas.
4. **Break (10 min)** -- change an input, a model, a node order; predict first.
5. **Explain (10 min)** -- talk it through to the tutor agent and let it quiz you.
6. **Log (2 min)** -- tick `PROGRESS.md`, write one line: "what still confuses me".

The last step makes the next session start instantly.

---

## 12. How to know you actually learned it (evals)

Borrowed from Week 3: strong agentic work has a **metric with success criteria
and rigorous testing**. Apply the same to yourself.

| Skill | "Green" evidence |
| --- | --- |
| Agent loop | You can hand-trace a run: prompt -> tool call -> tool result -> next call -> answer |
| n8n data model | You can explain items, `$json`, and why sub-nodes resolve to the first item |
| Integrations | You can add a new API you've never used, from docs, without a tutorial |
| RAG | You can explain ingest vs query phases and pick chunk/embedding settings |
| Sub-agents | You can split a monolith into testable sub-workflows and say why |
| Context engineering | You can shrink a context window without losing quality |
| Judgment | You can spot the "human trap": role-play agents instead of solving the problem |

If four of seven are green, you are operating at a professional level.

---

## 13. Capstone extension ideas

- Make the Pipedrive query scalable (don't fetch everyone at once).
- Add evals as a workflow that runs a fixed set of ICPs and scores outputs.
- Swap the LLM provider and compare cost/latency/quality.
- Add a memory layer and test whether it actually helps the business goal.
- Harden against the **lethal trifecta**: private data + external comms +
  untrusted content, all in one agent.

---

## 14. Resource library (from `res.pdf`)

Official resources page (view the rendered `res.pdf` for clickable links):
`https://edwarddonner.com/2026/01/04/ai-builder-with-n8n-create-agents-and-voice-agents/`

Highlights worth keeping beside you:

- **n8n cloud** -- `https://n8n.io`
- **OpenRouter free models + privacy toggles** -- `https://openrouter.ai/settings/privacy`
  (turn on free endpoints that may train/publish prompts to use free models;
  model `openrouter/free` auto-routes if you hit rate limits)
- **Ollama (local models)** -- `https://ollama.com`
- **Supabase knowledge base SQL** -- the `knowledgebase` table plus
  `match_documents` function with `vector(1536)` (full SQL is in `res.pdf`).
  Enter the Supabase URL into n8n **without** the `/rest/v1` suffix.
- **Self-hosted n8n** -- `docker run -it --rm --name n8n -p 5678:5678 -e GENERIC_TIMEZONE="Europe/London" -e TZ="Europe/London" ...`
  (and a variant with `--add-host=host.docker.internal:host-gateway` for Ollama;
  full commands are in `res.pdf`)
- **Context engineering** -- Phil Schmid's post (linked from `res.pdf`)
- **The lethal trifecta** -- Simon Willison's post (linked from `res.pdf`)

Gotchas collected in `res.pdf` (read it once before Week 3):

- ElevenLabs free plan: pick non-premium voices; agents may not call tools
  until published; navigation changes often.
- Pipedrive: newer n8n versions have simple Pipedrive **Tool** nodes that make
  the RevOps sub-agent much easier; watch for Person ID as string vs number
  (`{{ parseInt($("AI Agent").item.json.output.id) }}`).
- Firecrawl node actions got renamed across versions ("Search" now combines
  search + full-page scraping).
- If the Gmail tool mentions "Human Review", you picked the wrong tool.

---

## 15. Mini-glossary

- **Node** -- one step; a Trigger starts a run, an Action does work.
- **Sub-node** -- a helper attached to a node (a tool, a model, a parser).
- **Cluster node** -- one root node plus its sub-nodes (e.g. the AI Agent).
- **Connection** -- a wire passing items from one node's output to another's input.
- **Workflow** -- nodes + connections that automate a process.
- **Execution** -- one run of a workflow; manual (test) or active (production).
- **Item** -- one element of the array flowing through the workflow; `$json`
  is short for `$input.item.json`.
- **Expression** -- `{{ ... }}` values computed at run time, not fixed.
- **LLM** -- a model that predicts the next tokens; stateless between calls.
- **Agent** -- an LLM running tools in a loop to reach a goal.
- **RAG** -- Retrieval Augmented Generation: put relevant data in the prompt.
- **Embedding** -- text as a vector/point; nearby points mean similar meaning.
- **Sub-agent** -- a workflow exposed as a tool that another agent can call.
- **MCP** -- Model Context Protocol; a shared standard for connecting tools.

---

## 16. Start here

1. Do `SETUP.md`.
2. Import `workflows/00-hello-agent.json` to prove your LLM works.
3. Open `week1/README.md` and run Week 1 Day 1.
4. Ask the tutor agent: *"Explain Week 1 Day 2's '5 tricks and 1 trap' and quiz me."*
5. Tick `PROGRESS.md`. Repeat.
