# ⚡ AI Performance Testing Assistant

> **An autonomous AI Performance Engineer** that discovers APIs, generates load tests, runs performance analysis, and delivers executive recommendations — replacing traditional performance engineering overhead.

![Version](https://img.shields.io/badge/version-1.0.0-blue)

---

## 🎯 Overview

The AI Performance Testing Assistant automates the entire performance testing lifecycle:

1. **🔍 API Discovery** — Analyzes Swagger definitions and auto-discovers critical business journeys
2. **📝 Script Generation** — Produces k6/JMeter/Gatling load test scripts
3. **⚡ Test Execution** — Runs tests at 50, 200, 500, and 1000 virtual users
4. **🧠 AI Analysis** — Identifies bottlenecks, response time issues, and resource saturation
5. **📊 Executive Dashboards** — Generates real-time Grafana dashboards and AI-powered reports
6. **💡 Recommendations** — Delivers prioritized scaling and optimization actions

## 🏗️ Project Structure

```
├── frontend/                    # React E-Commerce UI (Customer + Admin)
│   ├── src/
│   │   ├── pages/               # 12 page components
│   │   ├── components/          # Reusable UI components
│   │   ├── context/             # Auth context
│   │   └── services/            # API service layer
│   └── Dockerfile               # Frontend container
│
├── backend/                     # Node.js + Express API
│   ├── routes/                  # auth, products, cart, orders, admin, users
│   ├── middleware/              # auth, metrics (Prometheus), error handling
│   ├── database/                # migrations + seed data
│   ├── server.js                # Express server entry (port 5000)
│   ├── db.js                    # Shared PostgreSQL pool
│   └── swagger.js               # Inline Swagger documentation
│
├── database/                    # SQL schema & setup scripts
├── swagger/                     # Exportable OpenAPI 3.0 specification
│
├── performance-tests/
│   ├── k6/                      # Load test scripts
│   │   ├── smoke_test.js        #    50 users (5min)
│   │   ├── average_load_test.js #   200 users (15min)
│   │   ├── peak_load_test.js    #   500 users (15min)
│   │   └── black_friday_test.js #  1000 users (15min)
│   └── jmeter/                  # JMeter placeholder & docs
│
├── ai-orchestrator/             # AI Analysis Engine
│   └── analyze.js               # Bottleneck detection + report generation
│
├── prometheus/                  # Monitoring configuration
│   └── prometheus.yml           # Metrics scraping rules
│
├── grafana-dashboard/           # Grafana dashboards
│   ├── dashboards.yml           # Provisioning config
│   └── ecommerce-performance-dashboard.json
│
├── reports/                     # Generated AI findings & reports
│   ├── sample_findings.md
│   └── sample_report.html
│
├── docs/                        # Documentation
│   ├── deployment.md
│   └── architecture.md
│
├── docker-compose.yml           # Full stack orchestration
└── package.json                 # Root orchestration scripts
```

## 🚀 Quick Start

### Docker (Recommended)

```bash
docker-compose up -d
```
### Manual Setup

```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ../frontend && npm install && cd ..

# 2. Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE ecommerce_perf"

# 3. Initialize database
cd backend && node database/migrate.js && node database/seed.js && cd ..

# 4. Start both servers
npm run dev
```

### Test Accounts

| Role     | Email               | Password      |
|----------|---------------------|---------------|
| Admin    | admin@shop.com      | password123   |
| Customer | john@example.com    | password123   |

## 🧪 Running Performance Tests

### Smoke Test (50 users — basic validation)
```bash
k6 run performance-tests/k6/smoke_test.js
```

### Average Load (200 users — normal traffic)
```bash
k6 run performance-tests/k6/average_load_test.js
```

### Peak Sale (500 users — flash sale simulation)
```bash
k6 run performance-tests/k6/peak_load_test.js
```

### Black Friday (1000 users — extreme peak)
```bash
k6 run performance-tests/k6/black_friday_test.js
```

### AI Analysis
```bash
cd ai-orchestrator && node analyze.js --run-analysis
```

## 🧠 AI Capabilities

### Automated API Discovery
Reads OpenAPI/Swagger definitions and maps business journeys:
```
Login → Search Products → View Details → Add to Cart → Checkout → Payment
```

### Bottleneck Detection
The AI engine analyzes:
- **Response times** per endpoint with baseline comparison
- **Error rates** with trend analysis
- **CPU & memory** utilization patterns
- **Database query** performance and connection pool usage
- **Throughput** degradation points

### Generated Findings Example
```
🔴 Login API starts failing after 300 users
   Response time: 250ms → 2.8s (+1020%)

🔴 Checkout response time increased 4x
   Response time: 2s → 8.5s (+325%)

🟡 Product search DB query contributes 70% slowdown
   Query time: 120ms → 1.4s
```

## 📊 Executive Dashboard Features

| Feature | Description |
|---------|-------------|
| User Capacity | Visual threshold analysis showing degradation points |
| Revenue Impact | $ amount at risk due to performance bottlenecks |
| Infrastructure Health | CPU, Memory, Connection Pool real-time status |
| Response Time Trends | Per-endpoint latency comparison with baselines |
| Bottleneck Distribution | Severity-categorized findings with AI analysis |
| Scaling Recommendations | Phased action plan with effort/impact estimates |

## 🔐 Security

- **Zero credential storage** — passwords hashed with bcrypt
- **JWT tokens** with configurable expiry
- **AI receives metadata only** — API names, response times, error rates
- **Rate limiting** on all endpoints
- **SQL injection protection** via parameterized queries
- **CORS** configured for production origins

## 🛠️ Technology Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 18, React Router, Recharts    |
| Backend     | Node.js, Express, Prometheus Client |
| Database    | PostgreSQL 15                       |
| Monitoring  | Prometheus, Grafana                 |
| Load Tests  | k6                                  |
| AI Engine   | Node.js (standalone analyzer)       |
| Deployment  | Docker, Docker Compose              |
| API Docs    | Swagger/OpenAPI 3.0                 |

## 📈 Performance Test Coverage

| Endpoint          | Method | Business Journey         |
|-------------------|--------|--------------------------|
| /api/auth/register| POST   | User Registration        |
| /api/auth/login   | POST   | Authentication           |
| /api/products     | GET    | Product Search/Browse    |
| /api/products/:slug| GET   | Product Details          |
| /api/cart         | POST   | Add to Cart              |
| /api/orders       | POST   | Checkout & Payment       |

## 🏢 Business Value

| Traditional Approach | AI Performance Testing Assistant |
|---------------------|----------------------------------|
| 2-3 weeks setup      | 5 minutes to deploy              |
| $15-25K per project  | Free (open source)               |
| Manual bottleneck analysis | Automated AI detection      |
| Static reports       | Dynamic executive dashboards     |
| Specialist required  | Self-service by any dev          |

---

<p align="center">
  ⚡ Built with AI for the future of performance engineering
</p>
