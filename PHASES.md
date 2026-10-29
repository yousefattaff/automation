# n8n -- 8-Hour Phase Plan

You already know the theory, so this skips the teaching and gives you 9 phases
with time boxes. Each phase is: **Goal / Read (skim only) / Do / Done when.**
Total ~7h30 + 30 min buffer = 8 hours.

Rule: a phase ends when its "Done when" is true, not when the clock runs out.
If you're ahead, start the next phase. If you're behind, cut from the bottom
(P8 -> P9 first), never from the project phases.

---

## P0 -- Setup (0:30)

**Goal:** n8n reachable + one LLM credential.
**Read:** `SETUP.md`.
**Do:** n8n cloud instance; OpenAI or OpenRouter key; connect Google account.
**Done when:** a trigger -> Set -> LLM node runs once and shows an execution.
- [ ] P0 done

---

## P1 -- n8n + the agent loop (0:45)

**Goal:** internalize node/connection/workflow/execution + "agent = tools in a
loop"; build one tool-calling agent.
**Read (skim):** `week1/n8n W1D1.pptx`, `n8n W1D2.pptx` (tricks 3-5 + the loop).
**Do:** manual trigger -> AI Agent -> a tool (any HTTP request) -> run it;
watch the loop in the execution trace. Shortcut: import `workflows/00-hello-agent.json`.
**Done when:** the agent calls your tool and folds the result into its answer.
- [ ] P1 done

---

## P2 -- Data plumbing (0:45)

**Goal:** JSON, expressions, items, webhooks, node types.
**Read (skim):** `week1/n8n W1D4.pptx`, `n8n W1D5.pptx`.
**Do:** a Webhook workflow with `Respond to Webhook`; hit it; then send a JSON
body to it and read `$json` / `$json.nested.field` in a following node.
**Done when:** you can predict what `$json` is in a normal node vs a sub-node
(first item only).
- [ ] P2 done

---

## P3 -- Project 1: Equity Portfolio Rebalancer (1:15)

**Goal:** ship project 1.
**Read (skim):** `week1/n8n W1D5.pptx` last slide; `res.pdf` page with the prompt.
**Do:** copy `week1/portfolio.xlsx` to Google Sheets, then build:
form trigger -> AI Agent -> Google Sheets (read) + Marketstack (prices) +
Sheets (write x2) + Gmail + Pushover. Let the agent re-read and refine.
**Done when:** one form submit produces trades written back + email + push.
- [ ] P3 done
- Fallback if stuck >25 min: import `week1/Equity Portfolio Rebalancer.json`,
  fix credentials + email, reverse-engineer it.

---

## P4 -- Voice + APIs (0:45)

**Goal:** the two voice patterns + HTTP/API fluency.
**Read (skim):** `week2/n8n W2D1.pptx`, `n8n W2D2.pptx` (integration patterns,
GET/POST, generic nodes).
**Do:** create an ElevenLabs account. Open `week2/voice.html`, make a Webhook +
Respond to Webhook workflow, paste the Test URL in, record -> send -> hear it.
Shortcut for the orchestration pattern: import `workflows/04-elevenlabs-voice-bridge.json`;
for a full record -> STT -> agent -> TTS round-trip, import `workflows/05-voice-roundtrip.json`.
**Done when:** `voice.html` round-trips audio through n8n.
- [ ] P4 done

*(Stretch, only if ahead: point an ElevenLabs agent's tool at your n8n webhook,
per the "ElevenLabs orchestration" pattern.)*

---

## P5 -- RAG + Supabase ingest (1:15)

**Goal:** embeddings, two-phase RAG, vector store, data ingest.
**Read (skim):** `week2/n8n W2D3.pptx`, `n8n W2D4.pptx`.
**Do:** Supabase project; run the SQL from `res.pdf` (`knowledgebase` +
`match_documents`, `vector(1536)`); in n8n read `week2/Products.xlsx`, map with
Edit Fields, embed, insert. Remember: Supabase URL in n8n **without** `/rest/v1`.
Shortcut: import `workflows/02-product-rag-ingest.json`.
**Done when:** a vector query returns sensible product chunks.
- [ ] P5 done

---

## P6 -- Project 2: Product Expert (0:45)

**Goal:** ship project 2.
**Read (skim):** `week2/n8n W2D5.pptx`.
**Do:** agent + Supabase retrieval tool; answer product questions; then wire
voice (TTS/STT in n8n, or ElevenLabs agent -> n8n webhook).
Shortcut: import `workflows/03-product-expert-rag.json` (chat) and
`workflows/04-elevenlabs-voice-bridge.json` (voice tool endpoint).
**Done when:** you ask a question by voice and get a spoken answer.
- [ ] P6 done
- Bonus check: ask an off-catalogue question; confirm the agent declines.

---

## P7 -- Advanced: self-host, MCP, context (0:45)

**Goal:** the Week 3 concepts, fast.
**Read (skim):** `week3/n8n W3D3.pptx`, `MCP overview.pptx`, `n8n W3D4.pptx`.
**Do:** 20 min -- run self-hosted n8n in Docker (commands in `res.pdf`), demo,
stop. 25 min -- read MCP (host/client/server, Streamable HTTP, the 3 n8n ways)
and context engineering (context window, sub-agents, lethal trifecta, evals).
**Done when:** you can state, in one sentence each, what MCP standardizes and
why sub-agents exist.
- [ ] P7 done

---

## P8 -- Capstone: multi-agent sales (1:15)

**Goal:** ship the capstone core.
**Read (skim):** `week3/n8n W3D5.pptx`.
**Do:** build BDM orchestrator -> Prospecting sub-agent (Firecrawl) + RevOps
(-> Pipedrive) + SDR (Gmail drafts); trigger from a Drive-dropped `ICP.pdf`.
Shortcut: import `workflows/01-prospecting-sub-agent.json`, then relink it in
the BDM tool node (see `workflows/README.md`).
**Done when:** dropping `ICP.pdf` in the watched folder creates leads + drafts.
- [ ] P8 done
- Fallback: import `week3/Workflows - Business Development/*.json`, fix
  credentials/token.
- Known fixes: use newer Pipedrive **Tool** nodes; string->int with
  `{{ parseInt($("AI Agent").item.json.output.id) }}`; if OOM, drop Hunter, keep
  Firecrawl, tighten the prompt, use `gpt-5.4-mini`.

---

## P9 -- Stretch: Account Executive + evals (0:30, optional)

**Goal:** finish the extension and prove it.
**Do:** build the two Account Executive sub-agents from
`week3/Workflows - Account Executive/` (deal recording + demo booking, both
webhook-triggered). Write one eval: 3 fixed ICP inputs, a pass criterion, run 3x.
**Done when:** a demo gets booked from an HTTP request and your eval has a
recorded pass/fail.
- [ ] P9 done

---

## Phase map at a glance

```
P0 Setup
P1 Agent loop ......... P2 Data plumbing
P3 PROJECT 1 (Portfolio Rebalancer)
P4 Voice + APIs
P5 RAG + Supabase ..... P6 PROJECT 2 (Product Expert)
P7 Advanced (MCP/context/self-host)
P8 CAPSTONE (multi-agent sales)
P9 Stretch (Acct Exec + evals)
```

Cut order if time runs out: P9, then P7's self-host demo, then voice wiring in
P6. Never cut P3 or P8 -- those are the two headline deliverables.

Full reference (decks, prompts, gotchas, glossary) stays in `LEARNING-PATH.md`
and the `week*/README.md` files if you want to look anything up mid-build.
