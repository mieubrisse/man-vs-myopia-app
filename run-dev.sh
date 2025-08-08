set -euo pipefail
script_dirpath="$(cd "$(dirname "${0}")" && pwd)"

npm install

npm run dev
