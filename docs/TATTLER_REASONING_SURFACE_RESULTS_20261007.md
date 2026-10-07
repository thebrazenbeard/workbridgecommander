# Tattler reasoning-surface results — 2026-10-07

Status: OBSERVATION NOTE / CONCURRENCY SEMANTICS

## Shared experiment result

On 2026-10-07, the same repository stress-test prompt was run through three ChatGPT surfaces while WorkLaptop was instrumented with Tattler plus a companion Codex process/network tracer.

Observed controlled windows:

- Desktop Chat, GPT-5.6 Sol High: **0 MXC launches** and **2 new established Codex TLS connections** in the companion tracer.
- ChatGPT Desktop Work, Ultra: **59 MXC launches** and **73 new established Codex TLS connections** using the same companion-tracer definitions.
- Firefox cloud Work, Max: browser-side traffic was observable locally, but the provider's server-side worker topology was not.

The bounded conclusion is that Desktop Work used materially different local orchestration from ordinary High Chat in this runtime. It does **not** establish that sockets or MXC processes equal agents, that connection fanout grants a reasoning tier, or that a client can promote High into Ultra/Max by imitating transport behavior.

Canonical detailed evidence is being preserved in `thebrazenbeard/tattler` PR #7 and the reasoning interpretation in `thebrazenbeard/rezon` PR #103.


## Why WorkBridge Commander needs this result

WorkBridge Commander deliberately distinguishes upstream request contexts from workstation-effect lanes. The experiment reinforces that this separation must also remain distinct from model/reasoning topology.

```text
upstream request context != model worker
workstation effect lane != reasoning agent
WebSocket/TCP session != reasoning tier
parallel workstation effects != independent reasoning
```

The current 32-context / 4-effect-lane qualification targets remain execution/orchestration capacities only. They must not be advertised or interpreted as creating 32 or 4 model agents.

If a client explicitly declares that a request originated from High, Ultra, Max, or another surface, Commander may preserve that as caller-supplied provenance in a receipt. It should not infer such a label from concurrency, process count, socket count, or latency.

## Practical consequence

Future stress tests should report at least two separate dimensions:

1. Commander execution concurrency and effect-lane occupancy;
2. externally observed reasoning-surface metadata supplied by the client/experiment.

Combining them into one "agent count" would erase exactly the distinction the Tattler experiment exposed.
