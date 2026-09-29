# Runtime Evidence — Direct NAS Media UNC Access — 2026-09-29

Status: `LIVE WORKSTATION EFFECT / READ-ONLY NAS ACCESS PROVEN`

## Exact live client

The connected ChatGPT WorkBridge Commander MCP surface reported:

- Desktop Commander version: `0.2.51`
- current client: `workbridge-commander-device-agent 0.1.0`
- platform: Windows x64
- private Node runtime:
  `C:\ProgramData\WorkBridgeMCP\DesktopCommanderMCP\workbridge-runtime\node.exe`

The live tool surface included native Desktop Commander filesystem and process operations.

## Mapped-drive diagnosis

A read-only `Get-PSDrive -PSProvider FileSystem` in the WorkBridge service session showed only `C:`, `D:`, and `G:`; the interactive user's `Z:` mapping is not mounted in that service session.

A read-only query of loaded user registry drive mappings recovered:

`Z:` -> `\\TheSimsVault\Media`

No credential was read or stored.

## Direct UNC proof

WorkBridge Commander successfully ran native `list_directory` on:

`\\TheSimsVault\Media\Library`

The response included:

- `Application Support\Plex Media Server`
- `Movies`
- `Music`
- `TV`

The same response reported 820 immediate Movie items and 229 immediate Music items.

This is an important product-level proof: WorkBridge Commander can perform real filesystem reads against a NAS UNC path even when the service session does not inherit the user's mapped drive.

## Policy nuance observed later

The WorkBridge config initially reported `allowedDirectories: []`, and the UNC listing succeeded.

Later, UI/config state reported `allowedDirectories` narrowed to `Z:\Library`. Because the service session has no `Z:` drive, a subsequent UNC read was rejected as outside the configured allowed directory.

For service-hosted WorkBridge Commander, native UNC roots are therefore preferable to user-session mapped-drive aliases.

For this media-library case the narrow root should be:

`\\TheSimsVault\Media\Library`

not all of `\\TheSimsVault\Media`.

## Comparison with older Lappy V2 path

The older VeraPort-backed Lappy V2 surface had two independent problems for this job:

1. `Z:\Library` was outside the executor's configured roots.
2. direct UNC access under its service identity returned Windows SMB authentication error 1326.

WorkBridge Commander succeeded on the same NAS UNC through its own workstation runtime. That makes Commander the preferred immediate path for the media normalization task.

## Media task continuation

The owning media workflow is recorded in:

`thebrazenbeard/mediaphile`

restore token:

`MEDIAPHILE::RESTORE_AND_RUN::NAS_LIBRARY_RENAME_20260929_V2`

The next desired WorkBridge Commander use is read-only Plex database inspection under:

`\\TheSimsVault\Media\Library\Application Support\Plex Media Server\Plug-in Support\Databases`

followed by identity-aware rename planning. No media rename was performed during this runtime proof.

## Claim ceiling

This proves the WorkBridge Commander device-agent/runtime can reach the specific NAS library UNC and execute the upstream filesystem operation.

It does not prove:
- the standalone DS216 WorkBridgeMedia package is installed;
- the Plex database has been read;
- manager ownership is known;
- any rename was applied.
