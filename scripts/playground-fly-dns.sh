#!/usr/bin/env bash
# Playground Fly.io DNS + TLS helper.
#
# Shows exactly which DNS records need to exist at your DNS provider for
# `api-playground.aionis.dev` to resolve at `aionis-playground-api.fly.dev`
# and for Fly to issue a Let's Encrypt certificate. Each record is then
# probed with `dig` so you can tell at a glance what is still missing.
#
# Usage:
#   scripts/playground-fly-dns.sh                    # print + verify only
#   scripts/playground-fly-dns.sh --create-cert      # also run `flyctl certs create`
#   APP=other-app DOMAIN=other.example \
#     scripts/playground-fly-dns.sh
#
# Requirements: flyctl (logged in), dig, jq.

set -euo pipefail

APP="${APP:-aionis-playground-api}"
DOMAIN="${DOMAIN:-api-playground.aionis.dev}"
TARGET_CNAME="${TARGET_CNAME:-${APP}.fly.dev}"
DO_CREATE_CERT=false

for arg in "$@"; do
  case "$arg" in
    --create-cert) DO_CREATE_CERT=true ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^#\s\?//'
      exit 0
      ;;
    *)
      echo "unknown arg: $arg" >&2
      exit 2
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Tool checks.
# ---------------------------------------------------------------------------

need() {
  local bin="$1"
  local hint="$2"
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "missing '$bin' on PATH. ${hint}" >&2
    exit 3
  fi
}

need flyctl "Install from https://fly.io/docs/flyctl/install/ and run 'flyctl auth login'."
need dig    "On macOS it ships with bind-tools / dig (try: brew install bind)."
need jq     "Install with: brew install jq."

# ---------------------------------------------------------------------------
# Pretty printing helpers.
# ---------------------------------------------------------------------------

ansi_bold=$(printf '\033[1m')
ansi_green=$(printf '\033[32m')
ansi_yellow=$(printf '\033[33m')
ansi_red=$(printf '\033[31m')
ansi_reset=$(printf '\033[0m')

say()   { printf '%s%s%s\n' "$ansi_bold" "$*" "$ansi_reset"; }
ok()    { printf '%s✓%s %s\n' "$ansi_green" "$ansi_reset" "$*"; }
warn()  { printf '%s!%s %s\n' "$ansi_yellow" "$ansi_reset" "$*"; }
bad()   { printf '%s✗%s %s\n' "$ansi_red" "$ansi_reset" "$*"; }
rule()  { printf '\n%s%s%s\n' "$ansi_bold" "$(printf '%0.s─' $(seq 1 62))" "$ansi_reset"; }

# ---------------------------------------------------------------------------
# 1. Ensure the Fly cert record exists (optionally create it).
# ---------------------------------------------------------------------------

rule
say "1. Fly certificate for ${DOMAIN}"

if $DO_CREATE_CERT; then
  if flyctl certs list --app "$APP" --json 2>/dev/null | jq -e --arg d "$DOMAIN" '.[] | select(.Hostname == $d)' >/dev/null; then
    ok "cert entry already exists — no need to create it again"
  else
    say "creating cert entry via flyctl…"
    flyctl certs create "$DOMAIN" --app "$APP"
  fi
else
  warn "skipping 'flyctl certs create' (pass --create-cert to run it)"
fi

# ---------------------------------------------------------------------------
# 2. Fetch the current cert status and print required DNS records.
# ---------------------------------------------------------------------------

rule
say "2. Required DNS records at your provider (Cloudflare, Route 53, …)"

cat <<EOF

  ${ansi_bold}Record A (primary routing):${ansi_reset}
    Type    : CNAME
    Name    : ${DOMAIN}
    Value   : ${TARGET_CNAME}
    TTL     : 300 (or provider default)

  ${ansi_bold}Record B (ACME DNS-01 challenge, only if Fly asks for it):${ansi_reset}
    Fly will print the exact name/value below under
    "DNS validation instructions". Add that CNAME too.

