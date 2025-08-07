#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import path from "path";
import { ALL_UPDATE_TYPES, UpdateType } from "./types";
import {
  findVersionFiles,
  getCurrentVersion,
  updateVersionInFile,
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
          console.error("❌ Error: No version files found. Aborting.");
          return;
        }

        // Group files for cleaner selection prompt
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
          choices.push(new inquirer.Separator(`\n 📂 ${dir}`));
          for (const target of targets) {
            choices.push({
              name: `  ${path.basename(target.filePath)}`,
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
            loop: false,
            validate: (answer) =>
              answer.length < 1 ? "You must choose at least one file." : true,
          },
        ]);

        if (filesToUpdate.length === 0) {
          console.log("ℹ️ No files selected. Aborting.");
          return;
        }

        // Determine the update type
        let updateType = type;
        if (!updateType) {
          const answers = await inquirer.prompt([
            {
              type: "list",
              name: "updateType",
              message: `Select an update type to apply to all selected files:`,
              choices: ALL_UPDATE_TYPES,
            },
          ]);
          updateType = answers.updateType;
        }

        if (!ALL_UPDATE_TYPES.includes(updateType!)) {
          console.error(`❌ Error: Invalid update type "${updateType}".`);
          return;
        }

        console.log(`🚀 Bumping versions with update type: "${updateType}"...`);

        // --- CORE LOGIC CHANGE ---
        // Loop through each selected file and update it individually
        for (const target of filesToUpdate) {
          try {
            const currentVersion = await getCurrentVersion(target);
            const newVersion = getNewVersion(currentVersion, updateType!);
            await updateVersionInFile(target, newVersion);
            console.log(
              `📝 Updated ${path.basename(
                target.filePath
              )} from v${currentVersion} to v${newVersion}`
            );
          } catch (error: any) {
            console.error(
              `❌ Failed to update ${path.basename(target.filePath)}: ${
                error.message
              }`
            );
          }
        }

        console.log("\n🎉 Update complete!");
      });

    await program.parseAsync(process.argv);
  } catch (error: any) {
    console.error(`\n❌ An unexpected error occurred: ${error.message}`);
    process.exit(1);
  }
}

run();
