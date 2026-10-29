# Progress Tracker

Tick as you go. One line per day in the log is enough to restart quickly.
Works for any pace (see `LEARNING-PATH.md` section 6).

Started: ____  Target finish: ____  Chosen pace: ____

---

## Setup

- [ ] n8n cloud account created and instance reachable
- [ ] One LLM credential saved (OpenAI or OpenRouter)
- [ ] Sanity check passed (trigger + Set + LLM node ran once)
- [ ] Google account connected (Sheets at minimum)

---

## Week 1 -- AUTOMATE

- [ ] W1D1 -- agents + n8n intro; first live agent
- [ ] W1D2 -- prompting, 5 tricks + 1 trap, terminology
- [ ] W1D3 -- cloud navigation, integrations recap
- [ ] W1D4 -- JSON in 4 steps, expressions, auth patterns
- [ ] W1D5 -- webhooks, node types, items

**Project 1 -- Equity Portfolio Rebalancer**
- [ ] Form trigger works
- [ ] Agent reads portfolio + fetches prices
- [ ] Agent writes rebalance decisions back
- [ ] Email + push notification received
- [ ] I can hand-trace one full execution

---

## Week 2 -- ACCELERATE

- [ ] W2D1 -- ElevenLabs intro
- [ ] W2D2 -- two voice patterns + HTTP deep dive
- [ ] W2D3 -- RAG, embeddings, semantic search, agentic RAG
- [ ] W2D4 -- RAG data ingest + Supabase
- [ ] W2D5 -- question answering + voice

**Project 2 -- Product Expert Voice Agent**
- [ ] Supabase `knowledgebase` table + `match_documents` created
- [ ] Products ingested via Edit Fields mapping
- [ ] Retrieval answers real product questions
- [ ] Voice round-trip works
- [ ] Hallucination guardrail tested with an off-catalogue question

---

## Week 3 -- AMPLIFY

- [ ] W3D1 -- self-hosted vs cloud, local LLMs
- [ ] W3D2 -- advanced integrations
- [ ] W3D3 -- MCP + structured outputs
- [ ] W3D4 -- context engineering, sub-agents, lethal trifecta, evals
- [ ] W3D5 -- capstone build

**Project 3 -- Multi-agent sales capstone**
- [ ] Prospecting sub-agent built
- [ ] RevOps sub-agent stores leads in Pipedrive
- [ ] SDR sub-agent drafts outbound emails
- [ ] BDM orchestrator runs from a Drive-dropped `ICP.pdf`
- [ ] Account Executive deal-recording sub-agent works
- [ ] Account Executive demo-booking sub-agent works
- [ ] Eval written and run (metric + pass/fail recorded)

---

## "Explain it back" self-check

Answer out loud, no notes. A blank means "go back".

- [ ] What is an agent? (tools in a loop to reach a goal)
- [ ] The 5 tricks + 1 trap
- [ ] Node vs sub-node vs cluster node
- [ ] Why `$json` differs inside a sub-node
- [ ] Endpoint vs webhook; GET vs POST
- [ ] Embedding = point in space; semantic search
- [ ] Traditional RAG vs agentic RAG
- [ ] The two phases of a RAG pipeline
- [ ] Context engineering vs prompt engineering
- [ ] When to split a sub-agent (and the cost)
- [ ] MCP: host / client / server, and the current transport
- [ ] The lethal trifecta
- [ ] The hallmarks of a strong agentic solution (evals)

---

## Session log

| Date | Day | Did | One thing still confusing |
| --- | --- | --- | --- |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
