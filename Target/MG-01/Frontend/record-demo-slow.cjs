const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser with slowMo...');
  // slowMo: 1500 adds a 1.5 second delay between every action so the video is easy to follow
  const browser = await chromium.launch({ headless: true, slowMo: 1500 }); 
  
  const context = await browser.newContext({
    recordVideo: {
      dir: './videos/',
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Initial viewing time
    await page.waitForTimeout(3000);

    console.log('Showcasing Search Filter...');
    // Search for "Admin"
    await page.getByPlaceholder('Search descriptions').fill('Admin');
    await page.waitForTimeout(2000);
    // Clear search
    await page.getByPlaceholder('Search descriptions').fill('');
    await page.waitForTimeout(2000);

    console.log('Adding new transaction type...');
    await page.click('text=Add transaction type');
    await page.waitForTimeout(2000);
    
    await page.getByLabel('Type code').fill('97');
    await page.waitForTimeout(1000);
    await page.getByLabel('Description').fill('Client Demo Feature');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Create record")');
    await page.waitForTimeout(1000);
    
    console.log('Confirming creation...');
    await page.click('button:has-text("Confirm create")');

    await page.waitForSelector('text=Client Demo Feature');
    console.log('Record created successfully.');
    await page.waitForTimeout(4000);

    console.log('Editing the record...');
    await page.click('[aria-label="Edit transaction type 97"]');
    await page.waitForTimeout(2000);

    await page.locator('div[role="dialog"]').getByLabel('Description').fill('Client Demo Updated Feature');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Save changes")');
    await page.waitForTimeout(1000);
    
    console.log('Confirming save...');
    await page.click('button:has-text("Confirm save")');

    await page.waitForSelector('text=Client Demo Updated Feature');
    console.log('Record edited successfully.');
    await page.waitForTimeout(4000);

    console.log('Deleting the record...');
    await page.click('[aria-label="Delete transaction type 97"]');
    await page.waitForTimeout(2000);

    console.log('Confirming deletion...');
    await page.click('div[role="dialog"] button:has-text("Delete")');

    await page.waitForSelector('text=Client Demo Updated Feature', { state: 'hidden' });
    console.log('Record deleted successfully.');
    
    // Final wait before closing
    await page.waitForTimeout(4000);

  } catch (err) {
    console.error('Error during automation:', err);
  } finally {
    console.log('Closing browser and saving video...');
    await context.close();
    await browser.close();
    console.log('Done! Video saved in ./videos/ directory.');
  }
})();
