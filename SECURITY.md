# Security

WorkBridge Commander is a remote-control surface. Treat access to the remote MCP identity as access to the authority exposed by the workstation payload.

## Trust model

The Commander path preserves DesktopCommanderMCP semantics, including arbitrary command-string execution. WorkBridge package integrity verifies what implementation is launched; it is not a sandbox and does not turn unrestricted workstation control into a bounded capability.

The remote layer therefore must provide strong authentication, explicit device association, revocation, encrypted transport, session isolation, and exact routing. Those controls require implementation and runtime verification outside this manifest repository.

## No false deployment claims

This repository contains a source-level remote MCP service and device-agent implementation plus qualification harnesses. Source and CI qualification do not prove that:

- a public MCP endpoint exists;
- authentication or device pairing is deployed;
- VeraMesh is currently routing this plugin;
- a workstation payload is installed or running;
- any AI client is authorized;
- any workstation effect has occurred.

## Operator guidance

Run remote workstation control only on machines and accounts you intend to expose to the connected AI client. Use OS-level isolation where the consequence of arbitrary command execution is unacceptable. Revocation must terminate future remote reachability rather than merely hide a device in UI.

Never commit bearer tokens, API keys, device credentials, tunnel secrets, or private keys to this repository.

## Network boundaries

The device agent refuses non-loopback plaintext service URLs. Remote operation therefore requires TLS termination. Browser-origin requests are denied unless their exact Origin appears in `WORKBRIDGE_ALLOWED_ORIGINS`; non-browser requests without Origin are allowed and still require bearer/device authentication. The device WebSocket applies a 2 MB message ceiling.
