#!/usr/bin/env node
/**
 * Gera tipos TypeScript a partir do schema OpenAPI do backend.
 *
 * Uso:
 *   node scripts/generate-types.mjs
 *   OPENAPI_URL=http://localhost:3000/api/docs-json node scripts/generate-types.mjs
 *
 * A URL padrão aponta para o Swagger do backend rodando localmente.
 * O arquivo gerado (src/types/api.generated.ts) é versionado no repositório.
 */

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const url =
  process.env.OPENAPI_URL ?? "http://localhost:3000/api/docs-json";

const outputDir = resolve(ROOT, "src", "types");
const outputFile = resolve(outputDir, "api.generated.ts");

// Garante que o diretório de saída existe
mkdirSync(outputDir, { recursive: true });

console.log(`Gerando tipos a partir de: ${url}`);
console.log(`Saída: ${outputFile}`);

try {
  execSync(
    `node "${resolve(ROOT, "node_modules", "openapi-typescript", "bin", "cli.js")}" "${url}" -o "${outputFile}"`,
    { stdio: "inherit", cwd: ROOT }
  );
  console.log("Tipos gerados com sucesso.");
} catch (err) {
  console.error("Erro ao gerar tipos:", err.message);
  process.exit(1);
}
