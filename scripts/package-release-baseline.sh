#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_DIR=""
VERIFY_TEMPLATE=""
WORKDIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --package-dir)
      PACKAGE_DIR="$2"
      shift 2
      ;;
    --verify-template)
      VERIFY_TEMPLATE="$2"
      shift 2
      ;;
    --workdir)
      WORKDIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${PACKAGE_DIR}" || -z "${VERIFY_TEMPLATE}" ]]; then
  echo "Usage: $0 --package-dir <dir> --verify-template <file> [--workdir <dir>]" >&2
  exit 1
fi

PACKAGE_ABS_DIR="${ROOT_DIR}/${PACKAGE_DIR}"
VERIFY_ABS_TEMPLATE="${ROOT_DIR}/${VERIFY_TEMPLATE}"

if [[ ! -f "${PACKAGE_ABS_DIR}/package.json" ]]; then
  echo "package.json not found under ${PACKAGE_ABS_DIR}" >&2
  exit 1
fi

if [[ ! -f "${VERIFY_ABS_TEMPLATE}" ]]; then
  echo "verify template not found: ${VERIFY_ABS_TEMPLATE}" >&2
  exit 1
fi

if [[ -z "${WORKDIR}" ]]; then
  WORKDIR="$(mktemp -d /tmp/aionis_package_release_baseline_XXXXXX)"
else
  rm -rf "${WORKDIR}"
  mkdir -p "${WORKDIR}"
fi

PACK_DIR="${WORKDIR}/pack"
CONSUMER_DIR="${WORKDIR}/consumer"
CACHE_DIR="${WORKDIR}/npm-cache"
mkdir -p "${PACK_DIR}" "${CONSUMER_DIR}" "${CACHE_DIR}"

PACKAGE_NAME="$(node -e 'const fs=require("fs"); const pkg=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(pkg.name);' "${PACKAGE_ABS_DIR}/package.json")"
PACKAGE_VERSION="$(node -e 'const fs=require("fs"); const pkg=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(pkg.version);' "${PACKAGE_ABS_DIR}/package.json")"

echo "[package-release] package: ${PACKAGE_NAME}@${PACKAGE_VERSION}"
echo "[package-release] workdir: ${WORKDIR}"
echo "[package-release] building package"
npm --prefix "${PACKAGE_ABS_DIR}" run build

if node -e 'const fs=require("fs"); const pkg=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.exit(pkg.scripts && pkg.scripts.test ? 0 : 1);' "${PACKAGE_ABS_DIR}/package.json"; then
  echo "[package-release] testing package"
  npm --prefix "${PACKAGE_ABS_DIR}" run test
fi

echo "[package-release] packing tarball"
PACK_JSON="$(
  cd "${PACKAGE_ABS_DIR}"
  npm pack --pack-destination "${PACK_DIR}" --json --cache "${CACHE_DIR}"
)"

TARBALL_NAME="$(printf '%s' "${PACK_JSON}" | node -e 'let raw="";process.stdin.on("data",(d)=>raw+=d);process.stdin.on("end",()=>{const parsed=JSON.parse(raw);const first=Array.isArray(parsed)?parsed[0]:parsed;process.stdout.write(first.filename);});')"
TARBALL_PATH="${PACK_DIR}/${TARBALL_NAME}"

if [[ ! -f "${TARBALL_PATH}" ]]; then
  echo "Expected tarball not found: ${TARBALL_PATH}" >&2
  exit 1
fi

cat > "${CONSUMER_DIR}/package.json" <<'EOF'
{
  "name": "aionis-package-release-baseline-consumer",
  "private": true,
  "type": "module"
}
EOF

cp "${VERIFY_ABS_TEMPLATE}" "${CONSUMER_DIR}/verify.mjs"

echo "[package-release] installing tarball into isolated consumer"
npm install --prefix "${CONSUMER_DIR}" "${TARBALL_PATH}" --cache "${CACHE_DIR}" --no-fund --no-audit >/dev/null

echo "[package-release] verifying clean import"
VERIFY_OUTPUT="$(node "${CONSUMER_DIR}/verify.mjs")"

SUMMARY_PATH="${WORKDIR}/release-summary.md"
{
  echo "# Aionis Core Package Release Baseline"
  echo
  echo "- Package: \`${PACKAGE_NAME}@${PACKAGE_VERSION}\`"
  echo "- Workdir: \`${WORKDIR}\`"
  echo "- Tarball: \`${TARBALL_PATH}\`"
  echo "- Consumer: \`${CONSUMER_DIR}\`"
  echo "- Verification: \`ok\`"
  echo
  echo "## Import Smoke"
  echo
  echo '```json'
  printf '%s\n' "${VERIFY_OUTPUT}"
  echo '```'
} > "${SUMMARY_PATH}"

echo "[package-release] summary: ${SUMMARY_PATH}"
