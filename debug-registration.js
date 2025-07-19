// Debug script to test UserService directly
const { UserService } = require('./src/lib/services/UserService.ts');

const testData = {
  firstName: "Test",
  lastName: "User", 
  username: "testuser123",
  email: "test@example.com",
  password: "TestPassword123!",
  confirmPassword: "TestPassword123!",
  agreeToTerms: true,
  subscribeToNewsletter: false
};

async function debugRegistration() {
  try {
    console.log('Testing UserService.createUser with data:', testData);
    const result = await UserService.createUser(testData);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error caught:', error);
    console.error('Error stack:', error.stack);
  }
}

debugRegistration();