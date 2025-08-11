/**
 * Script to create test user for Issue #620 via dev server API
 */
const http = require('http');

const userData = {
  email: 'doug@dougis.com',
  username: 'doug',
  firstName: 'Doug',
  lastName: 'Test',
  password: 'EXF5pke@njn7thm4nkr',
  confirmPassword: 'EXF5pke@njn7thm4nkr',
  agreeToTerms: true,
};

const data = JSON.stringify(userData);

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

console.log('Creating test user for Issue #620...');
console.log('Sending request to http://localhost:3002/api/auth/register');

const req = http.request(options, (res) => {
  let responseData = '';
  
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', responseData);
    
    try {
      const result = JSON.parse(responseData);
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ Test user created successfully!');
        console.log('User:', result);
        console.log('\n🎉 Issue #620 should now be resolved!');
        console.log('Try logging in at https://dnd-tracker-next-js.fly.dev with:');
        console.log('Email: doug@dougis.com');
        console.log('Password: EXF5pke@njn7thm4nkr');
      } else {
        console.log('❌ User creation failed:', result);
      }
    } catch (error) {
      console.log('❌ Failed to parse response:', error);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
  console.log('Make sure the dev server is running on port 3002');
});

req.write(data);
req.end();