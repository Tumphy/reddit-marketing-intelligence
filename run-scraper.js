const RedditScraper = require('./reddit-scraper');

async function main() {
    console.log('🚀 Starting GreendoorAI Reddit Marketing Intelligence Scraper');
    console.log('====================================================\n');
    
    const scraper = new RedditScraper();
    
    try {
        // Scrape all subreddits
        const posts = await scraper.scrapeAllSubreddits();
        
        // Generate summary report
        const report = scraper.generateSummaryReport();
        
        // Save to CSV
        const csvPath = await scraper.saveToCSV();
        
        console.log('\n✅ Scraping completed successfully!');
        console.log(`📊 CSV file saved: ${csvPath}`);
        console.log('\n📋 Next steps:');
        console.log('1. Open the CSV file in Google Sheets or Excel');
        console.log('2. Review the "Marketing Use Case" column for prioritization');
        console.log('3. Focus on posts with Relevance Score > 10 for immediate use');
        console.log('4. Use the "Marketing Category" to organize your content strategy');
        
        // Save a JSON version for programmatic access
        const jsonPath = csvPath.replace('.csv', '.json');
        const fs = require('fs');
        fs.writeFileSync(jsonPath, JSON.stringify(posts, null, 2));
        console.log(`📄 JSON file also saved: ${jsonPath}`);
        
    } catch (error) {
        console.error('❌ Error during scraping:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = main;