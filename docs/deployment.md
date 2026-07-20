# Deployment Guide

## Quick Start with Docker Compose

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### Steps

```bash
# 1. Clone the repository
git clone <repo-url> ai-performance-testing
cd ai-performance-testing

# 2. Start all services
docker-compose up -d

# 3. Verify services are running
docker-compose ps

# 4. Access the applications
# Frontend:   http://localhost:80
# Backend:    http://localhost:5000
# API Docs:   http://localhost:5000/api-docs
# Prometheus: http://localhost:9090
# Grafana:    http://localhost:3000 (admin/admin)
```

## Manual Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm 8+

### Backend Setup

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Set up PostgreSQL database
psql -U postgres
CREATE DATABASE ecommerce_perf;
\q

# 3. Run migrations
npm run db:migrate

# 4. Seed data
npm run db:seed

# 5. Start the server
npm run dev
```

### Frontend Setup

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Start development server
npm start
```

### Environment Variables

#### Backend (.env)
```
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_perf
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-here
```

#### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
```

## Running Performance Tests

### k6 (Recommended)

```bash
# Install k6 (Windows - Chocolatey)
choco install k6

# Or download from: https://k6.io/docs/getting-started/installation/

# Run smoke test (50 users)
k6 run performance-tests/k6/smoke_test.js

# Run average load test (200 users)
k6 run performance-tests/k6/average_load_test.js

# Run peak load test (500 users)
k6 run performance-tests/k6/peak_load_test.js

# Run Black Friday simulation (1000 users)
k6 run performance-tests/k6/black_friday_test.js
```

### AI Analysis

```bash
# Run AI analysis engine
cd ai-orchestrator
node analyze.js --run-analysis
```

## Monitoring Setup

### Prometheus
```bash
# Bare-metal installation
# Download from: https://prometheus.io/download/
./prometheus --config.file=prometheus/prometheus.yml
```

### Grafana
```bash
# Bare-metal installation
# Download from: https://grafana.com/grafana/download
# Import dashboard from grafana-dashboard/ecommerce-performance-dashboard.json
```

### PostgreSQL Exporter (Optional)
```bash
docker run -d --name pg-exporter \
  -e DATA_SOURCE_NAME="postgresql://postgres:postgres@localhost:5432/ecommerce_perf?sslmode=disable" \
  -p 9187:9187 \
  prometheuscommunity/postgres-exporter:latest
```

## Security Notes

- Change all default passwords before production deployment
- JWT_SECRET must be a strong, unique value in production
- Use Vault or AWS Secrets Manager for secrets management
- The AI Analysis Engine only receives metadata (response times, error rates) - never raw credentials
- All database connections should use SSL in production
