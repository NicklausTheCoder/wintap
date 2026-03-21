module.exports = {
  include: ['/'],  // Only pre-render the homepage
  exclude: ['/**'],  // Exclude all other routes
  timeout: 10000,
  waitFor: 500,
  skipThirdPartyRequests: true,
  puppeteerArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security'
  ],
  // Don't crawl these
  crawl: false,
  // Don't wait for these
  async beforeRender() {
    // Skip heavy operations during snapshot
    if (typeof window !== 'undefined') {
      window.__SNAPSHOT_MODE__ = true;
    }
  }
};