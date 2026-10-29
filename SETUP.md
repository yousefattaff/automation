# Setup -- before Week 1 Day 1

Do this once. Reuse the same credentials for all three weeks. Nothing here is
required except **n8n + one LLM**; everything else is optional and swappable.

Total time: 30-60 minutes.

---

## 1. n8n (required)

Start with **n8n cloud** so you don't fight infrastructure while learning.

1. Go to `https://n8n.io` and start the free trial.
2. Note your instance URL, e.g. `https://<your-name>.app.n8n.cloud`.
3. Bookmark the dashboard: `https://app.n8n.cloud/dashboard`.
4. In Week 3 you will optionally run **self-hosted** n8n locally (Docker) --
   don't do it now.

Free option later: `npx n8n` also runs a local instance on `http://localhost:5678`.

---

## 2. An LLM (required -- pick one)

**Option A -- OpenAI (paid, simplest).**
Create an API key at `https://platform.openai.com`. Minimum ~$5 balance.
Add it as an n8n credential ("OpenAI account").

**Option B -- OpenRouter (free models).**
Create a key at `https://openrouter.ai`. Then go to
`https://openrouter.ai/settings/privacy` and turn ON:

- Enable free endpoints that may train on inputs
- Enable free endpoints that may publish prompts

Add it to n8n. If you hit rate limits, use the model `openrouter/free`.

> You can mix providers. The course swaps LLMs on purpose to show the agent
> pattern is provider-independent.

---

## 3. Integrations used across the course

Tick only what you plan to use. Most have free tiers.

| Service | Used in | Purpose | Notes |
| --- | --- | --- | --- |
| Google Sheets | W1, W2 | Portfolio + product data | Pre-configured OAuth2, one click in n8n cloud |
| Google Drive | W3 | Watch folder for `ICP.pdf` | Same Google account works |
| Google Calendar | W3 | Demo booking sub-agent | |
| Gmail | W1, W3 | Trade email / outbound email | Pick the tool without "Human Review" |
| Pushover | W1, W3 | Phone push notifications | Set priority above "low" so it makes a sound |
| Marketstack | W1 | End-of-day equity prices | Free tier is enough |
| Telegram / Slack / Discord | W1 | Extra notification channels | Optional; keep Slack "Socket Mode" OFF |
| Supabase | W2 | Vector store (Postgres + pgvector) | Run the SQL in `res.pdf` |
| ElevenLabs | W2, W3 | TTS/STT and voice agents | Free tier works; pick non-premium voices |
| Firecrawl | W3 | Web search + scrape | Node actions get renamed across versions |
| Hunter.io | W3 | Find prospect emails | Optional; can cause memory errors if kept on |
| Pipedrive | W3 | CRM for leads/deals | Newer n8n has simple Pipedrive Tool nodes |
| Ollama | W3 | Local LLMs | Only if you go self-hosted |

---

## 4. Data files to copy into your own accounts

- `week1/portfolio.xlsx` -- copy into your own Google Drive and open as a
  Google Sheet; the rebalancer reads from it.
- `week2/Products.xlsx` -- the fake product catalogue for the RAG ingest.
- `week3/ICP.pdf` -- the Ideal Customer Profile dropped into a shared Drive
  folder for the capstone's Drive trigger.

---

## 5. Optional: n8n inside your editor

`n8n-extension/` is a local VS Code / Antigravity extension that embeds the n8n
canvas in an editor tab and pings server health.

- Open the folder in VS Code, run the extension in dev mode (or install the
  `.vsix`), then use `Ctrl+Alt+N` to open n8n.
- Point `n8n.url` at your instance (default `http://localhost:5678`).

This is a convenience only; the browser tab works fine.

---

## 6. Sanity check before starting

You are ready when you can do all of these:

- [ ] Log into n8n and see an empty workflow canvas.
- [ ] Add a Manual Trigger + a "Set" node + an LLM node and run it once.
- [ ] Explain what an execution is.
- [ ] Have at least one LLM credential saved.
- [ ] (Optional) Connected Google Sheets successfully.

Then open `week1/README.md` and start Day 1.
