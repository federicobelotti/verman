import semver from "semver";
import { UpdateType } from "./types";

export function getNewVersion(
  currentVersion: string,
  type: UpdateType
): string {
  const newVersion = semver.inc(currentVersion, type);
  if (!newVersion) {
    throw new Error(`Can't update invalid version: ${currentVersion}`);
  }
  return newVersion;
}
