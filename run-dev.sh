set -euo pipefail
script_dirpath="$(cd "$(dirname "${0}")" && pwd)"

npm install

npm run dev &

# Do Vercel second, so we can log in as necessary
npm run dev:vercel
