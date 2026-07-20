// Free port 5000 by killing the process holding it
const net = require('net');

const PORT = parseInt(process.argv[2] || '5000');

// Check if port is in use
const server = net.createServer();
server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is in use.`);
    // On Windows, we can't easily kill another process from here
    // Let's try using taskkill
    const cp = require('child_process');
    cp.exec(`netstat -ano | findstr :${PORT}`, (err, stdout) => {
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          console.log(`Killing PID ${pid}...`);
          cp.exec(`taskkill /F /PID ${pid}`, (err) => {
            if (err) {
              console.error('Failed to kill:', err.message);
              process.exit(1);
            }
            console.log(`Killed PID ${pid}`);
            process.exit(0);
          });
          return;
        }
      }
      console.log('No LISTENING process found');
      process.exit(1);
    });
  } else {
    console.error('Error:', err.message);
    process.exit(1);
  }
});
server.once('listening', () => {
  server.close();
  console.log(`Port ${PORT} is free`);
  process.exit(0);
});
server.listen(PORT);
