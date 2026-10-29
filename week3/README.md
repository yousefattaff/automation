# Week 3 -- AMPLIFY

**Theme:** self-hosted n8n, advanced integrations, MCP, context engineering,
sub-agents, security, evals, and the capstone multi-agent system.

**Project:** an outbound-sales multi-agent system (the "Capstone") plus, as an
extension, an Account Executive agent.

**Decks:** `n8n W3D1.pptx` ... `n8n W3D5.pptx`, `MCP overview.pptx`
**Assets:** `ICP.pdf`, `Workflows - Business Development/`, `Workflows - Account Executive/`

> Loop: **Read -> Build -> Break -> Explain.** Prefer building from scratch;
> these JSONs are reference answers.

---

## Day 1 -- Self-hosted n8n and local LLMs

**Watch:** `n8n W3D1.pptx`

**Cloud vs self-hosted:**

| | Self-hosted | n8n cloud |
| --- | --- | --- |
| Cost | Free (fair-code) | Subscription |
| Control/privacy | Total | Less |
| Setup | Time-consuming; webhooks need tunnels; OAuth tricky | Instant; public webhooks; simple OAuth |

**Fork in the road:** commercial learners can stay on cloud; technical learners
can self-host, run a tunnel (e.g. ngrok) for webhooks, use advanced OAuth, and
optionally run local models with **Ollama**.

**Build:** run n8n self-hosted in Docker (commands in `res.pdf`, including the
`--add-host=host.docker.internal:host-gateway` variant for Ollama), do a quick
demo, then decide: stay local or return to cloud.

**Break:** stop/start the container; note that data persistence depends on how
you launched it (`--rm` means it's gone).

**Explain back:**
- Three concrete reasons to choose cloud, and three to self-host.
- Why do webhooks need a "tunnel" when self-hosted?

---

## Day 2 -- Advanced integrations

**Watch:** `n8n W3D2.pptx`

**Recap:** auth patterns (API key / pre-configured OAuth2 / full OAuth2) and
API terminology (endpoint, webhook, GET vs POST).

**Build (self-hosted):** POST a JSON body to a webhook.

**Break / gotcha:** with self-hosted n8n, an HTTP POST with `{{ $json.data }}`
may arrive blank -- use **Raw** body content type with
`application/json` and `{{ JSON.stringify($json.data) }}`. (From `res.pdf`,
confirmed by students.)

**Explain back:**
- Why does `JSON.stringify` fix the blank-body case?
- For Google Drive OAuth on self-hosted, why might you need to add yourself as
  a test user in Google Cloud Console? (Answer: the n8n.cloud app is in testing;
  add your email under `https://console.cloud.google.com/auth/audience` ->
  Test Users -> + Add user.)

---

## Day 3 -- MCP (and the real innovation)

**Watch:** `n8n W3D3.pptx` and `MCP overview.pptx`

**The honest framing:** the major innovation behind agentic AI is **not MCP** --
it is **tools**: LLMs generating tokens that describe *which tool to use* based
on *what the tool does*. MCP is a standard for tools, not a new capability.

**What MCP is:** Model Context Protocol from Anthropic -- "the USB-C port for AI
applications"; an open standard for connecting AI apps to external systems.
Easy to use someone else's tools, share yours, and connect LLMs to tools. The
game-changer is **adoption**, the interface, not the tools.

**Technicality 1 -- three pieces:** MCP **Host** (Claude, n8n, an app),
MCP **Client**, MCP **Server**.

**Technicality 2 -- three transports:** `stdio` (server on your machine),
`sse` (legacy, deprecated), **Streamable HTTP** (current).

**Three ways to use MCP with n8n:**
1. An **MCP Client** node -- use someone else's tool.
2. An **MCP Server Trigger** -- share your workflow as a tool.
3. **Instance-level MCP** -- a global setting exposing workflows on an instance.

**Also note:** n8n does not support `stdio`/local MCP, and n8n already ships
off-the-shelf Tool nodes for most major integrations, so MCP is less common here.

**Structured Outputs:** the "boring but bullet-proof" choice; often either tools
or structured outputs can reach the same business goal.

**Build:** connect an MCP Client node to a public MCP server and call one tool.

**Break:** change the tool description and watch the model's choice change.

**Explain back:**
- Say in one sentence what MCP standardizes and what it does not.
- When would you choose Structured Outputs over a tool?

---

## Day 4 -- Context engineering, sub-agents, security, evals, capstone intro

**Watch:** `n8n W3D4.pptx`

**Context engineering -- the successor to prompt engineering:**
LLMs have a limited input size (the **context window**, including the whole
conversation). More tools = more flexibility but more space; too much and the
model loses coherence and becomes unreliable. Context engineering is the art of
fitting it in perfectly: the best selection of prompts, tools, and structured
outputs for the goal.

**Sub-agents -- a core agentic pattern:**
- Split into smaller, independently testable steps.
- Reusable; optimizes the context window; easy in n8n via **sub-workflows**.
- Downsides: reduces autonomy, typically more to build (but easier to test).
- Beware the trap: don't anthropomorphize.

**Security -- the "lethal trifecta" (Simon Willison):**
1. Access to private data.
2. Ability to communicate externally.
3. Exposure to untrusted content.
Any single agent with all three is dangerous. Design so no step has all three.

**Evals -- the hallmark of a strong solution:**
- A clearly identifiable business problem.
- A metric with established success criteria.
- Rigorous testing showing the criteria are met.
- Anti-patterns: the human trap / anthropomorphizing; being solution-first
  ("I need an Agent for X"); treating generated content as the goal.

**Capstone intro:** an agentic solution that generates new business.
- **Agent 1 - Outbound Sales (Business Development Manager):** coordinates a
  Prospecting sub-agent, a RevOps sub-agent, and an SDR sub-agent.

**Build:** nothing new yet; re-read one of your earlier agents and identify the
lethal trifecta inside it.

**Explain back:**
- Context engineering in your own words.
- Why is the lethal trifecta only dangerous when all three are present?

---

## Day 5 -- Capstone build, MCP in anger, evals, wrap

**Watch:** `n8n W3D5.pptx`

**Recap:** MCP two ways -- use someone else's tool (Firecrawl, Hunter.io via MCP
Client nodes) and share your own (turn the Prospecting sub-agent into an MCP
Server, connect it to the Claude chat app). Structured outputs recap.
Context engineering + sub-agents recap. Evals recap.

