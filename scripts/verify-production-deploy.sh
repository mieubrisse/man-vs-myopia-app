#!/usr/bin/env bash
# Proves production serves this checkout's build: waits until the live
# index.html is byte-identical to app/dist/index.html (Vite names assets by
# content hash, so identical HTML means identical bundles), then checks every
# asset it references loads. Run `make build` first. Fails loudly on timeout.
set -euo pipefail
script_dirpath="$(cd "$(dirname "${0}")" && pwd)"

PRODUCTION_URL="${PRODUCTION_URL:-https://man-vs-myopia-app.vercel.app}"
# Vercel's production deploys have landed in under a minute; ten covers a slow queue.
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-600}"
POLL_INTERVAL_SECONDS=15

expected_index_filepath="${script_dirpath}/../app/dist/index.html"
if [[ ! -f "${expected_index_filepath}" ]]; then
    echo "ERROR: No build at '${expected_index_filepath}'; run 'make build' first." >&2
    exit 1
fi

live_index_filepath="$(mktemp)"
trap 'rm -f "${live_index_filepath}"' EXIT

deadline_epoch="$(( $(date +%s) + TIMEOUT_SECONDS ))"
until curl --fail --silent --show-error "${PRODUCTION_URL}/" --output "${live_index_filepath}" \
        && cmp -s "${expected_index_filepath}" "${live_index_filepath}"; do
    if (( $(date +%s) >= deadline_epoch )); then
        echo "ERROR: After ${TIMEOUT_SECONDS}s, '${PRODUCTION_URL}/' still does not serve this commit's build." >&2
        echo "Expected index.html:" >&2
        cat "${expected_index_filepath}" >&2
        echo "Live index.html:" >&2
        cat "${live_index_filepath}" >&2
        exit 1
    fi
    echo "Production does not serve this build yet; retrying in ${POLL_INTERVAL_SECONDS}s"
    sleep "${POLL_INTERVAL_SECONDS}"
done
echo "Production index.html matches this build."

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
