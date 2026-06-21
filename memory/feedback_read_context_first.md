---
name: read-context-first
description: Always read PLANS.md, DESIGN.md, and PRODUCT.md before building anything in this project
metadata:
  type: feedback
---

Always read PLANS.md, DESIGN.md, and PRODUCT.md at the start of every task before touching any code.

**Why:** Built the Token PLN config without reading PLANS.md and missed: (1) the intended `lib/utility-token-config.ts` location for config types, (2) platform fee should support flat OR percent not just flat, (3) architectural decisions already made in the plan. User had to call it out explicitly.

**How to apply:** First tool call on any task in this project should be reading all three docs in parallel. Never start implementation without this context.
