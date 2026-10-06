import { readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";
import { ShipledgerConfigSchema, type ShipledgerConfig } from "@shipledger/schema";

export async function loadConfig(configPath: string = ".shipledger.yml", cwd: string = process.cwd()): Promise<ShipledgerConfig> {
  const absPath = path.isAbsolute(configPath) ? configPath : path.resolve(cwd, configPath);

  let rawContent: string;
  try {
    rawContent = await readFile(absPath, "utf-8");
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw new Error(`ShipLedger configuration file not found at: ${absPath}`);
    }
    throw new Error(`Failed to read configuration file: ${err.message}`);
  }

  let parsedYaml: any;
  try {
    parsedYaml = yaml.parse(rawContent);
  } catch (err: any) {
    throw new Error(`Invalid YAML format in ${configPath}: ${err.message}`);
  }

  const validationResult = ShipledgerConfigSchema.safeParse(parsedYaml);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.errors
      .map(e => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`ShipLedger configuration validation error:\n${errorDetails}`);
  }

  return validationResult.data;
}
