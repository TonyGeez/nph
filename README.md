# nph - Node Package Helper

A CLI tool to manage Node.js dependencies with ease.

## Installation

Install globally via npm:

```bash
npm install -g nph
```

## Features

- **Dependency Verification**: Check for invalid package names and versions
- **Deprecated Packages**: Find deprecated packages and code patterns
- **Smart Upgrades**: Safely upgrade dependencies with peer conflict detection
- **Node Scripts**: Straightforward listing of scripts and add, edit, and remove npm scripts faster

## Usage

### Scripts Management

#### List all scripts
```bash
nph scripts
```

#### Add a new script
```bash
nph add
```
Follow the interactive prompts to add a new script to your package.json.

#### Edit an existing script
```bash
nph edit
```
Select a script from the list to modify its name or command.

#### Remove scripts
```bash
nph remove
```
Select one or more scripts to remove from your package.json.

### Dependency Management

#### Verify dependencies
```bash
nph dep
```
Checks all dependencies for:
- Invalid package names (with suggestions)
- Non-existent versions (with closest available versions)

Options:
- `--fix-all` - Fix all issues automatically
- `--fix-version` - Fix version issues only
- `--fix-name` - Fix package name issues only

#### Check for deprecations
```bash
nph deprecations
```
Scans for:
- Deprecated npm packages
- Deprecated code patterns in your source

Options:
- `--json` - Output results in JSON format
- `--fix` - Note: Manual review required for deprecations

#### Upgrade dependencies
```bash
nph upgrade
```
Analyzes and upgrades dependencies safely:
- Checks for latest compatible versions
- Detects peer dependency conflicts
- Shows detailed upgrade information

Options:
- `--dry-run` - Preview upgrades without applying
- `--force` - Ignore peer dependency conflicts

## Examples

### Adding a new script
```bash
$ nph add
? Type Command: dev
? Script to execute: nodemon ./src/index.js
? Confirm adding dev ⟶ nodemon ./src/index.js script to package.json ? Yes
▍ Script added successfully ✔
```

### Verifying dependencies
```bash
$ nph dep
──────────────────────────────────────
│ Dependency Verifier │
──────────────────────────────────────

→ Checking 25 dependencies...

✓ lodash@^4.17.21
✓ express@^4.18.2
✗ react@^16.14.0
  Version ^16.14.0 does not exist for react
  Closest version available: ^18.2.0

Run with --fix-all to fix all issues
```

### Upgrading packages
```bash
$ nph upgrade
──────────────────────────────────────
│ Dependency Upgrade Analyzer │
──────────────────────────────────────

→ Analyzing 25 dependencies for safe upgrades...

Upgrade Analysis Results

Upgrades available:

→ react
  Current: ^16.14.0
  Latest: ^18.2.0

→ eslint
  Current: ^7.32.0
  Latest: ^8.57.0

Apply 2 upgrade(s)? Yes
✓ package.json updated successfully
→ Run npm install to install updates
```

## Configuration

nph works directly with your package.json file. No additional configuration is required.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

