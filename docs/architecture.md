# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User / Load Tester                            │
└───────────────────┬──────────────────────┬──────────────────────────┘
                    │                      │
                    ▼                      ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│     React Frontend       │  │    k6 / JMeter           │
│  (Customer + Admin UI)   │  │  (Performance Tests)     │
│  Port: 3000              │  │  CLI-based               │
└───────────┬──────────────┘  └───────────┬──────────────┘
            │                              │
            ▼                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Express REST API (Port: 5000)                     │
│                                                                      │
│  ┌────────┐  ┌──────────┐  ┌────────┐  ┌─────────┐  ┌───────────┐ │
│  │ Auth   │  │ Products │  │ Cart   │  │ Orders  │  │ Admin     │ │
│  │ Routes │  │ Routes   │  │ Routes │  │ Routes  │  │ Routes    │ │
│  └────┬───┘  └────┬─────┘  └────┬───┘  └────┬────┘  └─────┬─────┘ │
│       │           │              │           │              │       │
│  ┌────▼───────────▼──────────────▼───────────▼──────────────▼─────┐ │
│  │                    Prometheus Metrics Middleware                 │ │
│  │  - Request Duration  - Error Rates  - DB Query Times            │ │
│  │  - Active Users     - Order Count   - Revenue Tracking          │ │
│  └──────────────────────────────┬──────────────────────────────────┘ │
│                                 │                                    │
│  ┌──────────────────────────────▼──────────────────────────────────┐ │
│  │                      PostgreSQL Database                         │ │
│  │  Tables: users, products, categories, cart, orders, payments    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Monitoring Stack                                 │
├─────────────────────────┬────────────────────────────────────────────┤
│  Prometheus (Port: 9090)│  Grafana (Port: 3000)                     │
│  - Metrics Collection   │  - Performance Dashboards                 │
│  - Alerting Rules       │  - CPU/Memory/Response Time Charts       │
│  - 30-day Retention     │  - Revenue & Business Metrics            │
└─────────────────────────┴────────────────────────────────────────────┘
```

## Data Flow

### Performance Testing Flow
```
1. Swagger/API Discovery  →  AI identifies business journeys
2. Script Generation      →  AI generates k6/JMeter scripts
3. Test Execution         →  k6 simulates virtual users
4. Metrics Collection     →  Prometheus scrapes metrics
5. AI Analysis            →  Engine detects bottlenecks
6. Report Generation      →  Executive dashboard & reports
7. Recommendations        →  AI suggests scaling actions
```

### Business Transaction Flow
```
Login → Search Products → View Details → Add to Cart → Checkout → Payment
```

## AI Analysis Pipeline

```
┌──────────────────────────────────────────────────────────────────────┐
│                     AI Analysis Pipeline                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Input:  • Response Times    • Throughput     • Error Rates          │
│          • CPU/Memory Usage  • DB Query Times  • Connection Pool     │
│                                                                      │
│  Analysis: • Threshold Comparison  • Trend Analysis                  │
│            • Bottleneck Detection   • Correlation Analysis           │
│                                                                      │
│  Output:  • Performance Findings   • Scaling Recommendations        │
│           • Executive Report        • Dashboard Updates              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Workload Profiles

| Scenario     | Users | Duration | Ramp Up | Purpose                     |
|-------------|-------|----------|---------|-----------------------------|
| Smoke Test  | 50    | 5m       | 1m      | Basic functionality check    |
| Average     | 200   | 15m      | 3m      | Normal traffic simulation    |
| Peak Sale   | 500   | 15m      | 5m      | Flash sale / promo event     |
| Black Friday| 1000  | 15m      | 10m     | Extreme peak traffic         |

## Security Architecture

- All passwords hashed with bcrypt (10 rounds)
- JWT tokens with 24h expiry
- No credentials stored in logs
- AI engine only receives metadata metrics
- Rate limiting on all API endpoints
- CORS configured for production origins
- All database queries parameterized to prevent SQL injection
