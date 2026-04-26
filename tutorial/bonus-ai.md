# Bonus Chapter: Generating tests with AI

In this chapter,
we will learn how to use AI coding assistants together with Playwright’s **Agent CLI** and **MCP server**
to speed up test planning and test implementation for the Trello-like app you have been automating throughout this tutorial.

This chapter assumes you have worked through the earlier chapters:
you have Playwright configured under the [`app`](../app/) directory,
you understand locators and assertions,
and you are familiar with behaviors such as resetting data via `POST /api/reset`.

For the underlying features and trade-offs,
see Playwright’s documentation for the [Agent CLI](https://playwright.dev/agent-cli/introduction)
and [MCP](https://playwright.dev/mcp/introduction).


## Why handwriting everything is slow

Writing good end-to-end tests is valuable,
but it is also deliberate work.

You must clarify the behavior under test,
choose stable locators,
add meaningful assertions,
handle test data,
and keep everything maintainable as the app changes.
That context switching—product rules, DOM details, and Playwright APIs—adds up,
especially when you are sketching many scenarios at once.

None of that disappears when you bring in AI.
What changes is **how fast you get to a first draft**:
a structured test plan,
a runnable spec file,
or a recorded exploration you can refine.


## How AI coding assistants help

Modern coding agents (for example Claude, Cursor, GitHub Copilot, and similar tools)
can read your repository,
run commands,
and propose edits in place.
When you pair them with Playwright’s agent-focused tooling,
they can:

* Explore the app in a browser and summarize what they see in an accessibility snapshot.
* Propose **test plans** (bulleted scenarios, data variants, edge cases).
* Turn those plans into **TypeScript tests** that match your existing layout under `tests/`.
* Reuse patterns you already established—`test.beforeEach`, page objects, `request` for `/api/reset`, and so on.

You stay responsible for reviewing locators, assertions, and flakiness.
Treat AI output as **accelerated scaffolding**, not a substitute for judgment.


## Playwright Agent CLI vs Playwright MCP

Playwright offers two complementary integrations for LLM-driven workflows:

| | **Agent CLI** | **MCP** |
| --- | --- | --- |
| **How the model drives the browser** | The agent runs shell commands such as `playwright-cli open …` and `playwright-cli snapshot` | The MCP client exposes tools like `browser_navigate` and `browser_snapshot` with structured parameters |
| **Typical strength** | **Coding agents** working in a repo: concise snapshots, skills on demand, easy to script in terminal | **Agentic loops** in the IDE: exploratory passes, multi-step browsing, tight tool UI |
| **Token use** | Generally **lower** per step (short CLI output, skills loaded when needed) | Generally **higher** (tool schemas plus snapshots in context) |
| **Default browser mode** | Headless-oriented workflow | Often **headed** so you can watch the browser |

Neither replaces the other.

* Use the **Agent CLI** when your main goal is **generating or editing test files** beside a large codebase while keeping context small.
* Use **MCP** when you want the assistant to **explore like a user**, iterate visually, or chain many browser steps in a conversational loop.

For **this tutorial repository**—a focused app under `app/`, tests in `app/tests/`, and patterns you already learned—the **Agent CLI** is usually the best first choice:
your agent spends more tokens on *your* TypeScript and less on long-running browser tool chatter.
MCP is still excellent for **spikes** (“click through the board and list every state you can reach”) and for teams that prefer all browser control through MCP tools.

The sections below show how to add each one and how to steer your assistant toward **test plans** and then **test scripts** for the local Trello-like app at `http://localhost:3000/`.


## Part 1: Playwright Agent CLI (skills)

Official overview: [Agent CLI introduction](https://playwright.dev/agent-cli/introduction).  
Installation details: [Agent CLI installation](https://playwright.dev/agent-cli/installation).

The CLI is a small command-line interface for browser automation aimed at coding agents.
It uses **accessibility snapshots with element refs** (similar in spirit to Playwright’s codegen output) so the model can issue deterministic `click`, `fill`, and `press` commands without guessing coordinates.

### Prerequisites

* **Node.js 20 or newer** (required by current Playwright agent tooling).
* The tutorial app installed and startable from [`app`](../app/) (see [Chapter 3](03-first-test.md)).
* Optional but recommended: complete through [Chapter 8](08-learning-more.md) so you have a mental list of behaviors to ask the AI to cover.

### Install the CLI and browsers

You can install globally:

```sh
npm install -g @playwright/cli@latest
playwright-cli --help
```

Or invoke without a global install:

```sh
npx playwright-cli --help
```

Install browsers explicitly if you want to front-load downloads:

```sh
playwright-cli install-browser
```

On Linux CI images you may need system dependencies; see the [installation guide](https://playwright.dev/agent-cli/installation) for `--with-deps` and related flags.

### Install skills for richer agent context

Skills teach your coding agent what commands exist without pasting huge help text into every prompt:

```sh
playwright-cli install --skills
```

Point your agent at the installed skill files according to the tool you use (many agents pick up repository-level skill or rules directories automatically).

If you skip skills, you can still tell the agent explicitly:

```txt
Use playwright-cli for browser steps. Run `playwright-cli --help` when unsure.
```

### Using the CLI from VS Code, Cursor, and Claude-flavored agents

The integration pattern is the same everywhere: **the agent runs terminal commands** in your project. However, you will need to tailor the skills so that your chosen coding agent can use them correctly.

* **VS Code (GitHub Copilot Chat / agent mode):**  
  Open the [`app`](../app/) folder as the workspace root.
  Ask the agent to run `playwright-cli` commands in the integrated terminal from that directory.
  Ensure Copilot is allowed to run suggested shell commands when prompted.

* **Cursor:**  
  Prompt Cursor to add rules to the project to use the CLI with skills,
  and verify the skills configuration is successful under *Cursor Settings*.
  Open the [`app`](../app/) folder (or the repo root, but be consistent about paths).
  In Agent mode, the assistant can run the same `playwright-cli` commands.
  If you use project rules or skills, mention that tests live under `tests/` and the dev server URL is `http://localhost:3000/`.

* **Claude Code and similar terminal-first agents:**  
  Run from the directory where your tests live.
  The CLI supports named sessions via environment variable so parallel conversations do not fight over one browser:

  ```sh
  PLAYWRIGHT_CLI_SESSION=trello-tutorial playwright-cli open http://localhost:3000/
  ```

  See [Environment setup](https://playwright.dev/agent-cli/installation#environment-setup) in the installation docs.

### Suggested workflow: test plan, then test file (Trello app)

1. **Start the app** (unless you rely on `webServer` in `playwright.config.ts`):

   ```sh
   cd app
   npm start
   ```

2. **Ask for a test plan** first—keep it grounded in your product:

   ```txt
   We are testing the Vue Trello-like app at http://localhost:3000/ in this repo under `app/`.
   Data can be reset with POST http://localhost:3000/api/reset using Playwright's `request` fixture.
   Propose a concise test plan (bullet list) for: creating two boards, starring one, deleting the other,
   and verifying the home page list. Note negative cases if the UI allows them.
   Do not write code yet.
   ```

3. **Ask the agent to explore with the CLI, then implement** one scenario:

   ```txt
   Using playwright-cli, open http://localhost:3000/, reset data if needed via API, then walk through
   the "create board → add list → add cards → go home" flow. Use snapshots to pick stable locators.
   Then add a new Playwright TypeScript test under `tests/` that matches our existing style:
   `test.beforeAll` or `beforeEach` for /api/reset, clear test name, getByRole/getByPlaceholder,
   and expect assertions. Reuse patterns from our existing trello spec if present.
   ```

4. **Review** the result like any teammate’s pull request: flakiness, missing assertions, hard-coded waits, and locator quality.

### When the CLI shines in this project

* Generating **additional** `*.spec.ts` files after Chapter 8’s ideas (delete card, move card, starred boards).
* Keeping **browser output short** while the model edits real files in `app/tests/`.
* Running in **CI-friendly headless** flows once you trust the commands.


## Part 2: Playwright MCP (browser tools for agents)

Official overview: [MCP introduction](https://playwright.dev/mcp/introduction).  
Installation: [MCP installation](https://playwright.dev/mcp/installation).  
VS Code specifics: [MCP client: VS Code](https://playwright.dev/mcp/clients/vscode).

The Playwright MCP server speaks the [Model Context Protocol](https://modelcontextprotocol.io/).
Your MCP client (VS Code, Cursor, Claude Desktop, and others) exposes tools such as `browser_navigate`, `browser_snapshot`, and `browser_click`.
The model reads **structured accessibility snapshots** with element refs—no vision model required for basic flows.

### Install the MCP server

The standard configuration uses `npx` to always resolve the latest server:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Exact file locations depend on the client; follow the [installation](https://playwright.dev/mcp/installation) page and your product’s “MCP servers” UI.

**VS Code:** you can register the server from the command line:

```sh
code --add-mcp '{"name":"playwright","command":"npx","args":["@playwright/mcp@latest"]}'
```

Then use GitHub Copilot agent chat with MCP tools enabled, per [VS Code MCP documentation](https://code.visualstudio.com/docs/copilot/chat/mcp-servers).

**Cursor:** open your MCP settings, add a server with the same `npx` / `@playwright/mcp@latest` command and args, and enable it for Agent or chat features that support MCP.

**Claude Desktop (and similar):** add the same server block to your MCP configuration file for that application, then restart the app so the Playwright tools appear in the tool list.

### Suggested workflow: explore, then codify

1. Start the Trello app at `http://localhost:3000/`.
2. In your MCP-enabled assistant, try a **narrow exploration prompt**:

   ```txt
   Use the Playwright MCP tools. Navigate to http://localhost:3000/, call POST /api/reset first via browser_evaluate
   or by explaining that I will reset manually—then open the board creation flow.
   List the key interactive elements you see after each snapshot.
   ```

   Adjust the reset step to match your comfort level: calling `fetch` from `browser_evaluate` is possible,
   but many teams prefer Playwright’s `request` fixture inside generated tests instead of doing reset purely through MCP.

3. Ask for a **written test plan** from that exploration (scenarios, preconditions, expected results).

4. Ask for a **`tests/*.spec.ts` implementation** that follows this tutorial’s conventions:
   API reset in a hook, no fixed `waitForTimeout`, prefer role and placeholder locators, assert user-visible outcomes.

### When MCP shines in this project

* **Exploratory** passes before you commit to a test design.
* Teaching the model **what the UI actually does** on your machine (especially if you customized the app).
* Demonstrations where a **headed** browser helps you learn alongside the agent.

MCP tool calls often carry **more context per step** than CLI snapshots; for long sessions, watch token usage and prune chat history if your client allows.


## Putting it together responsibly

* **You** still own correctness, stability, and CI behavior.
* Align AI-generated tests with what you learned in [Chapter 5](05-behavior-breakdown.md) and [Chapter 6](06-scaling-tests.md): clear behavior focus, parallel-safe data, and meaningful assertions.
* Prefer **one flow per test** with explicit setup over giant specs that encode half the product.
* After the AI drafts a file, run:

  ```sh
  cd app
  npx playwright test --ui
  ```

  ...and tighten anything that fails or flakes.

Used well, the Agent CLI and MCP turn Playwright into **shared infrastructure** between you and your coding agent:
the same accessibility snapshots and automation model,
whether the next command is a terminal one-liner or an MCP tool call.
