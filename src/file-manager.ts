import { promises as fs } from "fs";
import path from "path";

const CONFIG_FILE_NAME = ".vermanrc.json";
const DEFAULT_FILES = ["package.json"];

export interface VersionTarget {
  filePath: string;
  versionPath: string;
}

function getValueByPath(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  let i = 0;
  while (i < parts.length) {
    let foundKey = false;
    for (let j = parts.length; j > i; j--) {
      const key = parts.slice(i, j).join(".");
      if (
        current &&
        typeof current === "object" &&
        Object.prototype.hasOwnProperty.call(current, key)
      ) {
        current = current[key];
        i = j;
        foundKey = true;
        break;
      }
    }
    if (!foundKey) {
      return undefined;
    }
  }
  return current;
}

function setValueByPath(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  for (let i = parts.length; i > 0; i--) {
    const parentPath = parts.slice(0, i - 1).join(".");
    const finalKey = parts.slice(i - 1).join(".");
    const parent = parentPath ? getValueByPath(obj, parentPath) : obj;
    if (
      parent &&
      typeof parent === "object" &&
      Object.prototype.hasOwnProperty.call(parent, finalKey)
    ) {
      parent[finalKey] = value;
      return;
    }
  }
  throw new Error(`Path "${path}" not found in the object.`);
}

export async function findVersionFiles(): Promise<VersionTarget[]> {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configContent);

    if (config.files && Array.isArray(config.files)) {
      return config.files.map((entry: any) => {
        if (typeof entry === "string") {
          return {
            filePath: path.join(process.cwd(), entry),
            versionPath: "version",
          };
        }
        return {
          filePath: path.join(process.cwd(), entry.path),
          versionPath: entry.versionPath ?? "version",
        };
      });
    }
  } catch (error) {
    console.log(
      `ℹ️ No ${CONFIG_FILE_NAME} found. Falling back to default files.`
    );
  }

  const defaultTargets: VersionTarget[] = [];
  for (const file of DEFAULT_FILES) {
    const filePath = path.join(process.cwd(), file);
    try {
      await fs.access(filePath);
      defaultTargets.push({ filePath, versionPath: "version" });
    } catch {}
  }
  return defaultTargets;
}

export async function getCurrentVersion(
  target: VersionTarget
): Promise<string> {
  const fileContent = await fs.readFile(target.filePath, "utf-8");
  const json = JSON.parse(fileContent);
  const version = getValueByPath(json, target.versionPath);

  if (!version || typeof version !== "string") {
    throw new Error(
      `File "${path.basename(
        target.filePath
      )}" is missing a valid version at path "${target.versionPath}".`
    );
  }
  return version;
}

/**
 * Updates the version in a single file target.
 * @param target The file target to update.
 * @param newVersion The new version string to apply.
 */
export async function updateVersionInFile(
  target: VersionTarget,
  newVersion: string
): Promise<void> {
  try {
    const fileContent = await fs.readFile(target.filePath, "utf-8");
    const json = JSON.parse(fileContent);

    setValueByPath(json, target.versionPath, newVersion);

    await fs.writeFile(target.filePath, JSON.stringify(json, null, 2) + "\n");
  } catch (error: any) {
    // Re-throw the error with more context
    throw new Error(
      `Failed to update ${path.basename(target.filePath)}: ${error.message}`
    );
  }
}
