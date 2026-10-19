/**
 * Ambient declarations for the @reticulum/node internals that noflo-ui
 * reaches into directly: the shared-instance endpoint discovery reads the
 * user's Reticulum config the same way the interface attach does, but the
 * package exports only the interface classes — the discovery helper lives
 * in the module file (work document #47's runtime child resolves the mesh
 * attachment parent-side, where the sandbox is not a factor).
 */

declare module "@reticulum/node/src/interfaces/local_client.js" {
  export interface SharedInstanceEndpoint {
    configDir: string;
    shareInstance: boolean;
    transport: "tcp" | "unix";
    instanceName: string;
    host?: string;
    port?: number;
    socketPath?: string;
  }
  export function getSharedInstanceEndpoint(options?: {
    configDir?: string;
  }): SharedInstanceEndpoint;
  export function loadConfig(options?: {
    configDir?: string;
  }): { configDir: string; config: Record<string, any> } | null;
  export function resolveConfigDir(explicit?: string): string;
}
