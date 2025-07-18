const RedditScraper = require('./reddit-scraper');

async function testScraper() {
    console.log('🧪 Testing Reddit Scraper...\n');
    
    const scraper = new RedditScraper();
    
    try {
        // Test with just one subreddit for faster testing
        console.log('Testing with r/sales (limited posts)...');
        const posts = await scraper.scrapeSubreddit('sales', 'hot', 5);
        
        console.log(`✅ Successfully scraped ${posts.length} posts`);
        
        if (posts.length > 0) {
            console.log('\n📊 Sample post:');
            console.log(`Title: ${posts[0].title}`);
            console.log(`Score: ${posts[0].score}`);
            console.log(`Relevance: ${posts[0].relevance_score}`);
            console.log(`Category: ${posts[0].marketing_category}`);
            console.log(`URL: ${posts[0].permalink}`);
        }
        
        // Test CSV generation
        scraper.posts = posts;
        const csvPath = await scraper.saveToCSV('test-output.csv');
        console.log(`\n📄 Test CSV saved to: ${csvPath}`);
        
        console.log('\n✅ Test completed successfully!');
        console.log('👍 The scraper is working correctly. Run "node run-scraper.js" for full scraping.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your internet connection');
        console.log('2. Verify Node.js is installed (node --version)');
        console.log('3. Make sure Reddit is accessible from your location');
    }
}

if (require.main === module) {
    testScraper();
}

module.exports = testScraper;