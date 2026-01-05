#!/bin/sh

PUID=${PUID:-1000}
PGID=${PGID:-1000}
SPOOLMAN_PORT=${SPOOLMAN_PORT:-8000}
SPOOLMAN_HOST=${SPOOLMAN_HOST:-0.0.0.0}

groupmod -o -g "$PGID" app
usermod -o -u "$PUID" app

# Fix ownership of application files if UID/GID changed
if [ "$PUID" != "1000" ] || [ "$PGID" != "1000" ]; then
    echo "Fixing file ownership for UID:$PUID GID:$PGID..."
    chown -R app:app /home/app/spoolman
fi

echo User UID: $(id -u app)
echo User GID: $(id -g app)

echo "Starting uvicorn..."

# Execute the uvicorn command with any additional arguments
exec su-exec "app" uvicorn spoolman.main:app --host $SPOOLMAN_HOST --port $SPOOLMAN_PORT "$@"