EOF

# Ask Fly for the canonical record set.
CERT_JSON="$(flyctl certs show "$DOMAIN" --app "$APP" --json 2>/dev/null || true)"
if [[ -z "$CERT_JSON" ]]; then
  warn "no cert entry on Fly yet. Run this script with --create-cert first."
else
  DNS_TARGET=$(echo "$CERT_JSON" | jq -r '.DnsValidationTarget // empty')
  DNS_HOST=$(echo "$CERT_JSON" | jq -r '.DnsValidationHostname // empty')
  DNS_INSTR=$(echo "$CERT_JSON" | jq -r '.DnsValidationInstructions // empty')
  CONFIGURED=$(echo "$CERT_JSON" | jq -r '.Configured // false')
  ACME_DNS=$(echo "$CERT_JSON" | jq -r '.AcmeDnsConfigured // false')
  ISSUED=$(echo "$CERT_JSON" | jq -r '.ClientStatus // empty')

  if [[ -n "$DNS_INSTR" && "$DNS_INSTR" != "null" ]]; then
    say "Fly's own instructions:"
    printf '  %s\n' "$DNS_INSTR"
  fi
  if [[ -n "$DNS_HOST" && "$DNS_HOST" != "null" ]]; then
    printf '\n  ACME CNAME:\n    Name  : %s\n    Value : %s\n' "$DNS_HOST" "$DNS_TARGET"
  fi
  echo
  say "Fly sees:"
  printf '  configured (CNAME)     : %s\n' "$CONFIGURED"
  printf '  acme_dns_configured    : %s\n' "$ACME_DNS"
  printf '  client_status          : %s\n' "${ISSUED:-unknown}"
fi

# ---------------------------------------------------------------------------
# 3. Probe each record with `dig` using a public resolver.
# ---------------------------------------------------------------------------

rule
say "3. Live DNS probe against 1.1.1.1"

RESOLVER="1.1.1.1"

probe_cname() {
  local host="$1"
  local expected="$2"
  local answer
  answer=$(dig @"$RESOLVER" +short CNAME "$host" | sed 's/\.$//')
  if [[ -z "$answer" ]]; then
    bad "CNAME $host  (no record yet)"
    return 1
  fi
  if [[ "$answer" == "$expected" ]]; then
    ok "CNAME $host → $answer"
  else
    warn "CNAME $host → $answer  (expected $expected)"
  fi
}

probe_resolution() {
  local host="$1"
  local a4 a6
  a4=$(dig @"$RESOLVER" +short A "$host" | tr '\n' ' ')
  a6=$(dig @"$RESOLVER" +short AAAA "$host" | tr '\n' ' ')
  if [[ -z "$a4" && -z "$a6" ]]; then
    bad "$host has no A/AAAA yet"
    return 1
  fi
  [[ -n "$a4" ]] && ok "$host A    $a4"
  [[ -n "$a6" ]] && ok "$host AAAA $a6"
}

probe_cname "$DOMAIN" "$TARGET_CNAME" || true
probe_resolution "$DOMAIN" || true

if [[ -n "${DNS_HOST:-}" && "$DNS_HOST" != "null" ]]; then
  probe_cname "$DNS_HOST" "$DNS_TARGET" || true
fi

# ---------------------------------------------------------------------------
# 4. Final HTTP sanity check if the name already resolves.
# ---------------------------------------------------------------------------

rule
say "4. HTTPS reachability"

if command -v curl >/dev/null 2>&1; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "https://${DOMAIN}/health" || true)
  if [[ "$STATUS" == "200" ]]; then
    ok "https://${DOMAIN}/health  →  200"
  else
    warn "https://${DOMAIN}/health  →  ${STATUS:-no response}  (DNS or TLS may still be propagating)"
  fi
else
  warn "curl not found — skipping HTTPS probe"
fi

echo
say "Done. Re-run this script after editing DNS to watch the status flip from ✗ to ✓."
