package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import scala.util.Random

/**
 * AI-Generated Gatling Performance Test
 * Generates: AI Performance Testing Assistant v1.0.0
 *
 * Simulates a complete e-commerce business transaction flow:
 *   Login -> Search Products -> View Details -> Add to Cart -> Checkout
 *
 * Workload Profiles:
 *   Smoke Test  (50  users / 5min)
 *   Average     (200 users / 15min)
 *   Peak Sale   (500 users / 15min)
 *   Black Friday (1000 users / 15min)
 */
class BasicECommerceSimulation extends Simulation {

  val baseUrl = System.getProperty("baseUrl", "http://localhost:5000")
  val testUsers = Seq("john@example.com", "jane@example.com", "bob@example.com", "alice@example.com")
  val productSlugs = Seq(
    "smartphone-pro-x", "laptop-ultra-15", "wireless-headphones",
    "tablet-pro-12", "gaming-console", "mechanical-keyboard",
    "running-shoes", "yoga-mat-premium", "fitness-tracker"
  )
  val random = new Random()

  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .header("Cache-Control", "no-cache")
    .check(status.in(200, 201, 400))

  // User credentials feeder
  val userFeeder = Iterator.continually {
    val creds = testUsers(random.nextInt(testUsers.length)).split("@")
    Map("email" -> testUsers(random.nextInt(testUsers.length)), "password" -> "password123")
  }

  // Product slug feeder
  val productFeeder = Iterator.continually {
    Map("productSlug" -> productSlugs(random.nextInt(productSlugs.length)))
  }

  // Search term feeder
  val searchFeeder = Iterator.continually {
    Map("searchTerm" -> Seq("laptop", "phone", "shoes", "headphone", "watch", "camera")(random.nextInt(6)))
  }

  // Login chain
  val login = exec(http("Login")
    .post("/api/auth/login")
    .body(StringBody("""{"email": "${email}", "password": "password123"}"""))
    .check(jsonPath("$.token").saveAs("token"))
    .check(jsonPath("$.user.id").saveAs("userId")))

  // Search products chain
  val searchProducts = exec(http("Search Products")
    .get("/api/products?q=${searchTerm}&limit=20")
    .header("Authorization", "Bearer ${token}"))

  // View product detail chain
  val viewProduct = exec(http("View Product Detail")
    .get("/api/products/${productSlug}")
    .header("Authorization", "Bearer ${token}")
    .check(jsonPath("$.id").saveAs("productId")))

  // Add to cart chain
  val addToCart = exec(http("Add to Cart")
    .post("/api/cart")
    .header("Authorization", "Bearer ${token}")
    .body(StringBody("""{"product_id": ${productId}, "quantity": 1}""")))

  // Checkout chain
  val checkout = exec(http("Checkout")
    .post("/api/orders")
    .header("Authorization", "Bearer ${token}")
    .body(StringBody(
      """{"shipping_address": {"street": "123 Performance Blvd", "city": "Load City", "state": "TS", "zip": "12345", "country": "US"}, "payment_method": "credit_card"}"""
    ))
    .check(status.is(201)))

  // View order history
  val viewOrders = exec(http("View Orders")
    .get("/api/orders")
    .header("Authorization", "Bearer ${token}"))

  // Complete business transaction scenario (80% of traffic)
  val fullTransactionScenario = scenario("Full Business Transaction")
    .feed(userFeeder)
    .exec(login)
    .pause(1)
    .feed(searchFeeder)
    .exec(searchProducts)
    .pause(500.milliseconds)
    .feed(productFeeder)
    .exec(viewProduct)
    .pause(300.milliseconds)
    .exec(addToCart)
    .pause(500.milliseconds)
    .exec(checkout)
    .pause(1)

  // Browse-only scenario (20% of traffic - just searching and viewing)
  val browseOnlyScenario = scenario("Browse Only")
    .feed(userFeeder)
    .exec(login)
    .pause(1)
    .feed(searchFeeder)
    .exec(searchProducts)
    .pause(500.milliseconds)
    .feed(productFeeder)
    .exec(viewProduct)
    .pause(2)

  // Smoke Test: 50 users over 5 minutes
  val smokeTest = Seq(
    fullTransactionScenario.inject(
      rampUsers(50).during(1.minutes)
    )
  )

  // Average Load: 200 users over 15 minutes
  val averageLoad = Seq(
    fullTransactionScenario.inject(
      rampUsers(150).during(3.minutes),
      constantUsersPerSec(3.33).during(12.minutes)
    ),
    browseOnlyScenario.inject(
      rampUsers(50).during(3.minutes),
      constantUsersPerSec(1.0).during(12.minutes)
    )
  )

  // Peak Sale: 500 users over 15 minutes
  val peakLoad = Seq(
    fullTransactionScenario.inject(
      rampUsers(400).during(5.minutes),
      constantUsersPerSec(8.0).during(10.minutes)
    ),
    browseOnlyScenario.inject(
      rampUsers(100).during(5.minutes),
      constantUsersPerSec(2.0).during(10.minutes)
    )
  )

  // Black Friday: 1000 users over 15 minutes
  val blackFridayLoad = Seq(
    fullTransactionScenario.inject(
      rampUsers(800).during(10.minutes),
      constantUsersPerSec(13.33).during(5.minutes)
    ),
    browseOnlyScenario.inject(
      rampUsers(200).during(10.minutes),
      constantUsersPerSec(3.33).during(5.minutes)
    )
  )

  // Default: use system property to select workload, or run all
  val workload = System.getProperty("workload", "average").toLowerCase match {
    case "smoke"       => smokeTest
    case "average"     => averageLoad
    case "peak"        => peakLoad
    case "blackfriday" => blackFridayLoad
    case _             => averageLoad
  }

  setUp(workload)
    .protocols(httpProtocol)
    .assertions(
      global.responseTime.percentile(95).lt(5000),
      global.successfulRequests.percent.gt(85.0)
    )
}
