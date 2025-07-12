// Keep-alive script Render.com ingyenes verzióhoz
// Ez a script 10 percenként pingli a backend-et, hogy ne hibernáljon

const https = require('https');

const BACKEND_URL = 'https://zengineer-backend.onrender.com';
const FRONTEND_URL = 'https://zengineer-frontend.onrender.com';
const PING_INTERVAL = 10 * 60 * 1000; // 10 perc

function pingService(url, serviceName) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      console.log(`[${new Date().toISOString()}] ${serviceName} ping: ${res.statusCode}`);
      resolve(res.statusCode);
    });

    req.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] ${serviceName} ping error:`, error.message);
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function keepAlive() {
  try {
    // Backend ping
    await pingService(`${BACKEND_URL}/api/health`, 'Backend');
    
    // Frontend ping  
    await pingService(FRONTEND_URL, 'Frontend');
    
  } catch (error) {
    console.error('Keep-alive error:', error.message);
  }
}

console.log('Keep-alive service started...');
console.log(`Pinging every ${PING_INTERVAL / 1000 / 60} minutes`);

// Első ping azonnal
keepAlive();

// Ismétlődő ping
setInterval(keepAlive, PING_INTERVAL);
