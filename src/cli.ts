#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import path from "path";
import { ALL_UPDATE_TYPES, UpdateType } from "./types";
import {
  findVersionFiles,
  getCurrentVersion,
  updateVersionInFiles,
  VersionTarget,
} from "./file-manager";
import { getNewVersion } from "./version-updater";
import pkg from "../package.json";

async function run() {
  try {
    program
      .version(pkg.version)
      .argument(
        "[type]",
        `The type of version bump: ${ALL_UPDATE_TYPES.join(", ")}`
      )
      .action(async (type: UpdateType | undefined) => {
        const allFoundFiles = await findVersionFiles();
        if (allFoundFiles.length === 0) {
          console.error(
            "❌ Error: No version files found (e.g., package.json). Aborting."
          );
          return;
        }

        // Group files by their parent directory for a cleaner display
        const groupedByDir = new Map<string, VersionTarget[]>();
        for (const target of allFoundFiles) {
          const relativePath = path.relative(process.cwd(), target.filePath);
          const dirName = path.dirname(relativePath);
          if (!groupedByDir.has(dirName)) {
            groupedByDir.set(dirName, []);
          }
          groupedByDir.get(dirName)!.push(target);
        }

        const choices = [];
        for (const [dir, targets] of groupedByDir.entries()) {
          choices.push(new inquirer.Separator(`\n 📂 ${dir}`)); // Directory header
          for (const target of targets) {
            choices.push({
              name: `  ${path.basename(target.filePath)}`, // Show only the filename
              value: target,
              checked: false,
            });
          }
        }

        // Ask user to select which files to update
        const { filesToUpdate } = await inquirer.prompt<{
          filesToUpdate: VersionTarget[];
        }>([
          {
            type: "checkbox",
            name: "filesToUpdate",
            message: "Select the files you want to update:",
            choices: choices,
            loop: false, // Disables infinite scrolling
            validate: (answer) => {
              if (answer.length < 1) {
                return "You must choose at least one file.";
              }
              return true;
            },
          },
        ]);

        if (filesToUpdate.length === 0) {
          console.log("ℹ️ No files selected. Aborting.");
          return;
        }

        const mainVersionFile = filesToUpdate[0];
        const currentVersion = await getCurrentVersion(mainVersionFile);

        let updateType = type;
        if (!updateType) {
          const answers = await inquirer.prompt([
            {
              type: "list",
              name: "updateType",
              message: `The current version is ${currentVersion}. Select an update type:`,
              choices: ALL_UPDATE_TYPES,
            },
          ]);
          updateType = answers.updateType;
        }

        if (!ALL_UPDATE_TYPES.includes(updateType!)) {
          console.error(
            `❌ Error: Invalid update type "${updateType}". Please use one of: ${ALL_UPDATE_TYPES.join(
              ", "
            )}.`
          );
          return;
        }

        const newVersion = getNewVersion(currentVersion, updateType!);
        console.log(
          `🚀 Bumping version from v${currentVersion} to v${newVersion}...`
        );

        // Pass only the user-selected files to the update function
        await updateVersionInFiles(filesToUpdate, newVersion);

        console.log("\n🎉 Update complete!");
      });

    await program.parseAsync(process.argv);
  } catch (error: any) {
    console.error(`\n❌ An unexpected error occurred: ${error.message}`);
    process.exit(1);
  }
}

run();
