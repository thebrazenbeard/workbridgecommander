# WorkBridge Family Consolidation V1

Date: 2026-10-02
Status: DRAFT PORTFOLIO ARCHITECTURE / NO CUTOVER OR ARCHIVE EFFECT

## Objective

Reduce overlapping Vera-branded remote-execution, transport, DSM-host, and client repositories into a coherent WorkBridge product family without collapsing unrelated application or Vera-runtime concerns into one repository.

## Canonical family surfaces

1. `WorkBridgeMCP` — workstation implementation, bounded native MCP, exact Desktop Commander payload ownership, local qualification and packaging.
2. `workbridgecommander` — remote MCP ingress, authenticated device attachment, multi-device/client orchestration and transport/session integration.
3. `workbridge` — constrained-host and NAS/DSM packaging, relay/edge distribution, on-device qualification and operator runbooks.

These are separate deployable surfaces with one product boundary. Consolidation means one owner per mechanism, not one giant source tree.

## Current exact source cut

- WorkBridgeMCP: `f091f6be6e85f489e3e7839e10612204b89a4a9e`
- workbridgecommander: `c2b95be79ca011a539c20bfee60fcbc46cfea177`
- workbridge: `e88e14ea25f25abd723bb50909b3e25e67f889fd`
- vera-mesh: `98b74ff77981a5478e20a748bbb94565ad9140c8`
- vera-synology: `d13cdefbf817aeba60c673fa4a517575c311da2c`
- vera-apk: `ec2f69a3946eb63c47d39e6c729aa70ec5c29542`
- vera-os: `be4a45a2b8b7a8e329f772820df0a757766b3073`
- vera_ark: `1734bf636b70e7cab36e2aeabbe0451338099147`

## Migration map

### vera-mesh -> WorkBridge transport/session ownership

Move reusable authenticated-session, lane, replay/freshness, durable-relay, edge-stream and direct-stream mechanisms into the WorkBridge family. The most natural owner is `workbridgecommander` for remote session/orchestration semantics, with workstation execution remaining in `WorkBridgeMCP`.

Do not archive vera-mesh until its open issue/PR subjects are either implemented in the receiving repositories or transferred with exact provenance and acceptance criteria.

### vera-synology -> workbridge

Move DSM/SPK packaging, ARMv7 qualification, NAS-local edge/relay, package lifecycle, WorkBridgeMedia and DSM operator diagnostics into `workbridge`. Existing vera-synology PRs #9-#12 are live migration subjects and must not be buried.

### vera-apk -> WorkBridge client surface

The Android app is a client rather than Vera identity/control authority. Reframe it as a WorkBridge Commander Android client and migrate its capability-gate/client-shell work under a WorkBridge client surface, preserving the rule that client UI never manufactures authority.

### vera-os -> vera-mono, not WorkBridge

Vera OS concerns persistent Vera runtime composition, durable identity/memory/task state, replaceable cognition engines and OS-level governance. Those belong with Vera Mono. Treat vera-os as an architecture donor to `vera-mono`; archive only after unique design material is preserved there.

### vera_ark -> application boundary, not core WorkBridge

ARK is a game/application workload. Extract generic monitor/perception transport, bounded HID/action-envelope or remote-execution mechanisms only if they are broadly reusable in WorkBridge. Keep ARK-specific semantics out of transport infrastructure. After extraction, decide whether the remaining application deserves its own generic repository or historical archive.

## Archive gates

A donor repository becomes archive-ready only when:
- all open issues/PRs are closed or transferred to an explicit successor;
- unique source/docs/tests are preserved or intentionally rejected with a receipt;
- successor ownership is named at path/module granularity;
- parity/regression checks cover migrated behavior;
- stale consumers are updated or deliberately preserved as historical references;
- the repository description/readme points to the successor;
- final archive state is independently read back.

## Order

1. vera-synology -> workbridge.
2. vera-mesh -> workbridgecommander / WorkBridgeMCP boundaries.
3. vera-apk -> WorkBridge client surface.
4. vera-os -> vera-mono donor extraction.
5. vera_ark -> extract reusable infrastructure; decide application disposition afterward.

## Hostile review

> **HOSTILE REVIEWER:** “Put all Vera-* infrastructure into WorkBridge” risks creating another god-repository and erasing useful separation between execution, transport, packaging, clients, runtime identity, and applications.

**ACCEPTED.** The consolidation target is a three-surface WorkBridge family with explicit ownership, not a single repository. Vera-runtime architecture stays in Vera Mono; application-specific logic stays outside the transport core.

## Effect boundary

This document performs no merge, archive, deployment, installation, credential change, route cutover, provider mutation, service restart, or runtime activation.
