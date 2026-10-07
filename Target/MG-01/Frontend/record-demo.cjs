const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  
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
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    console.log('Adding new transaction type...');
    // Click 'Add transaction type'
    await page.click('text=Add transaction type');
    
    // Fill form
    await page.getByLabel('Type code').fill('98');
    await page.getByLabel('Description').fill('Client Demo Record');

    // Click 'Create record'
    await page.click('button:has-text("Create record")');

    // Confirm creation
    console.log('Confirming creation...');
    await page.click('button:has-text("Confirm create")');

    // Wait for the table to reflect the new record
    await page.waitForSelector('text=Client Demo Record');
    console.log('Record created successfully.');

    // Wait 2 seconds for the viewer to see it
    await page.waitForTimeout(2000);

    console.log('Editing the record...');
    // Click 'Edit' button for the record with Type code 98
    await page.click('[aria-label="Edit transaction type 98"]');

    // Change description
    await page.locator('div[role="dialog"]').getByLabel('Description').fill('Client Demo Updated');
    
    // Click 'Save changes'
    await page.click('button:has-text("Save changes")');

    // Confirm save
    console.log('Confirming save...');
    await page.click('button:has-text("Confirm save")');

    // Wait for update
    await page.waitForSelector('text=Client Demo Updated');
    console.log('Record edited successfully.');

    // Wait 2 seconds
    await page.waitForTimeout(2000);

    console.log('Deleting the record...');
    // Click 'Delete' button for the record with Type code 98
    await page.click('[aria-label="Delete transaction type 98"]');

    // Confirm deletion
    console.log('Confirming deletion...');
    await page.click('div[role="dialog"] button:has-text("Delete")');

    // Wait for record to disappear
    await page.waitForSelector('text=Client Demo Updated', { state: 'hidden' });
    console.log('Record deleted successfully.');

    // Wait 2 seconds before finishing
    await page.waitForTimeout(2000);

  } catch (err) {
    console.error('Error during automation:', err);
  } finally {
    console.log('Closing browser and saving video...');
    await context.close();
    await browser.close();
    console.log('Done! Video saved in ./videos/ directory.');
  }
})();
