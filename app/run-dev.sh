set -euo pipefail
script_dirpath="$(cd "$(dirname "${0}")" && pwd)"

npm install

# Wait for Postgres to be ready (it should already be starting via compose)
echo "Waiting for Postgres to be ready..."
until pg_isready -h postgres -U vision_user -d vision_app; do
  echo "Postgres is unavailable - sleeping"
  sleep 1
done
echo "Postgres is ready!"

# Start API server in background
npm run dev &

# Start Vite dev server
npx vite --host 0.0.0.0 --port 5173
