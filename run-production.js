const ProductionRedditScraper = require('./production-scraper');
const fs = require('fs');
const path = require('path');

async function runProductionScraping() {
    console.log('🚀 GreendoorAI Production Reddit Marketing Intelligence System');
    console.log('================================================================\n');
    
    // Load configuration
    const config = loadConfiguration();
    
    // Initialize production scraper
    const scraper = new ProductionRedditScraper(config);
    
    try {
        // Display pre-run information
        displayPreRunInfo(config);
        
        // Confirm production run
        console.log('⚠️  PRODUCTION MODE - This will create comprehensive output files');
        console.log('📊 Expected runtime: 5-10 minutes depending on network conditions');
        console.log('💾 Output location: ./data/ directory\n');
        
        // Start production scraping
        const startTime = Date.now();
        console.log('🎯 Starting production scraping...\n');
        
        const report = await scraper.runProductionScraping();
        
        const duration = Date.now() - startTime;
        
        // Display success summary
        displaySuccessSummary(report, duration);
        
        return report;
        
    } catch (error) {
        console.error('❌ Production scraping failed:', error.message);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Check internet connection');
        console.log('2. Verify disk space availability');
        console.log('3. Check log files in ./logs/ directory');
        console.log('4. Try running test mode first: npm run test');
        
        process.exit(1);
    }
}

function loadConfiguration() {
    const defaultConfig = {
        maxRetries: 3,
        retryDelay: 5000,
        requestDelay: 2000,
        enableLogging: true,
        enableBackup: true,
        enableRecovery: true,
        dataDirectory: './data',
        logDirectory: './logs',
        archiveDirectory: './archive',
        enableMetrics: true,
        enableValidation: true,
        minContentLength: 50
    };
    
    // Try to load custom configuration
    const configPath = './production-config.json';
    if (fs.existsSync(configPath)) {
        try {
            const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('📝 Loaded custom configuration from production-config.json');
            return { ...defaultConfig, ...customConfig };
        } catch (error) {
            console.log('⚠️  Failed to load custom config, using defaults');
        }
    }
    
    return defaultConfig;
}

function displayPreRunInfo(config) {
    console.log('📋 Production Configuration:');
    console.log(`   • Request delay: ${config.requestDelay}ms (respectful rate limiting)`);
    console.log(`   • Max retries: ${config.maxRetries} (error resilience)`);
    console.log(`   • Logging: ${config.enableLogging ? 'Enabled' : 'Disabled'}`);
    console.log(`   • Backup: ${config.enableBackup ? 'Enabled' : 'Disabled'}`);
    console.log(`   • Data directory: ${config.dataDirectory}`);
    console.log(`   • Minimum content length: ${config.minContentLength} characters\n`);
    
    console.log('🎯 Target Subreddits:');
    console.log('   • r/sales, r/techsales (core sales communities)');
    console.log('   • r/startups, r/entrepreneur (business insights)');
    console.log('   • r/SaaS, r/marketing (industry specific)');
    console.log('   • r/salesforce, r/hubspot (tool discussions)');
    console.log('   • r/productivity, r/remotework (efficiency topics)\n');
    
    console.log('📁 Output Files:');
    console.log('   • urgent-content-[timestamp].csv (immediate use - score 20+)');
    console.log('   • high-value-[timestamp].csv (strategic content - score 15+)');
    console.log('   • detailed-analysis-[timestamp].csv (comprehensive data)');
    console.log('   • executive-summary-[timestamp].csv (management overview)');
    console.log('   • complete-dataset-[timestamp].json (full data export)');
    console.log('   • metrics-[timestamp].json (performance analytics)\n');
}

function displaySuccessSummary(report, duration) {
    const durationMinutes = Math.round(duration / 60000);
    const durationSeconds = Math.round((duration % 60000) / 1000);
    
    console.log('\n🎉 PRODUCTION SCRAPING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    
    console.log(`⏱️  Total Duration: ${durationMinutes}m ${durationSeconds}s`);
    console.log(`📊 Posts Scraped: ${report.statistics.totalPosts}`);
    console.log(`✨ Quality Posts: ${report.statistics.qualityPosts}`);
    console.log(`🚨 Urgent Posts: ${report.statistics.urgentPosts}`);
    console.log(`⭐ High-Value Posts: ${report.statistics.highValuePosts}`);
    console.log(`📈 Success Rate: ${report.statistics.successRate}`);
    
    console.log('\n📁 Generated Files:');
    report.outputFiles.forEach(file => {
        const icon = getFileIcon(file.type);
        const description = getFileDescription(file.type);
        console.log(`${icon} ${path.basename(file.path)} (${file.count} items) - ${description}`);
    });
    
    console.log('\n🎯 Immediate Recommendations:');
    report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
    });
    
    console.log('\n📋 Next Steps:');
    report.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
    });
    
    console.log('\n💡 Pro Tips:');
    console.log('   • Start with urgent-content CSV for immediate wins');
    console.log('   • Use high-value CSV for strategic content planning');
    console.log('   • Import CSVs to Google Sheets for team collaboration');
    console.log('   • Schedule weekly runs for ongoing market intelligence');
    console.log('   • Track which insights drive best marketing performance');
    
    console.log('\n🚀 Your Reddit marketing intelligence system is ready!');
    console.log('   Data location: ./data/');
    console.log('   Logs location: ./logs/');
    console.log('   Backups location: ./data/backups/');
}

function getFileIcon(type) {
    const icons = {
        urgent: '🚨',
        'high-value': '⭐',
        detailed: '📄',
        summary: '📋',
        json: '💾',
        metrics: '📊'
    };
    return icons[type] || '📁';
}

function getFileDescription(type) {
    const descriptions = {
        urgent: 'Immediate marketing opportunities',
        'high-value': 'Strategic content and case studies',
        detailed: 'Comprehensive analysis with insights',
        summary: 'Executive overview and priorities',
        json: 'Complete dataset for analysis',
        metrics: 'Performance and quality analytics'
    };
    return descriptions[type] || 'Marketing intelligence data';
}

// Error handling for production
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⚠️  Production scraping interrupted by user');
    console.log('📁 Partial data may be available in ./data/backups/');
    process.exit(0);
});

if (require.main === module) {
    runProductionScraping();
}

module.exports = runProductionScraping;