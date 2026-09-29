---
name: workbridge-commander
description: Use when Patrick asks to operate a workstation through WorkBridge Commander, inspect or edit workstation files, run commands, manage processes, or continue workstation work through the WorkBridge-qualified Desktop Commander payload.
---

# WorkBridge Commander

Use the WorkBridge Commander MCP service as the transport. Do not substitute Lappy Desktop Commander, Remote Desktop Commander, VeraPort, or another connector merely because it can reach the same machine.

## Runtime truth

- Tool discovery is not proof of workstation attachment or authority.
- A connected workstation is not proof that the WorkBridge-qualified payload is installed or selected.
- Preserve workstation identity and connection generation across each effect.
- Treat a post-dispatch timeout or disconnect as outcome unknown unless reconciled; never silently replay it.
- Do not silently fail over an effect from one workstation to another.

## Workstation operations

- Prefer native Desktop Commander tools exposed by the qualified payload.
- Establish current state before mutation.
- Use the smallest coherent effect.
- Verify file mutations by readback.
- Verify process work from exit state and relevant output.
- Use explicit workstation selection when more than one device is available.
- Resource keys are scheduling hints, not authority grants.

## Parallel work

- Execution capacity and upstream work-context capacity are independent.
- The qualification floors are at least 4 concurrent workstation effects per device and at least 32 upstream request contexts; they are not product ceilings.
- Upstream contexts are scheduler/admission contexts, not model workers or reasoning agents.

## Protected effects

Do not merge or mutate canonical main, deploy/install/activate/cut over services, change credentials/permissions/trust, incur paid compute, destroy state, or publish private material without Patrick's explicit authority for that exact effect.

## Verification

Before reporting completion, distinguish source state, installed state, selected route, runtime observation, and external effect. Never promote one into another without evidence.
