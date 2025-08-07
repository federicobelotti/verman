// src/version-updater.ts
import semver from "semver";
import { UpdateType } from "./types";

export function getNewVersion(
  currentVersion: string,
  type: UpdateType
): string {
  const newVersion = semver.inc(currentVersion, type);
  if (!newVersion) {
    throw new Error(
      `Impossibile incrementare la versione non valida: ${currentVersion}`
    );
  }
  return newVersion;
}
