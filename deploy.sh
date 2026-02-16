#!/usr/bin/env bash
set -euo pipefail

# ─── Config ──────────────────────────────────────────
REPO="https://github.com/webiumsk/social-manager.git"
DEPLOY_DIR="/opt/posthorn"
BRANCH="main"
APP_NAME="posthorn_prod"

# ─── Colors ──────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Pre-checks ─────────────────────────────────────
cd "$DEPLOY_DIR" || error "Deploy directory $DEPLOY_DIR not found"
[ -f ".env.production" ] || error ".env.production not found"
command -v docker >/dev/null 2>&1 || error "Docker not installed"
command -v docker compose >/dev/null 2>&1 || error "Docker Compose not installed"

# ─── Pull latest code ───────────────────────────────
if [ -d ".git" ]; then
    log "Pulling latest from $BRANCH..."
    git fetch origin
    git reset --hard "origin/$BRANCH"
    git clean -fd
else
    log "Cloning repository..."
    cd /tmp
    git clone --branch "$BRANCH" "$REPO" posthorn_clone
    cp -r posthorn_clone/* posthorn_clone/.* "$DEPLOY_DIR/" 2>/dev/null || true
    rm -rf posthorn_clone
    cd "$DEPLOY_DIR"
fi

# ─── Load BETTER_AUTH_SECRET for build arg ───────────
export $(grep -v '^#' .env.production | grep BETTER_AUTH_SECRET | xargs)
[ -n "${BETTER_AUTH_SECRET:-}" ] || error "BETTER_AUTH_SECRET not set in .env.production"

# ─── Build & Deploy ─────────────────────────────────
log "Building Docker image..."
docker compose build --no-cache

log "Stopping old container..."
docker compose down --remove-orphans 2>/dev/null || true

log "Starting new container..."
docker compose up -d

# ─── Healthcheck ─────────────────────────────────────
log "Waiting for healthcheck..."
sleep 5

for i in $(seq 1 12); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$APP_NAME" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
        log "Container is healthy!"
        break
    fi
    if [ "$i" -eq 12 ]; then
        warn "Healthcheck timeout — check logs: docker logs $APP_NAME"
    fi
    sleep 5
done

# ─── Cleanup ─────────────────────────────────────────
log "Cleaning up old Docker images..."
docker image prune -f >/dev/null 2>&1

# ─── Status ──────────────────────────────────────────
echo ""
log "═══════════════════════════════════════"
log "  Posthorn deployed successfully!"
log "  URL: https://post.dvadsatjeden.org"
log "  Logs: docker logs -f $APP_NAME"
log "═══════════════════════════════════════"