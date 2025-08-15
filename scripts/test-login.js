
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3001/signin');

  await page.type('input[name="email"]', 'test-user-1754199219718@example.com');
  await page.type('input[name="password"]', 'TestPassword123!');

  await page.click('button[type="submit"]');

  await page.screenshot({ path: 'login-attempt.png' });

  await page.waitForNavigation({ timeout: 60000 });

  const url = page.url();
  if (url.includes('error')) {
    console.log('Login failed. Error page displayed.');
  } else {
    console.log('Login successful.');
  }

  await browser.close();
})();
