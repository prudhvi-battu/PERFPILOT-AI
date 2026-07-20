# JMeter Performance Tests

This directory would contain JMeter (.jmx) test scripts for the e-commerce platform.

## To Generate JMeter Scripts

Use the AI Performance Testing Assistant to auto-generate JMeter scripts:

```bash
cd ai-orchestrator
node analyze.js --generate jmeter
```

## Manual Approach

You can also use JMeter's HTTP(S) Test Script Recorder:

1. Open JMeter
2. Add Thread Group with desired users (50, 200, 500, 1000)
3. Add HTTP Request Defaults pointing to `http://localhost:5000`
4. Add CSV Data Set Config for user credentials
5. Record or build the following transaction flow:
   - Login → Search → Product Detail → Add to Cart → Checkout
6. Add Listeners for results analysis

## Available k6 Alternatives

For immediate testing, use the k6 scripts in `../k6/`:

```bash
k6 run ../k6/smoke_test.js
k6 run ../k6/average_load_test.js  
k6 run ../k6/peak_load_test.js
k6 run ../k6/black_friday_test.js
```
