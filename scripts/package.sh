#!/usr/bin/env bash
# Copyright 2026 Element Creations Ltd.
#
# SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
# Please see LICENSE in the repository root for full details.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${CLI_DIR}/dist"

echo "=========================================="
echo " Packaging Element CLI for Distribution"
echo "=========================================="

cd "${CLI_DIR}"

# 1. Clean previous build & dist artifacts
echo "==> Cleaning old build artifacts..."
rm -rf lib dist
mkdir -p "${DIST_DIR}"

# 2. Compile TypeScript
echo "==> Compiling TypeScript..."
../../node_modules/.bin/tsc

# 3. Ensure binary launcher has execute permissions
echo "==> Setting executable permissions on bin/element-cli.js..."
chmod +x bin/element-cli.js

# 4. Pack into standalone tarball (.tgz)
echo "==> Creating distribution package..."
TARBALL=$(npm pack --pack-destination "${DIST_DIR}" 2>/dev/null | tail -n 1)

TARBALL_PATH="${DIST_DIR}/${TARBALL}"

# 5. Generate SHA256 checksum
echo "==> Computing SHA256 checksum..."
CHECKSUM=$(sha256sum "${TARBALL_PATH}" | awk '{print $1}')
echo "${CHECKSUM}  ${TARBALL}" > "${DIST_DIR}/${TARBALL}.sha256"

echo ""
echo "=========================================="
echo " Build & Packaging Successful!"
echo "=========================================="
echo " Package Tarball : ${TARBALL_PATH}"
echo " Size            : $(du -h "${TARBALL_PATH}" | awk '{print $1}')"
echo " SHA256 Checksum : ${CHECKSUM}"
echo ""
echo " Installation for users:"
echo "   npm install -g \"${TARBALL_PATH}\""
echo ""
echo " Direct execution with npx:"
echo "   npx \"${TARBALL_PATH}\""
echo "=========================================="
