# Source Provenance

WorkBridge Commander is an original plugin/packaging surface informed by three repositories.

## WorkBridgeMCP

Repository: https://github.com/thebrazenbeard/WorkBridgeMCP

Role: primary implementation/design authority for the WorkBridge Commander workstation path. Its current Commander duplicate material pins and qualifies DesktopCommanderMCP and defines VeraMesh/VeraRelay composition.

## DesktopCommanderMCP

Repository: https://github.com/wonderwhy-er/DesktopCommanderMCP

Role: workstation MCP implementation and behavior reference. WorkBridgeMCP currently records an exact upstream pin for duplicate mode. DesktopCommanderMCP is MIT-licensed; preserve applicable upstream notices wherever its source/binaries are distributed.

## Remote Desktop Commander

Repository: https://github.com/desktop-commander/remote-desktop-commander

Role: structural reference for the separate remote-plugin repository pattern: public manifests/documentation separated from the workstation implementation/service internals.

No claim is made that Remote Desktop Commander code or hosted service implementation is incorporated here.

## Current WorkBridge duplicate source record

At the WorkBridgeMCP source inspected while creating this repository surface, the duplicate contract recorded:

- DesktopCommanderMCP commit: `550a0b3e31da18b7cf25e87ed840e3d953b6da42`
- upstream package version: `0.2.51`
- tool semantics: upstream exact
- transport owner: VeraMesh
- optional transparent relay owner: VeraRelay

This is a provenance record, not a promise that the pin will never advance. Current packaging should always re-read WorkBridgeMCP before release.
