# Database

This directory contains the PostgreSQL database schema and configuration for the e-commerce platform.

## Schema

The database schema defines 9 tables:

- **users** — User accounts (customers + admins)
- **categories** — Product categories
- **products** — Product catalog with pricing and inventory
- **product_reviews** — User product reviews
- **cart** — Shopping carts per user
- **cart_items** — Items in shopping carts
- **orders** — Customer orders with status tracking
- **order_items** — Line items within orders
- **payments** — Payment transactions

## Quick Start

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE ecommerce_perf"

# Run migrations
cd ../backend
node database/migrate.js

# Seed with sample data
node database/seed.js
```

## Schema Details

The full migration script is located at `backend/database/migrate.js` and the seed script at `backend/database/seed.js`.

## Indexes

The schema includes indexes on:
- Products: category_id, slug, is_active
- Orders: user_id, status, created_at
- Cart: user_id
- Product Reviews: product_id
- Payments: order_id

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | Database host |
| DB_PORT | 5432 | Database port |
| DB_NAME | ecommerce_perf | Database name |
| DB_USER | postgres | Database user |
| DB_PASSWORD | postgres | Database password |
