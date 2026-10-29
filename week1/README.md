# Week 1 -- AUTOMATE

**Theme:** foundations of agentic AI, the n8n editor, integrations, JSON,
expressions, webhooks, and your first real agent.

**Project:** `Equity Portfolio Rebalancer.json` -- a form-triggered agent that
reads a portfolio from Google Sheets, looks up prices, decides trades, writes
them back, then emails and push-notifies you.

**Decks:** `n8n W1D1.pptx` ... `n8n W1D5.pptx`
**Assets:** `Equity Portfolio Rebalancer.json`, `portfolio.xlsx`

> Classroom loop for each day: **Read -> Build -> Break -> Explain.**
> Rebuild workflows yourself first; only diff against the exported JSON after.

---

## Day 1 -- Welcome, agents, and n8n

**Watch:** `n8n W1D1.pptx`

**One idea to own:** *An agent runs tools in a loop to reach a goal.*
(Anthropic: "an LLM controls the workflow"; Sam Altman: "systems that do work
for you independently".)

**Read for:**
- What an LLM is vs what an "agent" is.
- What n8n is (Berlin, 2019, fair-code license, cloud or self-host).
- The 3-week roadmap: Automate -> Accelerate -> Amplify.
- Cost: n8n cloud ~$24/mo after trial, OpenAI min $5, OpenRouter free.

**Build:**
- Complete `SETUP.md`.
- Get "first n8n AI Agent live": a trigger -> AI Agent -> Chat Model, run it.

**Break:** remove the model from the agent. Watch it fail. Re-add it.

**Explain back:**
- Why is a plain LLM call not yet an "agent"?
- What does the fair-code license let you do and not do?

---

## Day 2 -- Prompting, the 5 tricks + 1 trap, and terminology

**Watch:** `n8n W1D2.pptx`

**The 5 tricks and 1 trap** (this is the heart of agentic AI):
1. Illusion of memory -- LLMs are stateless; you resend the conversation.
2. Thinking / reasoning -- asking for reasoning changes the answer.
3. Chaining LLMs -- one model's output becomes the next model's input.
4. Tools -- the model emits a request to call something real (e.g. a price API).
5. The loop -- model -> tool -> result -> model -> ... -> final answer.
- **The trap:** role-playing agents as people instead of dividing work to
  *solve the problem* and evaluate each step.

**Also read for:** the three-level map of n8n cloud -- Dashboard/Admin,
Instance/Home, Workflow/Canvas/Editor.

**Terminology to memorize:** Node, Connection, Workflow, Execution, Template.

**Build:** create a workflow with a manual trigger and an AI Agent; make the
agent call one tool (any HTTP tool).

**Break:** give the agent a wrong tool description and see it choose badly.
Fix the description. This is why tool descriptions matter.

**Explain back:**
- With a hand-trace, walk through the 5 steps of "the loop" for a stock-price
  question.
- What is the "human trap" and how do you avoid it?

---

## Day 3 -- Navigating n8n cloud + integrations recap

**Watch:** `n8n W1D3.pptx`

**Read for:**
- Where executions, credentials, and templates live.
- Integrations are optional and swappable; check the docs; patience required.

**Build:** a 3-node workflow that runs on a schedule and hits one API. Run it,
then open the execution log and read each node's input/output.

**Break:** reorder nodes; predict the failure before running.

**Explain back:**
- The difference between a Dashboard URL and an instance URL.
- How to inspect what data left one node and entered the next.

**Resources from `res.pdf`:** if the Gmail tool shows "Human Review", you chose
the wrong Gmail tool.

---

## Day 4 -- JSON, expressions, auth patterns

**Watch:** `n8n W1D4.pptx`

**JSON in 4 steps:** key/value pairs -> object `{}` -> array `[]` -> nesting.
Watch for: double quotes only, lowercase `true`/`false`, no trailing comma.

**Expressions:** double-curly `{{ }}` values computed at run time.
- `{{ $json.name }}` -- pull a field from the incoming item.
- `{{ $json.address.city }}` -- dot into nested objects.
- `{{ $node["My Previous Node"].json }}` -- reach an earlier node by name.
- `{{ JSON.stringify($json) }}` -- flatten to text (e.g. to feed an LLM).

**Auth patterns, easy -> hard:**
- Easy: API key.
- Medium: pre-configured OAuth2 (Google Sheets, Gmail) -- one click.
- Hard: full custom OAuth2 -- patience and thick skin.

**Build:** a Set/Edit node; generate a value with an expression; pass it on.

**Break:** try `$json.name` where the incoming item is an array. Predict, then
look at what `$json` actually resolves to.

**Explain back:**
- Why does `{{ }}` exist instead of just typing values?
- When would you use `JSON.stringify($json)`?

**Resources from `res.pdf`:** Pushover needs a priority above "low" to make a
sound; for Slack, do NOT set a Signing Secret, and keep "Connect using Socket
Mode" DISABLED.

---

## Day 5 -- Webhooks, node types, items, and the project

**Watch:** `n8n W1D5.pptx`

**New ideas:**
- **Webhook** = a URL that triggers your workflow when someone hits it (vs an
  endpoint you call).
- **Node types:** core node (trigger/action), sub-node (a tool), cluster node
  (root + sub-nodes, e.g. AI Agent).
- **Items:** data flows as an *array of items*; expressions run per item;
  `$json` is short for `$input.item.json`; sub-nodes always resolve to the
  **first item**.

**Build -- the Equity Portfolio Rebalancer** (`portfolio.xlsx`):
1. `On form submission` trigger.
2. AI Agent with a prompt asking for a rebalance instruction.
3. Tools: Google Sheets (read), Marketstack (prices), Google Sheets (write x2),
   Pushover (notify), Gmail (email).
4. Agent steps: read portfolio -> fetch prices -> update table -> decide
   rebalancing -> update table -> re-read -> refine -> email + push.

**Break:** run it with a nonsensical instruction and an instruction that asks it
to sell more than you hold. Does the agent refuse gracefully? Add a guard.

**Explain back:**
- Why does the agent re-read the sheet before finishing?
- Where exactly does `$json` mean "first item only" in this workflow?

**If stuck:** the official prompt is in `res.pdf`. Prefer building from scratch;
if you get desperate, import `Equity Portfolio Rebalancer.json` and update
credentials + email address.

---

## Week 1 exit criteria

- [ ] I can run the rebalancer from the form and read the execution trace.
- [ ] I can explain node / connection / workflow / execution / item in my own words.
- [ ] I can write nested expressions without looking them up.
- [ ] I can describe the 5 tricks + 1 trap from memory.
- [ ] I hit at least one integration error and fixed it by reading the docs.
