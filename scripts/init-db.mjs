import nextEnv from "@next/env";
import { closePool, ensureDatabase } from "../lib/setup.mjs";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

await ensureDatabase();
await closePool();
console.log("Banco okuma pronto.");
