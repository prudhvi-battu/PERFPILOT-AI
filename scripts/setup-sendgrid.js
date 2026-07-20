#!/usr/bin/env node
/**
 * AI Performance Testing Assistant
 * Secure SendGrid Setup Script
 * 
 * Run this locally:  node scripts/setup-sendgrid.js
 * Your API key stays on YOUR machine — never shared in chat.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const http = require('http');
const { execSync, spawn } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Clean up readline on exit
process.on('exit', () => rl.close());
process.on('SIGINT', () => { rl.close(); process.exit(0); });

function promptHidden(query) {
  return new Promise((resolve) => {
    // Save current terminal settings
    const isRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdout.write(query);
    let input = '';

    const onData = (data) => {
      const char = data.toString();
      if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input.trim());
      } else if (char === '\u0003') { // Ctrl+C
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        process.exit(0);
      } else if (char === '\u007f') { // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += char;
        process.stdout.write('*'); // Show asterisks instead of the key
      }
    };

    process.stdin.on('data', onData);
  });
}

async async function waitForHealth(url, maxRetries = 10, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolveReq, reject) => {
        const req = http.get(url, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try { resolveReq(JSON.parse(d)); }
            catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return true;
    } catch (e) {
      if (i < maxRetries - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return false;
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🔐 Secure SendGrid API Key Setup                    ║');
  console.log('║                                                        ║');
  console.log('║  Your API key stays on YOUR machine.                   ║');
  console.log('║  Nothing is sent over chat.                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('📋 Before we start:');
  console.log('   1. Go to https://app.sendgrid.com/settings/api_keys');
  console.log('   2. Click "Create API Key"');
  console.log('   3. Select "Full Access" (this enables Mail Send)');
  console.log('   4. Name it "AI Performance Monitor"');
  console.log('   5. Click "Create & View"');
  console.log('   6. Copy the key (starts with "SG.")');
  console.log('');

  const apiKey = await promptHidden('🔑 Paste your SendGrid API key (input hidden): ');

  if (!apiKey || !apiKey.startsWith('SG.')) {
    console.log('');
    console.log('❌ Invalid key. SendGrid API keys start with "SG."');
    console.log('   Please generate a new key from https://app.sendgrid.com');
    process.exit(1);
  }

  // Read current .env
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } catch (e) {
    console.log('❌ Could not find backend/.env file');
    process.exit(1);
  }

  // Update SENDGRID_API_KEY in .env
  if (envContent.includes('SENDGRID_API_KEY=')) {
    envContent = envContent.replace(
      /SENDGRID_API_KEY=.*/,
      `SENDGRID_API_KEY=${apiKey}`
    );
  } else {
    envContent += `\n# SendGrid API Key\nSENDGRID_API_KEY=${apiKey}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('');
  console.log('✅ SendGrid API key saved to backend/.env');
  console.log('');

  // Restart backend
  console.log('🔄 Restarting backend server...');
  const { execSync } = require('child_process');
  try {
    // Kill old backend
    const killScript = path.join(__dirname, '..', 'backend', 'killport.js');
    if (fs.existsSync(killScript)) {
      execSync(`node "${killScript}" 5000`, { stdio: 'ignore', timeout: 5000 });
    }
    
    // Start new backend
    const serverPath = path.join(__dirname, '..', 'backend', 'server.js');
    const logPath = path.join(__dirname, '..', 'backend', 'backend.log');
    const child = require('child_process').spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..', 'backend'),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    child.unref();
    
    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Check if running
    const http = require('http');
    http.get('http://localhost:5000/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Backend is running');
        console.log('');
        
        // Send test email
        console.log('📧 Sending test alert to suvarnamukhy666@gmail.com...');
        console.log('   (Check your inbox!)');
        console.log('');
        
        // Login and trigger alert
        const loginBody = JSON.stringify({ email: 'admin@shop.com', password: 'password123' });
        const loginReq = http.request('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
        }, (loginRes) => {
          let loginData = '';
          loginRes.on('data', chunk => loginData += chunk);
          loginRes.on('end', () => {
            try {
              const token = JSON.parse(loginData).token;
              
              const alertReq = http.request('http://localhost:5000/api/alerts/trigger', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              }, (alertRes) => {
                let alertData = '';
                alertRes.on('data', chunk => alertData += chunk);
                alertRes.on('end', () => {
                  try {
                    const result = JSON.parse(alertData);
                    if (result.delivery?.provider === 'sendgrid') {
                      console.log('✅✅✅ EMAIL SENT SUCCESSFULLY to suvarnamukhy666@gmail.com!');
                      console.log('   Check your inbox (and spam folder)');
                    } else if (result.delivery?.mode === 'preview') {
                      console.log('⚠️  Email still in preview mode.');
                      console.log('   Check "Mail Send" permission on SendGrid dashboard.');
                    } else {
                      console.log('⚠️  Alert triggered. Check backend logs for delivery status.');
                    }
                  } catch (e) {
                    console.log('⚠️  Alert triggered. Check your inbox.');
                  }
                  console.log('');
                  console.log('📊 Open the dashboard: http://localhost:3000');
                  rl.close();
                });
              });
              alertReq.write(JSON.stringify({
                severity: 'Critical',
                type: '🔴 Performance Alert Test',
                metric: 'P95 Response Time',
                value: '5,847ms',
                threshold: '< 2,000ms',
              }));
              alertReq.end();
            } catch (e) {
              console.log('❌ Login failed:', e.message);
              rl.close();
            }
          });
        });
        loginReq.write(loginBody);
        loginReq.end();
      });
    }).on('error', (err) => {
      console.log('❌ Backend failed to start:', err.message);
      rl.close();
    });
  } catch (err) {
    console.log('❌ Error:', err.message);
    rl.close();
  }
}

main();
