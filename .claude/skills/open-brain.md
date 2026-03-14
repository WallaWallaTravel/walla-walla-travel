---
name: open-brain
description: Cross-session knowledge persistence via Open Brain MCP. Use to log important discoveries or search for prior insights before debugging.
---

## When to Log (add_thought)
- Non-obvious root causes of bugs ("the driver portal breaks because X interacts with Y")
- Architectural decisions and the reasoning behind them
- Performance findings ("query X takes 400ms because of missing index on Y")
- "Gotchas" that would trip someone up again
- Patterns discovered during debugging that aren't documented elsewhere

## When NOT to Log
- Routine changes ("updated button color")
- Things already captured in CLAUDE.md, skills files, or MISSION.md
- Temporary debugging notes that won't matter next week

## How to Log
Use the Open Brain MCP `add_thought` tool:
- thought: descriptive text explaining the insight
- type: "insight" or "decision" or "note"
- tags: relevant categories from list below

## How to Search Before Debugging
Use `search_thoughts` with a natural language query about the area you're investigating.
Returns semantically similar past insights, even if the exact words differ.

## Tags to Use
`architecture` · `debugging` · `stripe` · `prisma` · `performance` · `security` · `email` · `deployment` · `testing` · `decision` · `gotcha`