### Build the Business Development Manager

Source: `Workflows - Business Development/`

1. **`Business Development Manager.json`** -- the orchestrator.
   - Trigger: Google Drive trigger watching the "ICP File Drop" folder for a
     created file.
   - Download file -> `Extract from File` (PDF) -> AI Agent.
   - Agent prompt (from the JSON): *"You are the Sales Manager Agent for an
     Accounting Software firm, AccountAI... use your Prospecting Sub-agent tool
     once to search online for leads based on the ICP. Next, for each prospect,
     use your RevOps sub-agent tool to store the info in Pipedrive. Finally,
     use your SDR sub-agent tool once to retrieve everyone in Pipedrive and
     draft an outbound sales email. Then reply with a summary."*
   - Tools (sub-workflows): `Call 'prospecting sub-agent'`,
     `Call 'RevOps Sub-Agent'`, `Call 'SDR Sub-Agent'`.
2. **`Business Development RevOps Sub-Agent.json`** -- structured lead ->
   Pipedrive. Nodes: `When Executed by Another Workflow` -> AI Agent with
   Structured Output Parser -> create organization / person / lead.
3. **`Business Development SDR Sub-Agent.json`** -- `When Executed by Another
   Workflow` -> AI Agent with Pipedrive tools (get many people) + Gmail
   (create draft).
4. **Prospecting sub-agent** -- not included as a file; build it with Firecrawl
   (search + scrape) and optionally Hunter.io for emails, feed the ICP as input.
   Shortcut: import `workflows/01-prospecting-sub-agent.json`, then relink it in
   the BDM tool node.

**Input:** `ICP.pdf` -- *"a senior member of the finance team at a mid-market
consulting firm in the US; ideally Director or VP level... senior enough to be a
decision maker, but hands-on and familiar with the pain-points."*

### Build the Account Executive agent (extension)

Source: `Workflows - Account Executive/`

1. **`Account Executive Deal Recording Sub-Agent.json`** -- Webhook trigger ->
   AI Agent checks Pipedrive for the person -> structured output -> If -> create
   a deal -> Pushover notification.
2. **`Account Executive Demo Booking Sub-Agent.json`** -- Webhook trigger ->
   agent checks Google Calendar availability, books the demo, replies via
   `Respond to Webhook`, and pushes a notification.

### Known fixes (from `res.pdf`)

- Pipedrive now has simple **Tool nodes** (create organization / person / lead)
  that make RevOps far easier than the old code route.
- If the AI Agent outputs a Person ID as a string and the IF node errors,
  convert it: `{{ parseInt($("AI Agent").item.json.output.id) }}`.
- Out-of-memory on Day 5: (1) disable Hunter MCP, keep Firecrawl only;
  (2) use the tightened system prompt (search, scrape as needed, reply with 2
  prospects and their most likely emails, no clarifying questions); (3) switch
  the model to `gpt-5.4-mini`.
- Recommended by the author: create the project from scratch; import only as a
  fallback. You must update credentials, the Pushover user token, and your name
  + Voice Agent phone number.
- Scaling note: before commercial use, make the Pipedrive query scalable
  (don't fetch everyone at once).

### Define an eval

Pick a fixed set of 3 ICB-like inputs and a success criterion -- e.g. "at least
2 of 3 runs produce 2 valid prospects with emails and reachable Pipedrive
records". Run it 3 times. That is your eval.

---

## Week 3 exit criteria

- [ ] I ran n8n self-hosted at least once (or can explain why I skipped it).
- [ ] I can explain MCP's host/client/server and the current transport.
- [ ] I can explain context engineering and when to split a sub-agent.
- [ ] I can point at the lethal trifecta in one of my own agents.
- [ ] The BDM agent runs from a Drive-dropped `ICP.pdf` end to end.
- [ ] The Account Executive agent books a demo from an HTTP request.
- [ ] I have a written eval with a metric and a pass/fail result.
