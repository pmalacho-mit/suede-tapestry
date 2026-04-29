DIRNAME="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKERFILE="${DIRNAME}/compose.yml"
docker compose -f $"${DIRNAME}/compose.yml" down && docker compose -f $"${DIRNAME}/compose.yml" up --build yjs-websocket-server