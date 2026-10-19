/**
 * Probes the shared-instance attach path under the sandbox, one step at a
 * time, to name the denied path the FS-restricted error hides.
 */
import { getSharedInstanceEndpoint } from "@reticulum/node";
import { LocalClientInterface } from "@reticulum/node";

const step = (name, fn) => fn().then(
  (value) => console.log(`OK   ${name}:`, typeof value === "object" ? JSON.stringify(value) : String(value)),
).catch((error) => console.log(`FAIL ${name}:`, error.message?.slice(0, 80)));

await step("getSharedInstanceEndpoint", async () => {
  const endpoint = getSharedInstanceEndpoint({});
  // Never print the full config; the endpoint shape is the question
  return {
    shareInstance: endpoint.shareInstance,
    hasSocket: Boolean(endpoint.socketPath),
    host: endpoint.host,
    port: endpoint.port,
  };
});
await step("LocalClientInterface.connect", async () => {
  const endpoint = getSharedInstanceEndpoint({});
  const iface = new LocalClientInterface({
    host: endpoint.host,
    port: endpoint.port,
    socketPath: endpoint.socketPath,
  });
  await iface.connect();
  return "connected";
});
setTimeout(() => process.exit(0), 10_000);
