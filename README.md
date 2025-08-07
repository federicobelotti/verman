# verman

A smart, interactive version management tool for your Node.js projects.

## What is verman?

`verman` is a command-line tool that simplifies the process of updating version numbers across all relevant files in your project (like `package.json`, `manifest.json`, etc.). It's designed to handle everything from simple projects to complex monorepos with ease.

## Features

- **Interactive Mode**: A guided prompt to select the update type and the specific files to modify.
- **Flexible Configuration**: Use a `.vermanrc.json` file to specify which files to track.
- **Deep Property Pathing**: Update version numbers nested deep within JSON objects.
- **Handles Complex Keys**: Correctly parses keys containing dots (e.g., `"app.config"`).

## Installation

> Installation via package manager is a WIP.

To use `verman` locally, you need to clone the repository, build the project and link it using `npm`.

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/federicobelotti/verman](https://github.com/federicobelotti/verman)
    ```

2.  **Build the package:**
    Navigate into the cloned directory and run `npm run build` (or use the package manager of your choice) to build from the source files.
3.  **Link the package:**
    Run `npm link` in the cloned repository. This makes the `verman` command available globally on your system, pointing to your local source code.
    ```bash
    npm link
    ```

## Usage

Navigate to your project's root directory and run the `verman` command.

### Guided Mode

For an interactive experience, run the command without any arguments:

```bash
verman
```

You will be prompted to:

1.  Select which of the discovered files you want to update.
2.  Choose the type of version bump (patch, minor, or major).

### Direct Mode

You can also specify the update type directly as an argument. `verman` will still ask you to confirm the files before applying the changes.

```bash
verman patch
verman minor
verman major
```

## Configuration

By default, `verman` looks for `package.json` in the current directory. To customize this behavior, create a `.vermanrc.json` file in your project's root.

### Basic Configuration

List the paths to all the files you want `verman` to manage.

```json
{
  "files": [
    "./package.json",
    "./backend/package.json",
    "./frontend/app/manifest.json"
  ]
}
```

### Advanced Configuration (Custom Version Paths)

For files that don't use a top-level `"version"` property, you can specify the exact path to the version string using `versionPath`.

```json
{
  "files": [
    { "path": "./package.json" },
    {
      "path": "./frontend/app/config.json",
      "versionPath": "metadata.application.version"
    }
  ]
}
```

This configuration tells `verman` to update the `version` property inside the `application` object, which is itself inside the `metadata` object.

> **Note**: If `versionPath` is not provided, it defaults to `"version"`.

### Handling Complex Keys

`verman` is smart enough to handle object keys that contain dots. For a `versionPath` like `"app.config.version"`, it will correctly look for a key named `"app.config"` first, before attempting to navigate a nested object structure.
