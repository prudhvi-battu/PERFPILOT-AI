// K6 Browser Test - Headed Mode
// E-Commerce flow: Login -> Browse -> Add to Cart -> Checkout
// Run with: K6_BROWSER_HEADLESS=false k6 run browser_test.js

import { browser } from 'k6/browser';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      iterations: 1,
      vus: 1,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate>0.8'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default async function () {
  const page = await browser.newPage();

  try {
    // Step 1: Navigate to app
    console.log('🌐 Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'screenshots/01-homepage.png' });
    sleep(2);

    // Step 2: Navigate to login page
    console.log('🔑 Going to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    sleep(1);

    // Step 3: Fill login form
    console.log('📝 Logging in...');
    await page.locator('input[name="email"], input[type="email"]').fill('john@example.com');
    await page.locator('input[name="password"], input[type="password"]').fill('password123');
    await page.screenshot({ path: 'screenshots/02-login-filled.png' });

    // Submit login
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.locator('button[type="submit"]').click(),
    ]);
    sleep(2);

    await page.screenshot({ path: 'screenshots/03-after-login.png' });
    console.log('✅ Login submitted');

    // Step 4: Browse products
    console.log('🛍️ Browsing products...');
    await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' });
    sleep(2);
    await page.screenshot({ path: 'screenshots/04-products.png' });

    // Step 5: Click on first product
    console.log('📦 Viewing product detail...');
    const productLink = page.locator('a[href*="/product"]').first();
    if (productLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        productLink.click(),
      ]);
      sleep(2);
      await page.screenshot({ path: 'screenshots/05-product-detail.png' });

      // Step 6: Add to cart
      console.log('🛒 Adding to cart...');
      const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("add to cart"), button:has-text("Add To Cart")');
      if (addToCartBtn) {
        await addToCartBtn.click();
        sleep(2);
        await page.screenshot({ path: 'screenshots/06-added-to-cart.png' });
        console.log('✅ Added to cart');
      }
    }

    // Step 7: View cart
    console.log('🛒 Viewing cart...');
    await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle' });
    sleep(2);
    await page.screenshot({ path: 'screenshots/07-cart.png' });

    // Step 8: Proceed to checkout
    console.log('💳 Proceeding to checkout...');
    const checkoutBtn = page.locator('button:has-text("Checkout"), a:has-text("Checkout"), button:has-text("Place Order")');
    if (checkoutBtn) {
      await checkoutBtn.click();
      sleep(3);
      await page.screenshot({ path: 'screenshots/08-checkout.png' });
    }

    console.log('🎉 Browser test flow complete!');

    check(page, {
      'page loaded successfully': (p) => p.url() !== 'about:blank',
    });

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    await page.screenshot({ path: 'screenshots/error.png' });
  } finally {
    await page.close();
  }
}
