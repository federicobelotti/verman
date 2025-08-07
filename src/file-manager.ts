import { promises as fs } from "fs";
import path from "path";

const CONFIG_FILE_NAME = ".vermanrc.json";
const DEFAULT_FILES = ["package.json", "package-lock.json"];

/**
 * Defines the structure of a version update target.
 */
export interface VersionTarget {
  filePath: string;
  versionPath: string;
}

/**
 * Gets a value from an object using a dot notation path,
 * correctly handling keys that contain dots.
 * @param obj The object to read from.
 * @param path The property path (e.g., "foo.bar.version").
 * @returns The found value or undefined.
 */
function getValueByPath(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  let i = 0;
  while (i < parts.length) {
    let foundKey = false;
    // Find the longest possible matching key
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
    // If no part of the path is found, the path is invalid
    if (!foundKey) {
      return undefined;
    }
  }
  return current;
}

/**
 * Sets a value in an object using a dot notation path,
 * correctly handling keys that contain dots.
 * @param obj The object to modify.
 * @param path The property path (e.g., "sap.app.version").
 * @param value The new value to set.
 */
function setValueByPath(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  // Iterate backwards to find the correct parent and the final key
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
  // If the path does not exist, throw an error instead of creating it
  throw new Error(`Path "${path}" not found in the object.`);
}

export async function findVersionFiles(): Promise<VersionTarget[]> {
  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configContent);

    if (config.files && Array.isArray(config.files)) {
      console.log(`✅ Configuration file found: ${CONFIG_FILE_NAME}`);

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

export async function updateVersionInFiles(
  targets: VersionTarget[],
  newVersion: string
): Promise<void> {
  for (const target of targets) {
    try {
      const fileContent = await fs.readFile(target.filePath, "utf-8");
      const json = JSON.parse(fileContent);

      setValueByPath(json, target.versionPath, newVersion);

      await fs.writeFile(target.filePath, JSON.stringify(json, null, 2) + "\n");
      console.log(
        `📝 Updated version in ${path.basename(target.filePath)} (path: "${
          target.versionPath
        }")`
      );
    } catch (error: any) {
      console.error(
        `❌ Failed to update ${path.basename(target.filePath)}: ${
          error.message
        }`
      );
    }
  }
}
