const EnhancedRedditScraper = require('./enhanced-scraper');

async function testEnhancedScraper() {
    console.log('🧪 Testing Enhanced Reddit Scraper...\n');
    
    const scraper = new EnhancedRedditScraper();
    
    try {
        // Test with just one subreddit for faster testing
        console.log('Testing with r/sales (limited posts)...');
        const posts = await scraper.scrapeSubreddit('sales', 'hot', 3);
        
        console.log(`✅ Successfully scraped ${posts.length} posts`);
        
        if (posts.length > 0) {
            console.log('\n📊 Sample enhanced post analysis:');
            const post = posts[0];
            console.log(`Title: ${post.title}`);
            console.log(`Score: ${post.score}`);
            console.log(`Relevance: ${post.relevance_score}`);
            console.log(`Category: ${post.marketing_category}`);
            console.log(`Priority: ${post.marketing_priority}`);
            console.log(`Content Length: ${post.content_length} characters`);
            console.log(`URL: ${post.permalink}`);
            
            if (post.selftext && post.selftext.length > 50) {
                console.log(`\n📝 Content Preview:\n${post.selftext.substring(0, 300)}...`);
                
                const insights = scraper.extractMarketingInsights(post);
                console.log(`\n🎯 Marketing Insights:`);
                if (insights.pain_points.length > 0) {
                    console.log(`Pain Points: ${insights.pain_points.slice(0, 2).join(', ')}`);
                }
                if (insights.emotional_triggers.length > 0) {
                    console.log(`Emotions: ${insights.emotional_triggers.join(', ')}`);
                }
                if (insights.tools_mentioned.length > 0) {
                    console.log(`Tools: ${insights.tools_mentioned.join(', ')}`);
                }
            }
        }
        
        // Test enhanced CSV generation
        scraper.posts = posts;
        
        console.log('\n📄 Testing output generation...');
        
        // Test detailed CSV
        const detailedPath = await scraper.saveDetailedCSV('test-detailed.csv');
        console.log(`✅ Detailed CSV: ${detailedPath}`);
        
        // Test top posts CSV (lower threshold for testing)
        const topPath = await scraper.saveTopPostsDetailed('test-top-posts.csv', 5);
        console.log(`✅ Top posts CSV: ${topPath}`);
        
        console.log('\n✅ Enhanced test completed successfully!');
        console.log('👍 The enhanced scraper is working correctly.');
        console.log('🚀 Run "node run-enhanced.js" for full enhanced scraping.');
        
    } catch (error) {
        console.error('❌ Enhanced test failed:', error);
        console.log('Stack trace:', error.stack);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your internet connection');
        console.log('2. Verify Node.js is installed (node --version)');
        console.log('3. Make sure Reddit is accessible from your location');
    }
}

if (require.main === module) {
    testEnhancedScraper();
}

module.exports = testEnhancedScraper;