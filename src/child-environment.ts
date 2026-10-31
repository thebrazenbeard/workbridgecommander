/**
 * Keep the qualified Desktop Commander subprocess independent of WorkBridge
 * credentials. The child can execute tools on the workstation and therefore
 * must not inherit the orchestrator's authentication environment.
 *
 * Only ordinary OS bootstrap variables are forwarded. New application
 * configuration must be explicitly reviewed and allowlisted here.
 */
const BOOTSTRAP_ENV_NAMES = new Set([
  "APPDATA", "COMSPEC", "HOME", "HOMEDRIVE", "HOMEPATH",
  "LANG", "LC_ALL", "LC_CTYPE", "LOCALAPPDATA", "PATH", "PATHEXT",
  "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMW6432", "SHELL",
  "SYSTEMROOT", "TEMP", "TERM", "TMP", "TMPDIR", "USER",
  "USERNAME", "USERPROFILE", "WINDIR", "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_RUNTIME_DIR"
]);

export function createChildEnvironment(parent: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(parent)) {
    if (typeof value === "string" && BOOTSTRAP_ENV_NAMES.has(name.toUpperCase())) {
      env[name] = value;
    }
  }
  env.DC_REMOTE_DEVICE = "true";
  return env;
}
