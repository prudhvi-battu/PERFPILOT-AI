# Gatling Performance Tests

This directory would contain Gatling simulation scripts for the e-commerce platform.

## Prerequisites

- Java 11+
- Maven or sbt
- Gatling 3.9+

## Sample Gatling Simulation

To generate a Gatling simulation from the AI Analysis Engine:

```bash
cd ai-orchestrator
node analyze.js --generate gatling
```

## Example Simulation Structure

A Gatling simulation would look like:

```scala
// BasicECommerceSimulation.scala
package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class BasicECommerceSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://localhost:5000")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  val scn = scenario("E-Commerce Business Flow")
    .exec(http("Login")
      .post("/api/auth/login")
      .body(StringBody("""{"email": "john@example.com", "password": "password123"}"""))
      .check(jsonPath("$.token").saveAs("token")))
    .exec(http("Search Products")
      .get("/api/products?q=laptop")
      .header("Authorization", "Bearer ${token}"))
    .exec(http("View Product")
      .get("/api/products/smartphone-pro-x")
      .header("Authorization", "Bearer ${token}"))
    .exec(http("Add to Cart")
      .post("/api/cart")
      .header("Authorization", "Bearer ${token}")
      .body(StringBody("""{"product_id": 1, "quantity": 1}""")))
    .exec(http("Checkout")
      .post("/api/orders")
      .header("Authorization", "Bearer ${token}")
      .body(StringBody("""{"shipping_address": {"street": "123 Test St", "city": "City", "state": "ST", "zip": "12345", "country": "US"}, "payment_method": "credit_card"}""")))

  setUp(
    scn.inject(
      rampUsers(50).during(1.minutes),
      rampUsers(200).during(3.minutes),
      rampUsers(500).during(5.minutes)
    )
  ).protocols(httpProtocol)
}
```

## Running Gatling

```bash
# Using Maven
mvn gatling:test -Dgatling.simulationClass=simulations.BasicECommerceSimulation

# Using sbt
sbt "gatling/testOnly simulations.BasicECommerceSimulation"
```

## Workload Profiles

| Scenario     | Users | Duration | Gatling Injection         |
|-------------|-------|----------|--------------------------|
| Smoke Test  | 50    | 5m       | rampUsers(50).during(1m) |
| Average     | 200   | 15m      | rampUsers(200).during(3m)|
| Peak Sale   | 500   | 15m      | rampUsers(500).during(5m)|
| Black Friday| 1000  | 15m      | rampUsers(1000).during(10m)|

## Alternative: Use k6

For immediate testing without Java/Gatling setup, use the k6 scripts in `../k6/`:

```bash
k6 run ../k6/smoke_test.js
```
