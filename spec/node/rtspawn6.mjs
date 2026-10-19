import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Reticulum } from "../../vendor/reticulum-core.js";
import { attachInterfaces } from "../../src/node/interfaces.js";
import { LocalClientInterface } from "@reticulum/node";
import { getSharedInstanceEndpoint } from "@reticulum/node/src/interfaces/local_client.js";

const rns = new Reticulum();
const endpoint = getSharedInstanceEndpoint({});
console.log("PARENT: attaching shared", endpoint.host, endpoint.port);
await attachInterfaces(rns, [
  { type: "shared", options: { host: endpoint.host, port: endpoint.port, socketPath: endpoint.socketPath }, enabled: true },
]);
console.log("PARENT: mesh attached, ticking");
setInterval(() => console.log("PARENT TICK"), 2000);

const here = path.dirname(fileURLToPath(import.meta.url));
const child = spawn(process.execPath, [
  "--permission",
  "--allow-fs-read=/Users/bergie/Projects/noflo-ui",
  "--allow-fs-read=/private/tmp/childtest8/project",
  "--allow-fs-read=/private/tmp/childtest8/state",
  "--allow-fs-write=/private/tmp/childtest8/state",
  "--allow-net",
  path.join(here, "../../src/node/runtimeChild.mjs"),
  "--folder", "/private/tmp/childtest8/project",
  "--state", "/private/tmp/childtest8/state",
  "--name", "rt6-child",
  // The explicit shared entry: the child connects to the rnsd
  "--interfaces", JSON.stringify([{ type: "shared", options: { host: endpoint.host, port: endpoint.port, socketPath: endpoint.socketPath }, enabled: true }]),
], { env: { PATH: process.env.PATH, HOME: process.env.HOME }, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.setEncoding("utf8");
child.stdout.on("data", (c) => console.log("CHILD>", c.trim()));
child.on("exit", (code) => { console.log("CHILD EXIT", code); process.exit(0); });
setTimeout(() => { console.log("TIMEOUT at 25s"); child.kill("SIGKILL"); process.exit(1); }, 25_000);
