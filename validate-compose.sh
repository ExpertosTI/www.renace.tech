#!/bin/bash
# ==============================================================================
# validate-compose.sh — Validate docker-compose.yml for Renace Protocol
# ==============================================================================
# Usage: ./validate-compose.sh <path-to-docker-compose.yml>

set -e

FILE="${1:-docker-compose.yml}"
ERRORS=0
WARNINGS=0

if [ ! -f "$FILE" ]; then
    echo "❌ File not found: $FILE"
    exit 1
fi

echo "🔍 Validating: $FILE"
echo "════════════════════════════════════════"

# --- Check 1: Traefik labels ---
if grep -q "traefik.enable=true" "$FILE"; then
    echo "✅ Traefik labels found"
    
    # Check for HTTPS router
    if grep -q "entrypoints=websecure" "$FILE"; then
        echo "✅ HTTPS entrypoint configured"
    else
        echo "❌ Missing HTTPS entrypoint (websecure)"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for certresolver
    if grep -q "certresolver=letsencryptresolver" "$FILE"; then
        echo "✅ TLS certresolver configured"
    else
        echo "❌ Missing TLS certresolver"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for HTTP → HTTPS redirect
    if grep -q "redirectscheme.scheme=https" "$FILE"; then
        echo "✅ HTTP → HTTPS redirect configured"
    else
        echo "⚠️  No HTTP → HTTPS redirect (optional but recommended)"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check for loadbalancer port
    if grep -q "loadbalancer.server.port" "$FILE"; then
        echo "✅ Load balancer port configured"
    else
        echo "❌ Missing loadbalancer.server.port"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for docker network label
    if grep -q "traefik.docker.network=RenaceNet" "$FILE"; then
        echo "✅ Docker network label set to RenaceNet"
    else
        echo "⚠️  Missing traefik.docker.network=RenaceNet (may cause routing issues)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "❌ No Traefik labels found — service won't be routed"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# --- Check 2: RenaceNet ---
if grep -q "RenaceNet" "$FILE"; then
    echo "✅ RenaceNet network referenced"
    if grep -A1 "RenaceNet" "$FILE" | grep -q "external: true"; then
        echo "✅ RenaceNet declared as external"
    else
        echo "⚠️  RenaceNet may not be declared as external"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "❌ RenaceNet not found — service can't communicate with Traefik"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# --- Check 3: Direct port exposure ---
# Look for top-level 'ports:' that map to host (excluding mail/non-HTTP)
if grep -E "^\s+ports:" "$FILE" > /dev/null 2>&1; then
    PORT_LINES=$(grep -A5 "^\s+ports:" "$FILE" | grep -E '"\d+:\d+"' | grep -v -E "(25:|465:|587:|993:|4190:)" || true)
    if [ -n "$PORT_LINES" ]; then
        echo "⚠️  Direct port exposure detected (should use Traefik instead):"
        echo "$PORT_LINES" | sed 's/^/    /'
        WARNINGS=$((WARNINGS + 1))
    else
        echo "✅ No unnecessary direct port exposure"
    fi
else
    echo "✅ No direct port exposure"
fi

echo ""

# --- Check 4: Healthcheck ---
if grep -q "healthcheck" "$FILE"; then
    echo "✅ Healthcheck configured"
else
    echo "⚠️  No healthcheck found (recommended for production)"
    WARNINGS=$((WARNINGS + 1))
fi

# --- Check 5: Resource limits ---
if grep -q "resources:" "$FILE"; then
    echo "✅ Resource limits configured"
else
    echo "⚠️  No resource limits (recommended to prevent OOM on VPS)"
    WARNINGS=$((WARNINGS + 1))
fi

# --- Check 6: Logging ---
if grep -q "logging:" "$FILE"; then
    echo "✅ Logging driver configured"
else
    echo "⚠️  No logging configuration (default may fill disk)"
    WARNINGS=$((WARNINGS + 1))
fi

# --- Check 7: deploy section ---
if grep -q "deploy:" "$FILE"; then
    echo "✅ Deploy section found (Swarm-compatible)"
else
    echo "⚠️  No deploy section — will work with docker-compose but not docker stack deploy"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "════════════════════════════════════════"
echo "Results: $ERRORS error(s), $WARNINGS warning(s)"

if [ $ERRORS -gt 0 ]; then
    echo "❌ FAIL — Fix errors before deploying"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo "⚠️  PASS with warnings"
    exit 0
else
    echo "✅ PASS — Ready to deploy"
    exit 0
fi
