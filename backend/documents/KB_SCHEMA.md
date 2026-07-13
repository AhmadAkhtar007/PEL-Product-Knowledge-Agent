# PEL Knowledge Base — Schema v2.0

## Why this changed

The old schema tagged every chunk `audience: "customer"` or `audience: "technician"` and lived in two separate places — nine product files plus one standalone `pel_technician_kb.json`. That worked when the product had a customer app and a separate technician app. It stopped matching reality the moment the app became one general Product Knowledge Agent for everyone.

The problem wasn't that customer and technician content are the same thing — they aren't. A field technician's board part number is not the same kind of fact as a warranty length. The problem was gating that difference by *who's asking* instead of *how much detail they asked for*. Fixed here by moving the split down to the chunk level and making it about disclosure depth, not identity.

## New chunk shape

```json
{
  "id": "ac-error-codes-legacy-series",
  "chunk_type": "error_code",
  "hazard_level": "electrical",
  "series": "Inverter",
  "model": "Ace, Apex, Allure, Jumbo DC, Majestic, Regal, Supreme",
  "title": "Error Code Meanings — Ace / Apex / Allure / ...",
  "content_brief": "E1 means the indoor unit's room-temperature sensor isn't reporting correctly. ... contact PEL CARE or the Khidmat Markaz app to schedule one.",
  "content_detailed": "Raw technician reference table: E1 = Indoor Room Temp NTC Fault. ..."
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable identifier. Kept from the original file where the underlying fact didn't move; new ids follow `{category}-{topic}` for merged technician content. |
| `chunk_type` | yes | One of: `spec`, `warranty`, `error_code`, `diagnostic_procedure`, `installation_procedure`, `routing`, `software_troubleshooting`. The last one was added during the full manual pass for smart-TV app/software fixes (streaming lag, mirroring bugs, cursor glitches) — these aren't hardware-hazardous, but they're also not a plain spec, so they get their own type. Lets retrieval/ranking distinguish "what is this product" facts from "what's wrong and what do I do" facts. |
| `hazard_level` | yes | `none`, `electrical`, `refrigerant`. Informational tag, not a retrieval gate — see generation rule below. |
| `content_brief` | yes | Plain-language answer. **Always safe to show to anyone, always shown first.** Never contains live-voltage steps, board-replacement instructions, or refrigerant-handling steps. |
| `content_detailed` | optional | Full original technical detail — board models, flash codes, voltage/resistance values, flowcharts, vacuum procedures. Present only where the source content actually had a deeper technical layer. Omitted entirely for pure spec/warranty chunks, since there's nothing further to disclose. |

## The retrieval + generation contract (for the system prompt / router)

1. **Retrieval always searches the full corpus** — `content_brief` and `content_detailed` both get embedded and searched. There's no separate "customer index" vs "technician index" anymore. One knowledge base, one agent, one retrieval call.
2. **First answer to any query uses `content_brief` only.** The agent identifies the issue, explains it in plain language, and — for anything above `hazard_level: none` — tells the user this typically needs a PEL technician, with a pointer to the `support-app-whatsapp` routing chunk (Khidmat Markaz app / WhatsApp / PEL CARE hotline).
3. **If the user says "tell me more" / "give me the full procedure" / equivalent, the agent surfaces `content_detailed` for that same chunk.** This is a depth escalation, not a role check — anyone can ask, technician or homeowner. This is also the hook for your pre-dispatch workflow: once the detailed diagnosis narrows the fault to a specific component (e.g., "IPM failure" / "IC hardware over-current"), the agent can flag the conversation with a probable part (e.g., "AC outdoor PCB — Model X") so the ticket carries that forward and the technician brings the part on the first visit.
4. **`hazard_level` is a phrasing instruction, not a lock.** Even in `content_detailed`, chunks tagged `electrical` or `refrigerant` should be delivered with a light safety framing (e.g., "this involves testing live components — here's what a technician checks"), since the user asked for it, but the content shouldn't imply "go do this yourself with a multimeter."

## What did *not* need splitting

Not everything in the old technician file is hazard-gated. `wm-fault-codes` (washing machine fault codes) is the clean counterexample: E0–E7 codes are almost entirely things a customer can safely do themselves — unplug for 60 seconds, clean a filter, redistribute a load, close a door. Only E6 (a sensor wiring fault) needed a technician callout. That whole chunk lives in `content_brief` with `hazard_level: none` — no gating needed, because the underlying fact genuinely isn't hazardous. This is the same instinct you raised about remote controls: not all internal-file content is actually internal-grade information, some of it was just filed in the wrong place.

## v2.1 update — full pass on `PEL_Service_Technician_Training_Manual_2025.md`

The remote control content that was missing in v2.0 was found in this fuller manual (Section 6.5, "Panasonic Remote Interface Function Map") and is now in `pel_air_conditioners_kb.json` as `ac-remote-control-guide`. This manual also had substantially more depth than the original technician JSON across every category — full AC catalog tiers with per-series electrical specs, a cross-product warranty policy matrix, B2B commercial cabinet agreements, washing machine internal component references, smart-TV software troubleshooting (streaming lag, mirroring, cursor bugs), and richer versions of the diagnostic flowcharts already migrated. All of it has been folded into the relevant product file, split into `content_brief`/`content_detailed` and tagged with `hazard_level` following the same rules as before. Chunk counts roughly doubled across most categories as a result (Air Conditioners: 12 → 21).

**Deliberately not transcribed verbatim:** the manual's raw multi-column engineering tables (exact indoor/outdoor unit dimensions in mm, precise EER/COP/wattage per single model variant) were condensed into readable per-series summaries rather than copied cell-by-cell. A giant table of near-duplicate numbers across 15 AC variants doesn't make a good RAG chunk — it's low relevance density and hurts retrieval quality more than it helps. If a specific exact figure (e.g., "what's the exact outdoor unit weight of the 18K Sublime") is ever needed at that granularity, it can be added as a targeted chunk on request rather than bulk-importing every table cell.

## What's still missing (not fabricated here, flagging instead)

- **`general_support` is still thin relative to what "general support" implies** — it now has 3 chunks (routing, full warranty matrix, B2B commercial coverage) instead of 1, which is better, but there's still no general troubleshooting-before-you-call guidance, serial number lookup help, or return policy. Not addressed here since no source material for it has been provided yet.
- **The old `pel_technician_kb.json` file is now redundant** — every chunk in it (and its superset in the fuller training manual) has been redistributed into its real product category file, with a mapping in `MIGRATION_NOTES.md`. Recommend removing it from the ingestion path (or archiving it outside the ingested `backend/documents/` tree) so you don't end up with duplicate content in ChromaDB.
