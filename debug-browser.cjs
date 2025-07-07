const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      logs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });

    // Capture errors
    const errors = [];
    page.on('pageerror', error => {
      errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Capture network errors
    const networkErrors = [];
    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      });
    });

    console.log('🚀 Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if the debug function exists and execute it
    try {
      const debugResult = await page.evaluate(() => {
        if (typeof window.debugSupabaseData === 'function') {
          return window.debugSupabaseData();
        } else {
          return { error: 'debugSupabaseData function not found' };
        }
      });
      
      console.log('🔍 Debug function result:', JSON.stringify(debugResult, null, 2));
    } catch (evalError) {
      console.log('❌ Error executing debug function:', evalError.message);
    }

    // Execute diagnostics function
    try {
      const diagnosticsResult = await page.evaluate(async () => {
        if (typeof window.runSupabaseDiagnostics === 'function') {
          return await window.runSupabaseDiagnostics();
        } else {
          return { error: 'runSupabaseDiagnostics function not found' };
        }
      });
      
      console.log('🔧 Diagnostics function result:', JSON.stringify(diagnosticsResult, null, 2));
    } catch (evalError) {
      console.log('❌ Error executing diagnostics function:', evalError.message);
    }

    // Get page title and URL
    const title = await page.title();
    const url = await page.url();
    
    console.log('📊 Page Information:');
    console.log(`- Title: ${title}`);
    console.log(`- URL: ${url}`);
    
    // Check if React app is loaded
    const reactLoaded = await page.evaluate(() => {
      return !!document.querySelector('#root') && document.querySelector('#root').children.length > 0;
    });
    
    console.log(`- React App Loaded: ${reactLoaded}`);

    // Report all captured information
    console.log('\n📝 Console Logs:');
    logs.forEach(log => {
      console.log(`[${log.timestamp}] ${log.type.toUpperCase()}: ${log.text}`);
    });

    console.log('\n❌ Page Errors:');
    errors.forEach(error => {
      console.log(`[${error.timestamp}] ERROR: ${error.message}`);
      if (error.stack) {
        console.log(`Stack: ${error.stack}`);
      }
    });

    console.log('\n🌐 Network Errors:');
    networkErrors.forEach(error => {
      console.log(`[${error.timestamp}] NETWORK ERROR: ${error.url}`);
      console.log(`Failure: ${JSON.stringify(error.failure)}`);
    });

    // Check for specific elements
    const elementsCheck = await page.evaluate(() => {
      const results = {};
      
      // Check for authentication state
      results.authElements = {
        hasLoginForm: !!document.querySelector('form[data-testid="login-form"]'),
        hasUserProfile: !!document.querySelector('[data-testid="user-profile"]'),
        hasAuthError: !!document.querySelector('.auth-error')
      };
      
      // Check for main app elements
      results.appElements = {
        hasWordBooks: !!document.querySelector('[data-testid="word-books"]'),
        hasWordCards: !!document.querySelector('[data-testid="word-cards"]'),
        hasLoadingSpinner: !!document.querySelector('.loading-spinner'),
        hasErrorMessage: !!document.querySelector('.error-message')
      };
      
      return results;
    });

    console.log('\n🎯 Element Check Results:');
    console.log(JSON.stringify(elementsCheck, null, 2));

  } catch (error) {
    console.error('💥 Browser automation failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();