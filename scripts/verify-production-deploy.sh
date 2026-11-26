#!/usr/bin/env bash
# Proves production serves this checkout's build: waits until the live
# index.html is byte-identical to app/dist/index.html (Vite names assets by
# content hash, so identical HTML means identical bundles), a client-side
# route serves that same index.html, and a missing asset is a 404. Then checks
# every asset index.html references loads. The routing checks sit inside the
# wait because a change to app/vercel.json alone leaves index.html unchanged.
# Run `make build` first. Fails loudly on timeout.
set -euo pipefail
script_dirpath="$(cd "$(dirname "${0}")" && pwd)"

PRODUCTION_URL="${PRODUCTION_URL:-https://man-vs-myopia-app.vercel.app}"
# Vercel's production deploys have landed in under a minute; ten covers a slow queue.
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-600}"
POLL_INTERVAL_SECONDS=15
# A route only the client-side router knows; the server must answer it with index.html.
DEEP_LINK_PATH="/login"
# No build emits this name, so the server must 404 it rather than fall back to index.html.
MISSING_ASSET_PATH="/assets/verify-production-deploy-missing-asset.js"

expected_index_filepath="${script_dirpath}/../app/dist/index.html"
if [[ ! -f "${expected_index_filepath}" ]]; then
    echo "ERROR: No build at '${expected_index_filepath}'; run 'make build' first." >&2
    exit 1
fi

live_index_filepath="$(mktemp)"
live_deep_link_filepath="$(mktemp)"
trap 'rm -f "${live_index_filepath}" "${live_deep_link_filepath}"' EXIT

# Prints why production does not yet serve this build, and returns 1; returns 0 when it does.
check_production_serves_build() {
    if ! curl --fail --silent --show-error "${PRODUCTION_URL}/" --output "${live_index_filepath}"; then
        echo "'${PRODUCTION_URL}/' did not load"
        return 1
    fi
    if ! cmp -s "${expected_index_filepath}" "${live_index_filepath}"; then
        echo "'${PRODUCTION_URL}/' does not serve this build's index.html"
        return 1
    fi
    if ! curl --fail --silent --show-error "${PRODUCTION_URL}${DEEP_LINK_PATH}" --output "${live_deep_link_filepath}"; then
        echo "deep link '${PRODUCTION_URL}${DEEP_LINK_PATH}' did not return 200"
        return 1
    fi
    if ! cmp -s "${expected_index_filepath}" "${live_deep_link_filepath}"; then
        echo "deep link '${PRODUCTION_URL}${DEEP_LINK_PATH}' does not serve this build's index.html"
        return 1
    fi
    local missing_asset_status
    missing_asset_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "${PRODUCTION_URL}${MISSING_ASSET_PATH}")"
    if [[ "${missing_asset_status}" != "404" ]]; then
        echo "missing asset '${PRODUCTION_URL}${MISSING_ASSET_PATH}' returned ${missing_asset_status}, not 404"
        return 1
    fi
    return 0
}

deadline_epoch="$(( $(date +%s) + TIMEOUT_SECONDS ))"
until failure_reason="$(check_production_serves_build)"; do
    if (( $(date +%s) >= deadline_epoch )); then
        echo "ERROR: After ${TIMEOUT_SECONDS}s, production does not serve this commit's build: ${failure_reason}." >&2
        echo "Expected index.html:" >&2
        cat "${expected_index_filepath}" >&2
        echo "Live index.html:" >&2
        cat "${live_index_filepath}" >&2
        exit 1
    fi
    echo "Production does not serve this build yet (${failure_reason}); retrying in ${POLL_INTERVAL_SECONDS}s"
    sleep "${POLL_INTERVAL_SECONDS}"
done
echo "Production index.html matches this build, '${DEEP_LINK_PATH}' serves it, and a missing asset is a 404."

asset_paths="$(grep --only-matching --extended-regexp '/assets/[^"]+' "${expected_index_filepath}")"
for asset_path in ${asset_paths}; do
    content_type="$(curl --fail --silent --show-error --output /dev/null --write-out '%{content_type}' "${PRODUCTION_URL}${asset_path}")"
    # A catch-all SPA rewrite answers a missing asset with index.html and a 200.
    if [[ "${content_type}" == text/html* ]]; then
        echo "ERROR: '${PRODUCTION_URL}${asset_path}' came back as '${content_type}', so the asset is missing." >&2
        exit 1
    fi
    echo "Loaded '${PRODUCTION_URL}${asset_path}' as '${content_type}'"
done
echo "Production at '${PRODUCTION_URL}' serves this commit's build."
