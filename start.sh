#!/usr/bin/env bash
cd "$(dirname "$0")"
PORT="${PORT:-8000}"
while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done
printf 'Iniciando o servidor PHP em http://127.0.0.1:%s\n' "$PORT"
php -S "127.0.0.1:$PORT" -t .
