/**
 * Script to test authentication for Issue #620
 */
const http = require('http');

const loginData = {
  email: 'doug@dougis.com',
  password: 'EXF5pke@njn7thm4nkr',
  rememberMe: false,
};

const data = JSON.stringify(loginData);

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/auth/signin',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

console.log('Testing authentication for Issue #620...');
console.log('Sending login request to http://localhost:3002/api/auth/signin');

const req = http.request(options, (res) => {
  let responseData = '';
  
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', responseData);
    
    if (res.statusCode === 200) {
      console.log('✅ Authentication successful!');
      console.log('\n🎉 ISSUE #620 IS RESOLVED!');
      console.log('The test user can authenticate successfully.');
      console.log('Production authentication should now work.');
    } else {
      console.log('❌ Authentication failed with status:', res.statusCode);
      try {
        const result = JSON.parse(responseData);
        console.log('Error details:', result);
      } catch (error) {
        console.log('Raw error response:', responseData);
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.write(data);
req.end();