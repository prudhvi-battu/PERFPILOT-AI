package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import scala.util.Random

class ECommerceSimulation extends Simulation {

  // ── Config ──────────────────────────────────────────────────────────────
  val baseUrl   = sys.env.getOrElse("BASE_URL", "http://localhost:5000")
  val testUsers = sys.env.getOrElse("USERS", "50").toInt
  val duration  = sys.env.getOrElse("DURATION_SEC", "30").toInt

  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/3.9.5 ECommerce-PerfTest")

  // ── Test data ────────────────────────────────────────────────────────────
  val accounts = List(
    Map("email" -> "john@example.com",  "password" -> "password123"),
    Map("email" -> "jane@example.com",  "password" -> "password123"),
    Map("email" -> "bob@example.com",   "password" -> "password123"),
    Map("email" -> "alice@example.com", "password" -> "password123")
  )

  val productSlugs = List(
    "smartphone-pro-x", "laptop-ultra-15", "wireless-headphones",
    "smart-watch", "tablet-pro-12", "gaming-console",
    "bluetooth-speaker", "digital-camera", "portable-charger"
  )

  // ── Scenario ─────────────────────────────────────────────────────────────
  val scn = scenario("E-Commerce: Login → Search → Detail → Cart → Checkout")

    .exec { session =>
      val acct = accounts(Random.nextInt(accounts.size))
      session
        .set("email",    acct("email"))
        .set("password", acct("password"))
        .set("slug",     productSlugs(Random.nextInt(productSlugs.size)))
    }
    .exec(
      http("01_Login")
        .post("/api/auth/login")
        .body(StringBody("""{"email":"#{email}","password":"#{password}"}""")).asJson
        .check(status.is(200))
        .check(jsonPath("$.token").saveAs("token"))
    )
    .pause(300.milliseconds)
    .exec(
      http("02_Search Products")
        .get("/api/products?q=laptop&limit=10")
        .header("Authorization", "Bearer #{token}")
        .check(status.is(200))
        .check(jsonPath("$.products[0].id").optional.saveAs("firstProductId"))
    )
    .pause(300.milliseconds)
    .exec(
      http("03_Get Categories")
        .get("/api/products/categories")
        .header("Authorization", "Bearer #{token}")
        .check(status.is(200))
    )
    .pause(200.milliseconds)
    .exec(
      http("04_Product Detail")
        .get("/api/products/#{slug}")
        .header("Authorization", "Bearer #{token}")
        .check(status.in(200, 404))
        .check(jsonPath("$.id").optional.saveAs("productId"))
    )
    .pause(300.milliseconds)
    .doIf(session => session.contains("productId")) {
      exec(
        http("05_Add to Cart")
          .post("/api/cart")
          .header("Authorization", "Bearer #{token}")
          .body(StringBody("""{"product_id":#{productId},"quantity":1}""")).asJson
          .check(status.in(200, 201))
      )
      .pause(300.milliseconds)
    }
    .exec(
      http("06_View Cart")
        .get("/api/cart")
        .header("Authorization", "Bearer #{token}")
        .check(status.is(200))
    )
    .pause(300.milliseconds)
    .exec(
      http("07_Checkout")
        .post("/api/orders")
        .header("Authorization", "Bearer #{token}")
        .body(StringBody(
          """{
            |"shipping_address":{
            |  "street":"123 Gatling St",
            |  "city":"Load City",
            |  "state":"TS",
            |  "zip":"12345",
            |  "country":"US"
            |},
            |"payment_method":"credit_card"
            |}""".stripMargin
        )).asJson
        .check(status.in(201, 400, 422))
    )

  setUp(
    scn.inject(
      rampUsers(testUsers).during(10.seconds),
      constantUsersPerSec(testUsers / 10.0).during(duration.seconds)
    )
  )
  .protocols(httpProtocol)
  .assertions(
    global.responseTime.percentile(95).lt(5000),
    global.failedRequests.percent.lt(50)
  )
}
