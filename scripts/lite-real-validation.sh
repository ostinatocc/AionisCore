#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/lite-real-validation.sh [--workdir /abs/path]

Behavior:
  - creates an external validation workdir by default
  - keeps smoke logs, benchmark artifacts, and a summary together
  - does not write validation artifacts into the repository tree
EOF
}

WORKDIR="${LITE_REAL_VALIDATION_WORKDIR:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --workdir)
      WORKDIR="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "${WORKDIR}" ]]; then
  WORKDIR="$(mktemp -d /tmp/aionis_lite_real_validation_XXXXXX)"
else
  mkdir -p "${WORKDIR}"
fi

SMOKE_DEFAULT_DIR="${WORKDIR}/smoke-default"
SMOKE_LOCAL_DIR="${WORKDIR}/smoke-local-process"
BENCHMARK_DIR="${WORKDIR}/benchmark"
SUMMARY_FILE="${WORKDIR}/validation-summary.md"

mkdir -p "${SMOKE_DEFAULT_DIR}" "${SMOKE_LOCAL_DIR}" "${BENCHMARK_DIR}"

run_step() {
  local name="$1"
  local logfile="$2"
  shift 2
  echo "==> ${name}"
  "$@" | tee "${logfile}"
}

run_step \
  "smoke:lite" \
  "${SMOKE_DEFAULT_DIR}/run.log" \
  env LITE_SMOKE_WORKDIR="${SMOKE_DEFAULT_DIR}" bash scripts/lite-smoke.sh

run_step \
  "smoke:lite:local-process" \
  "${SMOKE_LOCAL_DIR}/run.log" \
  env LITE_SANDBOX_PROFILE=local_process_echo LITE_SMOKE_WORKDIR="${SMOKE_LOCAL_DIR}" bash scripts/lite-smoke.sh

run_step \
  "benchmark:lite:real" \
  "${BENCHMARK_DIR}/run.log" \
  npx tsx scripts/lite-real-task-benchmark.ts \
    --out-json "${BENCHMARK_DIR}/lite-benchmark.json" \
    --out-md "${BENCHMARK_DIR}/lite-benchmark.md"

cat > "${SUMMARY_FILE}" <<EOF
# Lite Real Validation Summary

Generated at: $(date '+%Y-%m-%d %H:%M:%S %z')

Workdir: ${WORKDIR}

## Runs

1. smoke default: ${SMOKE_DEFAULT_DIR}
2. smoke local-process: ${SMOKE_LOCAL_DIR}
3. benchmark: ${BENCHMARK_DIR}

## Key Artifacts

1. benchmark json: ${BENCHMARK_DIR}/lite-benchmark.json
2. benchmark markdown: ${BENCHMARK_DIR}/lite-benchmark.md
3. smoke default log: ${SMOKE_DEFAULT_DIR}/run.log
4. smoke local-process log: ${SMOKE_LOCAL_DIR}/run.log
5. benchmark log: ${BENCHMARK_DIR}/run.log
EOF

echo
echo "Lite real validation complete."
echo "Workdir: ${WORKDIR}"
echo "Summary: ${SUMMARY_FILE}"
