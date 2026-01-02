# nph

**Node Package Helper** - A CLI tool for managing Node.js dependencies with ease.

## Installation

Install nph globally using npm:

```bash
npm install -g nph
```

## Overview

nph provides a set of commands to streamline your Node.js project maintenance:

- **Dependency Verification**
Check for invalid package names and versions and fix issue automatically.

- **Deprecated Packages** 
Find deprecated packages and code patterns

- **Smart Upgrades**
Safely upgrade dependencies with peer conflict detection

- **Node Scripts**
Straightforward listing of scripts and add, edit, and remove npm scripts faster

## Commands
### `nph scripts`
```bash
# Display all npm scripts from package.json in a formatted list.

nph scripts

═══════════════════════════════════════════════════════════════
║  Print Script CLI                                            ║
═══════════════════════════════════════════════════════════════

▸ build    → webpack --mode production
▸ dev      → webpack serve --mode development
▸ test     → jest
▸ lint     → eslint src/

---

# Interactively add a new script to package.json.
nph script add 

1. Enter script name (e.g., `npm run COMMAND`)
2. Enter command to execute (e.g., `node ./index.js`)
3. Confirm addition

---

# Interactively remove one or more scripts from package.json.
nph script rm

1. Shows numbered list of all scripts
2. Enter script number(s) to remove (e.g., `3` or `3,4,7`)
3. Confirm removal


---

# Interactively edit an existing script's name or command.
nph script edit

1. Shows numbered list of all scripts
2. Enter script number to edit
3. Enter new name (defaults to current)
4. Enter new command (defaults to current)
5. Confirm update
```

### `nph verif`
```bash
# Verify all dependencies exist and have valid versions.
nph dep

- `--fix-all`: Fix version mismatches and suggest package name corrections
- `--fix-version`: Only fix version mismatches
- `--fix-name`: Only fix package name typos

═══════════════════════════════════════════════════════════════
║  Dependency Verifier                                         ║
═══════════════════════════════════════════════════════════════

▸ Checking 42 dependencies...

✔ lodash@^4.17.21
✔ express@^4.18.2
✖ nonexistent-pkg@^1.0.0
  ▸ This package does not exist
  ▸ Did you mean: existing-pkg
```

### `nph dep`
```bash
# Scan for deprecated npm packages and deprecated code patterns using ESLint.
nph dep

- `--json`: Output results as JSON
- `--fix`: (Note: Manual review required for deprecations)

═══════════════════════════════════════════════════════════════
║  Deprecated Code Analyzer                                    ║
═══════════════════════════════════════════════════════════════

▸ Scanning for deprecated patterns...

Deprecated packages:

▸ request
  Reason: request has been deprecated

Deprecated code patterns:

▸ /src/index.js:15:23
  Issue: 'os.tmpDir()' is deprecated since v7.0.0
```
---

### `nph upgrade`
```bash
# Analyze and safely upgrade dependencies to their latest compatible versions.
nph upgrade

- `--dry-run`: Show what would be upgraded without making changes
- `--force`: Apply upgrades even with peer dependency conflicts

═══════════════════════════════════════════════════════════════
║  Dependency Upgrade Analyzer                                 ║
═══════════════════════════════════════════════════════════════

▸ Analyzing 42 dependencies for safe upgrades...

Upgrades available:

▸ lodash
  Current: ^4.17.15
  Latest: ^4.17.21

▸ typescript
  Current: ^4.5.0
  Latest: ^5.2.2
  ⚠ Peer dependency warnings:
    eslint-plugin-import requires typescript@^4.5.0
```

## Configuration

nph works directly with your package.json file. No additional configuration is required.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

