set -euo pipefail

cd "$(dirname "${0}")"

npm install

# Wait for Postgres to be ready (it should already be starting via compose)
echo "Waiting for Postgres to be ready..."
until pg_isready -h postgres -U vision_user -d vision_app; do
  echo "Postgres is unavailable - sleeping"
  sleep 1
done
echo "Postgres is ready!"

npm run dev
