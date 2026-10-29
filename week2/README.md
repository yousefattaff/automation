# Week 2 -- ACCELERATE

**Theme:** voice agents with ElevenLabs, APIs in depth, and RAG (retrieval
augmented generation) all the way to agentic RAG.

**Project:** `Product Expert Voice Agent` -- a Supabase-backed knowledge base of
products, retrieved by an agentic RAG agent, reachable by voice through
ElevenLabs.

**Decks:** `n8n W2D1.pptx` ... `n8n W2D5.pptx`
**Assets:** `Products.xlsx`, `voice.html`

> Loop: **Read -> Build -> Break -> Explain.** Build first, diff later.

---

## Day 1 -- Introducing ElevenLabs

**Watch:** `n8n W2D1.pptx`

**Read for:**
- ElevenLabs (founded 2022, audio generation leader).
- Creative Platform vs Agents Platform -- know which you're using.
- Generous free tier; the paid tier is ~$5/mo.

**Build:** create a free ElevenLabs account. Generate one clip via their UI.

**Break:** try a premium voice vs a free voice. Note the difference.

**Explain back:**
- What is the difference between the Creative and Agents platforms?
- Which one will the course use for the voice agent, and why?

---

## Day 2 -- Two integration patterns + HTTP deep dive

**Watch:** `n8n W2D2.pptx`

**The two voice+workflow patterns:**
- **n8n orchestration:** everything lives in n8n; call ElevenLabs TTS/STT APIs.
  Simple, one place, switchable APIs -- but more latency.
- **ElevenLabs orchestration:** the voice agent lives in ElevenLabs and calls
  n8n through a tool. Low latency, best of both, advanced voice features.

**API terminology (reviewed all course long):**
- "Calling an API" = making an HTTP request to an **endpoint** (a URL).
- A **webhook** is an endpoint *you* expose so others notify you.
- **Methods:** GET fetches, POST sends (with a body).

**Generic nodes:**
- `HTTP Request` -- call any URL endpoint.
- `Webhook` -- a trigger with a **Test URL** and a **Production URL**; returns
  immediately unless a `Respond to Webhook` node runs.

**Build:** open `voice.html` in a browser, create a Webhook workflow with a
`Respond to Webhook`, paste the Test URL into `voice.html`, record, and send.

**Break:** remove `Respond to Webhook` and re-send. Note how the browser
behaves now.

**Explain back:**
- Test URL vs Production URL.
- When does a webhook return immediately vs wait?

**Resources from `res.pdf`:** `voice.html` is the official record -> webhook ->
play harness. ElevenLabs free plans: choose non-premium voices ("Bella"
works); TTS/STT API access may not be on the free plan, in which case skip
n8n-orchestration and use the ElevenLabs-orchestration pattern, which is more
common in practice anyway. ElevenLabs agents may not call tools until published.

---

## Day 3 -- RAG: the idea and the embedding model

**Watch:** `n8n W2D3.pptx`

**The small idea:** add information to the prompt -- "here is context you might
find useful".

**The big idea:** automatically retrieve only the *relevant* subset of data,
then put it in the prompt.

**Embedding model:** a special model that turns language into a list of numbers
(a **vector**) -- think of it as a point in space. Similar meanings land close
together. That gives you **semantic search**: find text whose vectors are near
the question's vector.

**Traditional RAG vs Agentic RAG:**
- Traditional: chat -> vector retrieval -> LLM responds (fixed pipeline).
- Agentic: chat -> an **agent** with vector retrieval *plus* more tools ->
  the LLM controls the workflow and the response.

**Build:** no big build today. Instead, experiment with embeddings: embed 5
sentences and find the nearest pair (any playground is fine).

**Break:** feed the same text to the embedding model twice and diff the vectors.

**Explain back:**
- Why is "a point in space" a good analogy for an embedding?
- What extra freedom does agentic RAG give you over traditional RAG?

---

## Day 4 -- Data ingest into Supabase (the RAG pipeline)

**Watch:** `n8n W2D4.pptx`

**Two phases of RAG:**
1. **Data ingest:** source -> extract -> transform -> chunk & vectorize ->
   vector store.
2. **Question answering:** chat -> vectorize -> agent -> LLM response.

**Business setup:** a client has products in a huge Google Sheet; build an
expert that answers in-depth questions about them.

**Supabase:** cloud Postgres with pgvector. More advanced than n8n's built-in
simple vector store, and there's copy-paste SQL for it.

**Build -- data ingest:**
1. Create a Supabase project.
2. Run the SQL from `res.pdf`: the `knowledgebase` table and the
   `match_documents` function (uses `vector(1536)` in two places -- change both
   if you use a different encoder).
3. In n8n: read `Products.xlsx` (Google Sheets), map fields with an **Edit
   Fields** node, generate embeddings, and insert into Supabase.
4. When entering the Supabase URL in n8n, strip the `/rest/v1` suffix.
5. Shortcut: import `workflows/02-product-rag-ingest.json` and reselect the
   spreadsheet + credentials.

**Break:** ingest one product with a deliberately wrong field mapping and see
what retrieval returns. Then fix it.

**Explain back:**
- Which phase is which, and what does each phase's output look like?
- Why does field mapping (Edit Fields) matter so much for retrieval quality?

---

## Day 5 -- Question answering, then voice

**Watch:** `n8n W2D5.pptx`

**Build:**
1. Query phase: an agent with a Supabase vector-retrieval tool, given the
   product question.
2. Ask several real questions; tune the number of retrieved documents.
3. Wire voice: either call ElevenLabs TTS/STT from n8n, or point an ElevenLabs
   agent's tool at your n8n webhook.
4. Shortcut: `workflows/03-product-expert-rag.json` (chat) and
   `workflows/04-elevenlabs-voice-bridge.json` (webhook for the voice agent).

**Break:** ask a question the catalogue does NOT answer and check whether the
agent admits it or hallucinates. Add a system-prompt guardrail.

**Explain back:**
- The full path from spoken question to spoken answer.
- Where you would put evals for retrieval quality.

**Stretch:** the course notes that next week you'll gain the skills to monitor a
shared folder and ingest every file automatically.

---

## Week 2 exit criteria

- [ ] I can explain both voice+workflow integration patterns and their tradeoffs.
- [ ] I can explain GET vs POST and endpoint vs webhook without notes.
- [ ] I ingested `Products.xlsx` into Supabase and can query it.
- [ ] I know the difference between RAG and agentic RAG.
- [ ] I have asked my product expert a question and gotten a spoken answer.
