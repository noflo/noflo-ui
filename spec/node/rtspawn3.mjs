import { spawn } from "node:child_process";
import process from "node:process";
const child = spawn(
  process.execPath,
  ["-e", "setInterval(() => console.log('CHILD TICK'), 1000); setTimeout(() => process.exit(0), 8000)"],
  { env: { PATH: process.env.PATH, HOME: process.env.HOME }, cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
);
child.stdout.setEncoding("utf8");
child.stdout.on("data", (c) => console.log("CHILD>", c.trim()));
child.on("exit", (code) => { console.log("CHILD EXIT", code); process.exit(0); });
setTimeout(() => { console.log("PARENT STILL ALIVE AT 15s — ticking:", !!process.env.PATH); process.exit(1); }, 15_000);
setInterval(() => console.log("PARENT TICK"), 2000);
