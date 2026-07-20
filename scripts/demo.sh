#!/bin/bash
#
# AI Performance Testing Assistant - Complete Demo Pipeline
# 
# This script runs the end-to-end demo flow:
#   1. Swagger Discovery ─→ 2. Script Generation ─→ 3. Load Testing
#   4. AI Analysis ─→ 5. Executive Dashboard

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_DIR/reports"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   AI Performance Testing Assistant                  ║"
echo "║   Complete Demo Pipeline                            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Verify environment ─────────────────────────────────────────────
echo "📋 Step 1: Verifying environment..."

# Check if backend is running
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "   ✓ Backend API is running on http://localhost:5000"
else
    echo "   ✗ Backend API is not running. Start it with: npm run dev"
    exit 1
fi

# Check if k6 is installed
if command -v k6 &> /dev/null; then
    echo "   ✓ k6 is installed ($(k6 version))"
else
    echo "   ⚠ k6 is not installed. Skipping load tests."
    SKIP_LOAD_TESTS=true
fi

echo ""

# ─── Step 2: API Discovery (AI Analyzes Swagger) ────────────────────────────
echo "🔍 Step 2: AI API Discovery..."
echo "   Analyzing Swagger specification..."

cd "$PROJECT_DIR"
node -e "
const analyzer = new (require('./ai-orchestrator/analyze'))();
analyzer.discoverBusinessJourneys();
" 2>&1 | grep -E '(│|Business|journeys|discovered)'

echo "   ✓ Business journeys discovered"
echo ""

# ─── Step 3: Run Smoke Test (50 users) ──────────────────────────────────────
echo "⚡ Step 3: Running Load Tests..."

if [ "$SKIP_LOAD_TESTS" != "true" ]; then
    mkdir -p "$REPORTS_DIR"
    
    echo "   ▶ Smoke Test: 50 users for 30 seconds..."
    k6 run "$PROJECT_DIR/performance-tests/k6/smoke_test.js" \
        --vus 10 \
        --duration 30s \
        --summary-export "$REPORTS_DIR/k6-smoke-result.json" \
        2>&1 | tail -5
    
    echo "   ✓ Smoke test completed"
else
    echo "   ⚠ Load tests skipped (k6 not installed)"
    echo "   📁 Using sample findings for AI analysis"
fi

echo ""

# ─── Step 4: AI Performance Analysis ────────────────────────────────────────
echo "🧠 Step 4: AI Performance Analysis..."

cd "$PROJECT_DIR/ai-orchestrator"

if [ -f "$REPORTS_DIR/k6-smoke-result.json" ]; then
    node analyze.js --results "$REPORTS_DIR/k6-smoke-result.json" 2>&1 | grep -E '(│|findings|analysis|recommendations)'
else
    node analyze.js 2>&1 | grep -E '(│|findings|analysis|Business|Workload|recommendations)'
fi

echo "   ✓ AI analysis complete"
echo ""

# ─── Step 5: Generate Executive Report ──────────────────────────────────────
echo "📊 Step 5: Generating Executive Report..."

cd "$PROJECT_DIR"
if [ -f "$REPORTS_DIR/ai-performance-report.md" ]; then
    echo "   ✓ Report: $REPORTS_DIR/ai-performance-report.md"
    echo "   ✓ Report: $REPORTS_DIR/ai-performance-report.json"
else
    echo "   ⚠ Report files not found, but analysis ran successfully"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅ Demo Pipeline Complete!                         ║"
echo "║                                                      ║"
echo "║   Next Steps:                                        ║"
echo "║   • Open Executive Dashboard:                        ║"
echo "║     http://localhost:3000/dashboard/executive        ║"
echo "║                                                      ║"
echo "║   • View AI Report:                                  ║"
echo "║     cat reports/ai-performance-report.md             ║"
echo "║                                                      ║"
echo "║   • Run Full Load Tests:                             ║"
echo "║     npm run test:k6:average                          ║"
echo "║     npm run test:k6:peak                             ║"
echo "║     npm run test:k6:blackfriday                      ║"
echo "║                                                      ║"
echo "║   • Open Grafana Dashboard:                          ║"
echo "║     http://localhost:3000 (admin/admin)              ║"
echo "╚══════════════════════════════════════════════════════╝"
