# Keepalive

Keepalive is an iMessage-native follow-up agent built with Photon. It watches for open loops, remembers what you promised, and nudges you before a thread goes stale.

## What is in this repo

- A Next 16 app with the submission site and an operator console.
- `app/api/keepalive/*` routes that run the actual command parser and follow-up logic.
- `scripts/keepalive-agent.ts`, a Photon watcher process for macOS that can read Messages, close loops when replies arrive, and send reminders back into iMessage.
- A JSON-backed state store at `.keepalive/state.json` for pending follow-ups.

## Local app

```bash
npm run dev
```

Open `http://localhost:3000`.

On non-macOS machines the console runs against seeded mock threads so the agent logic is still testable.

## Photon setup

Install dependencies:

```bash
npm install
```

Grant Full Disk Access to the terminal or IDE that will run the watcher:

1. Open macOS System Settings.
2. Go to `Privacy & Security`.
3. Add your terminal or IDE to `Full Disk Access`.

## Agent scripts

Inspect runtime readiness:

```bash
npm run agent:doctor
```

Run the live watcher:

```bash
KEEPALIVE_CONTROL_CHAT="chat-or-contact-id" npm run agent:watch
```

Recommended env vars:

- `KEEPALIVE_CONTROL_CHAT`: the chat used to send commands to Keepalive.
- `KEEPALIVE_NOTIFY_TO`: where reminders and status messages should be sent. Defaults to `KEEPALIVE_CONTROL_CHAT`.
- `KEEPALIVE_ACCEPT_OWN_COMMANDS=true`: optional. Allows parsing your own outgoing messages in the control thread.
- `KEEPALIVE_USE_MOCK_DATA=true`: forces mock data even on macOS.
- `KEEPALIVE_DEBUG=true`: turns on Photon debug logging.
- `KEEPALIVE_STORE_PATH`: custom path for the persisted loop store.
- `OPENAI_API_KEY`: optional. Enables structured OpenAI promise extraction and higher-quality draft generation.
- `KEEPALIVE_OPENAI_MODEL`: optional. Defaults to `gpt-5-mini`.
- `KEEPALIVE_OPENAI_BASE_URL`: optional. Useful if you proxy OpenAI traffic internally.

## Example commands

- `remind me to follow up with Danny on Friday if no reply`
- `did I reply to Kartik`
- `who have I been ignoring this week`
- `what did I promise Bridget`
- `draft a warm check in for Uncle Raj`
- `forwarded recruiter message: Hey, just checking whether you can send over the deck before Friday.`

## Current scope

The live agent now handles:

- follow-up reminders
- reply checks
- neglected-thread scans
- promise summaries with OpenAI fallback support
- warm check-in drafts with OpenAI fallback support
- forwarded-message analysis
- snooze, edit, and cancel controls for active loops in the web console

Photon remains the source of truth for thread state. The OpenAI layer is optional and only upgrades extraction and drafting.
