import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { mkdir, rm } from "node:fs/promises";
import { execSync } from "node:child_process";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(artifactDir, "dist");
const tmpDir = path.resolve(artifactDir, "dist", "tmp");

async function buildAll() {
  await rm(distDir, { recursive: true, force: true });

  execSync("npx tsc -p tsconfig.json --outDir dist/tmp --incremental false --noEmitOnError false --skipLibCheck true", {
    cwd: artifactDir,
    stdio: "inherit",
  });

  const bundleOptions = {
    platform: "node",
    bundle: true,
    format: "esm",
    logLevel: "info",
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
      "dotenv",
      "pg",
      "@supabase/supabase-js",
      "@nestjs/*",
      "reflect-metadata",
      "rxjs",
    ],
    sourcemap: "linked",
    plugins: [
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  };

  await esbuild({
    ...bundleOptions,
    entryPoints: [
      path.resolve(tmpDir, "index.js"),
      path.resolve(tmpDir, "seed.js"),
    ],
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
  });

  const vercelEntry = path.resolve(artifactDir, "api", "index.mjs");
  await mkdir(path.dirname(vercelEntry), { recursive: true });
  await esbuild({
    ...bundleOptions,
    entryPoints: [path.resolve(tmpDir, "serverless.js")],
    outdir: path.dirname(vercelEntry),
    entryNames: "index",
    outExtension: { ".js": ".mjs" },
  });

  console.log(`[build] Vercel entry written to ${vercelEntry}`);

  await rm(tmpDir, { recursive: true, force: true });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
