const EnhancedRedditScraper = require('./enhanced-scraper');

async function main() {
    console.log('🚀 Starting Enhanced GreendoorAI Reddit Marketing Intelligence Scraper');
    console.log('===============================================================\n');
    
    const scraper = new EnhancedRedditScraper();
    
    try {
        // Scrape all subreddits
        console.log('📡 Scraping subreddits...');
        const posts = await scraper.scrapeAllSubreddits();
        
        // Generate summary report
        console.log('\n📊 Analyzing results...');
        const report = scraper.generateSummaryReport();
        
        // Save multiple output formats
        console.log('\n💾 Generating output files...');
        
        // 1. Standard CSV (overview)
        const csvPath = await scraper.saveToCSV('reddit-overview.csv');
        
        // 2. Detailed CSV with full content and insights
        const detailedPath = await scraper.saveDetailedCSV('reddit-detailed-insights.csv');
        
        // 3. Top posts with full content (15+ relevance score)
        const topPostsPath = await scraper.saveTopPostsDetailed('reddit-top-posts-full.csv', 15);
        
        // 4. Ultra high-priority posts (20+ relevance score)
        const urgentPath = await scraper.saveTopPostsDetailed('reddit-urgent-content.csv', 20);
        
        // 5. JSON for programmatic access
        const jsonData = {
            metadata: {
                scrapedAt: new Date().toISOString(),
                totalPosts: posts.length,
                highValuePosts: posts.filter(p => p.relevance_score > 15).length,
                urgentPosts: posts.filter(p => p.relevance_score > 20).length
            },
            summary: report,
            posts: posts
        };
        
        const fs = require('fs');
        const jsonPath = './reddit-complete-data.json';
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
        
        console.log('\n✅ Enhanced scraping completed successfully!\n');
        
        console.log('📁 Generated Files:');
        console.log(`📋 Overview CSV: reddit-overview.csv`);
        console.log(`📄 Detailed CSV: ${detailedPath}`);
        console.log(`⭐ Top Posts CSV: ${topPostsPath}`);
        console.log(`🚨 Urgent Posts CSV: ${urgentPath}`);
        console.log(`💾 Complete JSON: ${jsonPath}`);
        
        console.log('\n🎯 Recommendations:');
        
        const urgentPosts = posts.filter(p => p.relevance_score >= 20);
        const highPosts = posts.filter(p => p.relevance_score >= 15 && p.relevance_score < 20);
        const mediumPosts = posts.filter(p => p.relevance_score >= 10 && p.relevance_score < 15);
        
        console.log(`🚨 URGENT (${urgentPosts.length} posts): Use immediately in pitch decks and hero content`);
        console.log(`⭐ HIGH (${highPosts.length} posts): Perfect for case studies and sales presentations`);
        console.log(`📈 MEDIUM (${mediumPosts.length} posts): Great for blog posts and email campaigns`);
        
        if (urgentPosts.length > 0) {
            console.log('\n🔥 Top 3 Urgent Marketing Opportunities:');
            urgentPosts.slice(0, 3).forEach((post, i) => {
                console.log(`${i+1}. "${post.title}" (Score: ${post.relevance_score}, r/${post.subreddit})`);
                console.log(`   Category: ${post.marketing_category}`);
                console.log(`   Use for: ${post.marketing_priority}`);
                console.log(`   Link: ${post.permalink}\n`);
            });
        }
        
        console.log('📋 Next Steps:');
        console.log('1. Open "reddit-urgent-content.csv" for immediate marketing use');
        console.log('2. Review "reddit-top-posts-full.csv" for content strategy');
        console.log('3. Use "reddit-detailed-insights.csv" for comprehensive analysis');
        console.log('4. Import any CSV to Google Sheets for collaborative planning');
        
        console.log('\n💡 Pro Tips:');
        console.log('• Focus on posts with pain points and time metrics for cold outreach');
        console.log('• Use success stories for case studies and social proof');
        console.log('• Extract specific quotes for authentic marketing language');
        console.log('• Monitor tools mentioned for competitive intelligence');
        
    } catch (error) {
        console.error('❌ Error during enhanced scraping:', error);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check internet connection');
        console.log('2. Verify Node.js version (node --version)');
        console.log('3. Try running with fewer subreddits if rate limited');
    }
}

if (require.main === module) {
    main();
}

module.exports = main;