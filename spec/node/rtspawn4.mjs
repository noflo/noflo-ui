import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
const args = process.argv[2] === "perm"
  ? ["--permission",
     "--allow-fs-read=/Users/bergie/Projects/noflo-ui",
     "--allow-fs-read=/private/tmp/childtest8/project",
     "--allow-fs-read=/private/tmp/childtest8/state",
     "--allow-fs-write=/private/tmp/childtest8/state",
     "--allow-net"]
  : [];
const child = spawn(process.execPath, [...args, "src/node/runtimeChild.mjs",
  "--folder", "/private/tmp/childtest8/project",
  "--state", "/private/tmp/childtest8/state",
  "--name", "spawned-child"], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
child.stdout.setEncoding("utf8");
child.stdout.on("data", (c) => console.log("CHILD>", c.trim()));
child.stderr.setEncoding("utf8");
child.stderr.on("data", (c) => console.log("ERR>", c.trim().slice(0, 90)));
child.on("exit", (code) => { console.log("CHILD EXIT", code); process.exit(0); });
setTimeout(() => { console.log("TIMEOUT at 20s"); child.kill("SIGKILL"); process.exit(1); }, 20_000);
