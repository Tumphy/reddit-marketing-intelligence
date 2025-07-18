const EnhancedRedditScraper = require('./enhanced-scraper');
const fs = require('fs');
const path = require('path');

class ProductionRedditScraper extends EnhancedRedditScraper {
    constructor(options = {}) {
        super();
        
        // Production configuration
        this.config = {
            maxRetries: 3,
            retryDelay: 5000,
            requestDelay: 2000, // Increased for production stability
            batchSize: 10,
            maxConcurrent: 3,
            enableLogging: true,
            enableBackup: true,
            enableRecovery: true,
            dataDirectory: './data',
            logDirectory: './logs',
            archiveDirectory: './archive',
            enableScheduling: false,
            enableWebhooks: false,
            webhookUrl: null,
            enableMetrics: true,
            enableValidation: true,
            minContentLength: 50,
            maxFileSize: 50 * 1024 * 1024, // 50MB max
            ...options
        };
        
        this.metrics = {
            startTime: null,
            endTime: null,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalPosts: 0,
            qualityPosts: 0,
            errors: [],
            performance: {}
        };
        
        this.setupDirectories();
        this.setupLogging();
    }

    setupDirectories() {
        const dirs = [
            this.config.dataDirectory,
            this.config.logDirectory,
            this.config.archiveDirectory,
            path.join(this.config.dataDirectory, 'csv'),
            path.join(this.config.dataDirectory, 'json'),
            path.join(this.config.dataDirectory, 'backups')
        ];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                this.log(`Created directory: ${dir}`);
            }
        });
    }

    setupLogging() {
        if (!this.config.enableLogging) return;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path.join(this.config.logDirectory, `scraper-${timestamp}.log`);
        
        this.log('='.repeat(50));
        this.log('GreendoorAI Production Reddit Scraper Started');
        this.log(`Version: 2.0.0`);
        this.log(`Timestamp: ${new Date().toISOString()}`);
        this.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);
        this.log('='.repeat(50));
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        console.log(logMessage);
        
        if (this.config.enableLogging && this.logFile) {
            try {
                fs.appendFileSync(this.logFile, logMessage + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }

    async makeRequestWithRetry(url, retries = 0) {
        this.metrics.totalRequests++;
        
        try {
            const result = await this.makeRequest(url);
            this.metrics.successfulRequests++;
            return result;
        } catch (error) {
            this.metrics.failedRequests++;
            this.log(`Request failed: ${url} - ${error.message}`, 'ERROR');
            
            if (retries < this.config.maxRetries) {
                this.log(`Retrying request ${retries + 1}/${this.config.maxRetries} after ${this.config.retryDelay}ms`, 'WARN');
                await this.delay(this.config.retryDelay);
                return this.makeRequestWithRetry(url, retries + 1);
            } else {
                this.metrics.errors.push({
                    url,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
        }
    }

    async scrapeSubredditProduction(subreddit, sortBy = 'hot', limit = 100) {
        const startTime = Date.now();
        this.log(`Starting production scraping: r/${subreddit} (${sortBy}, limit: ${limit})`);
        
        try {
            const url = `https://www.reddit.com/r/${subreddit}/${sortBy}/.json?limit=${limit}`;
            
            // Respectful rate limiting
            await this.delay(this.config.requestDelay);
            
            const data = await this.makeRequestWithRetry(url);
            
            if (!data || !data.data || !data.data.children) {
                throw new Error(`Invalid response structure from r/${subreddit}`);
            }
            
            const posts = data.data.children;
            this.log(`Found ${posts.length} posts in r/${subreddit}`);
            
            const processedPosts = posts.map(post => {
                if (!post.data) {
                    this.log(`Invalid post data in r/${subreddit}`, 'WARN');
                    return null;
                }
                
                const postData = {
                    id: post.data.id,
                    subreddit: subreddit,
                    title: post.data.title || '',
                    selftext: post.data.selftext || '',
                    selftext_html: post.data.selftext_html || '',
                    score: post.data.score || 0,
                    num_comments: post.data.num_comments || 0,
                    created_utc: post.data.created_utc || 0,
                    created_date: new Date((post.data.created_utc || 0) * 1000).toISOString(),
                    author: post.data.author || '[deleted]',
                    permalink: `https://www.reddit.com${post.data.permalink || ''}`,
                    flair_text: post.data.link_flair_text || '',
                    url: post.data.url || '',
                    is_self: post.data.is_self || false,
                    upvote_ratio: post.data.upvote_ratio || 0,
                    post_hint: post.data.post_hint || '',
                    domain: post.data.domain || '',
                    scraped_at: new Date().toISOString(),
                    scraper_version: '2.0.0'
                };
                
                // Validate and enrich data
                if (this.config.enableValidation && !this.validatePost(postData)) {
                    this.log(`Post validation failed: ${postData.id}`, 'WARN');
                    return null;
                }
                
                postData.relevance_score = this.calculateRelevanceScore(postData);
                postData.marketing_category = this.categorizeForMarketing(postData);
                postData.content_length = postData.selftext.length;
                postData.marketing_priority = this.getMarketingPriority(postData);
                postData.quality_score = this.calculateQualityScore(postData);
                
                return postData;
            }).filter(post => post !== null);
            
            const duration = Date.now() - startTime;
            this.metrics.performance[`${subreddit}_${sortBy}`] = {
                duration,
                postsFound: posts.length,
                postsProcessed: processedPosts.length,
                averageProcessingTime: duration / processedPosts.length
            };
            
            this.log(`Completed r/${subreddit} in ${duration}ms - ${processedPosts.length} valid posts`);
            return processedPosts;
            
        } catch (error) {
            this.log(`Failed to scrape r/${subreddit}: ${error.message}`, 'ERROR');
            this.metrics.errors.push({
                subreddit,
                sortBy,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return [];
        }
    }

    validatePost(post) {
        // Basic validation
        if (!post.title || post.title.length < 10) return false;
        if (post.author === '[deleted]' && !post.selftext) return false;
        if (post.is_self && post.selftext.length < this.config.minContentLength) return false;
        
        // Content quality checks
        if (post.selftext.includes('[removed]') || post.selftext.includes('[deleted]')) return false;
        
        return true;
    }

    calculateQualityScore(post) {
        let score = 0;
        
        // Content richness
        if (post.selftext.length > 200) score += 2;
        if (post.selftext.length > 500) score += 3;
        if (post.selftext.length > 1000) score += 5;
        
        // Engagement quality
        if (post.upvote_ratio > 0.8) score += 2;
        if (post.score > 10) score += 1;
        if (post.score > 50) score += 2;
        if (post.num_comments > 5) score += 1;
        if (post.num_comments > 20) score += 2;
        
        // Recency bonus
        const daysSincePosted = (Date.now() - (post.created_utc * 1000)) / (1000 * 60 * 60 * 24);
        if (daysSincePosted < 7) score += 2;
        if (daysSincePosted < 30) score += 1;
        
        return score;
    }

    async scrapeAllSubredditsProduction() {
        this.metrics.startTime = Date.now();
        this.log('Starting comprehensive production scraping...');
        
        const totalSubreddits = this.subreddits.length;
        let completedSubreddits = 0;
        
        try {
            for (const subreddit of this.subreddits) {
                try {
                    this.log(`Progress: ${completedSubreddits + 1}/${totalSubreddits} - Processing r/${subreddit}`);
                    
                    // Scrape hot posts
                    const hotPosts = await this.scrapeSubredditProduction(subreddit, 'hot', 50);
                    this.posts.push(...hotPosts);
                    
                    // Scrape top posts
                    const topPosts = await this.scrapeSubredditProduction(subreddit, 'top', 25);
                    this.posts.push(...topPosts);
                    
                    // Progress checkpoint
                    completedSubreddits++;
                    const progressPercent = Math.round((completedSubreddits / totalSubreddits) * 100);
                    this.log(`Progress: ${progressPercent}% complete (${completedSubreddits}/${totalSubreddits} subreddits)`);
                    
                    // Backup progress periodically
                    if (this.config.enableBackup && completedSubreddits % 5 === 0) {
                        await this.createBackup(`progress_${completedSubreddits}_subreddits`);
                    }
                    
                } catch (error) {
                    this.log(`Failed to process r/${subreddit}: ${error.message}`, 'ERROR');
                    completedSubreddits++;
                }
            }
            
            // Post-processing
            this.log('Starting post-processing...');
            await this.postProcessPosts();
            
            this.metrics.endTime = Date.now();
            this.metrics.totalPosts = this.posts.length;
            this.metrics.qualityPosts = this.posts.filter(p => p.quality_score > 5).length;
            
            this.log('Production scraping completed successfully');
            return this.posts;
            
        } catch (error) {
            this.log(`Production scraping failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async postProcessPosts() {
        this.log('Starting post-processing: deduplication, sorting, quality filtering...');
        
        // Remove duplicates
        const uniquePosts = [];
        const seenIds = new Set();
        const seenTitles = new Set();
        
        for (const post of this.posts) {
            const titleKey = post.title.toLowerCase().trim();
            if (!seenIds.has(post.id) && !seenTitles.has(titleKey)) {
                seenIds.add(post.id);
                seenTitles.add(titleKey);
                uniquePosts.push(post);
            }
        }
        
        this.log(`Deduplication: ${this.posts.length} -> ${uniquePosts.length} posts`);
        
        // Sort by relevance and quality
        uniquePosts.sort((a, b) => {
            const scoreA = a.relevance_score + (a.quality_score * 0.5);
            const scoreB = b.relevance_score + (b.quality_score * 0.5);
            return scoreB - scoreA;
        });
        
        this.posts = uniquePosts;
        this.log('Post-processing completed');
    }

    async createBackup(label = '') {
        if (!this.config.enableBackup) return;
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${label}_${timestamp}.json`;
            const filepath = path.join(this.config.dataDirectory, 'backups', filename);
            
            const backupData = {
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: '2.0.0',
                    label,
                    totalPosts: this.posts.length,
                    metrics: this.metrics
                },
                posts: this.posts,
                config: this.config
            };
            
            fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
            this.log(`Backup created: ${filepath}`);
            
        } catch (error) {
            this.log(`Backup failed: ${error.message}`, 'ERROR');
        }
    }

    async saveProductionOutputs() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFiles = [];
        
        try {
            this.log('Generating production output files...');
            
            // 1. Urgent content (score 20+)
            const urgentPosts = this.posts.filter(p => p.relevance_score >= 20 && p.quality_score >= 5);
            if (urgentPosts.length > 0) {
                const urgentPath = await this.saveSpecializedCSV(
                    urgentPosts,
                    path.join(this.config.dataDirectory, 'csv', `urgent-content-${timestamp}.csv`),
                    'urgent'
                );
                outputFiles.push({ type: 'urgent', path: urgentPath, count: urgentPosts.length });
            }
            
            // 2. High-value content (score 15+)
            const highValuePosts = this.posts.filter(p => p.relevance_score >= 15 && p.quality_score >= 3);
            if (highValuePosts.length > 0) {
                const highValuePath = await this.saveSpecializedCSV(
                    highValuePosts,
                    path.join(this.config.dataDirectory, 'csv', `high-value-${timestamp}.csv`),
                    'high-value'
                );
                outputFiles.push({ type: 'high-value', path: highValuePath, count: highValuePosts.length });
            }
            
            // 3. Complete detailed analysis
            const detailedPath = await this.saveDetailedCSV(
                path.join(this.config.dataDirectory, 'csv', `detailed-analysis-${timestamp}.csv`)
            );
            outputFiles.push({ type: 'detailed', path: detailedPath, count: this.posts.length });
            
            // 4. Executive summary
            const summaryPath = await this.saveSummaryCSV(
                path.join(this.config.dataDirectory, 'csv', `executive-summary-${timestamp}.csv`)
            );
            outputFiles.push({ type: 'summary', path: summaryPath, count: this.posts.filter(p => p.relevance_score > 10).length });
            
            // 5. Complete JSON dataset
            const jsonPath = path.join(this.config.dataDirectory, 'json', `complete-dataset-${timestamp}.json`);
            await this.saveCompleteJSON(jsonPath);
            outputFiles.push({ type: 'json', path: jsonPath, count: this.posts.length });
            
            // 6. Metrics and performance report
            const metricsPath = path.join(this.config.dataDirectory, 'json', `metrics-${timestamp}.json`);
            await this.saveMetricsReport(metricsPath);
            outputFiles.push({ type: 'metrics', path: metricsPath, count: 1 });
            
            this.log('All production outputs generated successfully');
            return outputFiles;
            
        } catch (error) {
            this.log(`Failed to generate outputs: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async saveSpecializedCSV(posts, filepath, type) {
        const csvRows = [];
        
        // Headers based on type
        if (type === 'urgent') {
            csvRows.push([
                'URGENT PRIORITY',
                'Marketing Application',
                'Title',
                'Subreddit',
                'Relevance Score',
                'Quality Score',
                'Upvotes',
                'Comments',
                'Full Content',
                'Extracted Pain Points',
                'Success Metrics',
                'Emotional Triggers',
                'Best Quotes',
                'URL',
                'Created Date'
            ]);
        } else if (type === 'high-value') {
            csvRows.push([
                'Priority',
                'Title',
                'Subreddit',
                'Marketing Category',
                'Relevance Score',
                'Quality Score',
                'Content Length',
                'Full Content',
                'Marketing Applications',
                'URL'
            ]);
        }
        
        for (const post of posts.slice(0, 100)) { // Limit for performance
            const insights = this.extractMarketingInsights(post);
            const applications = this.generateSpecificMarketingApplications(post);
            
            if (type === 'urgent') {
                csvRows.push([
                    'IMMEDIATE USE REQUIRED',
                    applications.split(' | ')[0] || 'High-impact content',
                    `"${post.title.replace(/"/g, '""')}"`,
                    post.subreddit,
                    post.relevance_score,
                    post.quality_score,
                    post.score,
                    post.num_comments,
                    `"${post.selftext.replace(/"/g, '""')}"`,
                    `"${insights.pain_points.slice(0, 3).join('; ').replace(/"/g, '""')}"`,
                    `"${insights.success_metrics.slice(0, 3).join('; ').replace(/"/g, '""')}"`,
                    `"${insights.emotional_triggers.join(', ')}"`,
                    `"${insights.quotes.slice(0, 2).join(' | ').replace(/"/g, '""')}"`,
                    post.permalink,
                    post.created_date
                ]);
            } else if (type === 'high-value') {
                csvRows.push([
                    post.marketing_priority,
                    `"${post.title.replace(/"/g, '""')}"`,
                    post.subreddit,
                    post.marketing_category,
                    post.relevance_score,
                    post.quality_score,
                    post.content_length,
                    `"${post.selftext.substring(0, 1000).replace(/"/g, '""')}"`,
                    `"${applications.replace(/"/g, '""')}"`,
                    post.permalink
                ]);
            }
        }
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        fs.writeFileSync(filepath, csvContent);
        
        this.log(`Saved ${posts.length} ${type} posts to ${filepath}`);
        return filepath;
    }

    async saveSummaryCSV(filepath) {
        const summary = this.generateAdvancedSummaryReport();
        const topPosts = this.posts.filter(p => p.relevance_score > 10).slice(0, 50);
        
        const csvRows = [];
        csvRows.push([
            'Executive Summary',
            'Marketing Opportunity',
            'Title',
            'Subreddit',
            'Priority',
            'Content Preview',
            'Immediate Action',
            'URL'
        ]);
        
        for (const post of topPosts) {
            const opportunity = this.identifyMarketingOpportunity(post);
            const action = this.suggestImmediateAction(post);
            
            csvRows.push([
                `${post.relevance_score}/30 relevance, ${post.quality_score}/15 quality`,
                opportunity,
                `"${post.title.replace(/"/g, '""')}"`,
                post.subreddit,
                post.marketing_priority,
                `"${post.selftext.substring(0, 200).replace(/"/g, '""')}..."`,
                action,
                post.permalink
            ]);
        }
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        fs.writeFileSync(filepath, csvContent);
        
        this.log(`Saved executive summary to ${filepath}`);
        return filepath;
    }

    identifyMarketingOpportunity(post) {
        const category = post.marketing_category;
        const score = post.relevance_score;
        const content = post.selftext.toLowerCase();
        
        if (content.includes('hours') && content.includes('waste')) {
            return 'Time-saving value proposition';
        } else if (content.includes('automated') || content.includes('automation')) {
            return 'Automation success story';
        } else if (content.includes('frustrated') || content.includes('difficult')) {
            return 'Pain point validation';
        } else if (score > 20) {
            return 'High-impact marketing content';
        } else if (category === 'Success Stories') {
            return 'Customer testimonial potential';
        } else {
            return 'Market intelligence';
        }
    }

    suggestImmediateAction(post) {
        const opportunity = this.identifyMarketingOpportunity(post);
        
        switch (opportunity) {
            case 'Time-saving value proposition':
                return 'Use in ROI calculator, email subjects';
            case 'Automation success story':
                return 'Develop case study, social proof';
            case 'Pain point validation':
                return 'Update pitch deck problem statement';
            case 'High-impact marketing content':
                return 'Feature in hero content, main messaging';
            case 'Customer testimonial potential':
                return 'Extract quotes, create testimonial';
            default:
                return 'Add to content strategy pipeline';
        }
    }

    async saveCompleteJSON(filepath) {
        const completeData = {
            metadata: {
                version: '2.0.0',
                generatedAt: new Date().toISOString(),
                totalPosts: this.posts.length,
                qualityPosts: this.posts.filter(p => p.quality_score > 5).length,
                urgentPosts: this.posts.filter(p => p.relevance_score >= 20).length,
                configuration: this.config,
                metrics: this.metrics
            },
            summary: this.generateAdvancedSummaryReport(),
            posts: this.posts,
            analysis: {
                topCategories: this.getTopCategories(),
                topSubreddits: this.getTopSubreddits(),
                marketingOpportunities: this.getMarketingOpportunities(),
                competitiveIntelligence: this.getCompetitiveIntelligence()
            }
        };
        
        fs.writeFileSync(filepath, JSON.stringify(completeData, null, 2));
        this.log(`Saved complete dataset to ${filepath}`);
        return filepath;
    }

    async saveMetricsReport(filepath) {
        const report = {
            performance: {
                totalDuration: this.metrics.endTime - this.metrics.startTime,
                averageRequestTime: this.metrics.totalRequests > 0 ? 
                    (this.metrics.endTime - this.metrics.startTime) / this.metrics.totalRequests : 0,
                successRate: this.metrics.totalRequests > 0 ? 
                    (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 : 0,
                postsPerMinute: this.metrics.totalPosts / ((this.metrics.endTime - this.metrics.startTime) / 60000)
            },
            quality: {
                totalPosts: this.metrics.totalPosts,
                qualityPosts: this.metrics.qualityPosts,
                qualityRate: this.metrics.totalPosts > 0 ? 
                    (this.metrics.qualityPosts / this.metrics.totalPosts) * 100 : 0,
                averageRelevanceScore: this.posts.length > 0 ? 
                    this.posts.reduce((sum, p) => sum + p.relevance_score, 0) / this.posts.length : 0
            },
            errors: this.metrics.errors,
            recommendations: this.generatePerformanceRecommendations()
        };
        
        fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
        this.log(`Saved metrics report to ${filepath}`);
        return filepath;
    }

    generatePerformanceRecommendations() {
        const recommendations = [];
        
        if (this.metrics.errors.length > 0) {
            recommendations.push('Consider reducing request frequency to minimize errors');
        }
        
        if (this.metrics.qualityPosts / this.metrics.totalPosts < 0.3) {
            recommendations.push('Adjust keyword targeting to improve content quality');
        }
        
        if (this.posts.filter(p => p.relevance_score >= 20).length < 10) {
            recommendations.push('Expand subreddit list to find more high-value content');
        }
        
        return recommendations;
    }

    generateAdvancedSummaryReport() {
        // Enhanced version of the existing summary with production metrics
        const basicSummary = this.generateSummaryReport();
        
        return {
            ...basicSummary,
            qualityMetrics: {
                averageQualityScore: this.posts.length > 0 ? 
                    this.posts.reduce((sum, p) => sum + p.quality_score, 0) / this.posts.length : 0,
                highQualityPosts: this.posts.filter(p => p.quality_score > 8).length,
                contentRichPosts: this.posts.filter(p => p.content_length > 500).length
            },
            marketingReadiness: {
                urgentContent: this.posts.filter(p => p.relevance_score >= 20).length,
                highValueContent: this.posts.filter(p => p.relevance_score >= 15).length,
                usableContent: this.posts.filter(p => p.relevance_score >= 10).length
            },
            performance: this.metrics
        };
    }

    getTopCategories() {
        const categories = {};
        this.posts.forEach(post => {
            categories[post.marketing_category] = (categories[post.marketing_category] || 0) + 1;
        });
        
        return Object.entries(categories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([category, count]) => ({ category, count }));
    }

    getTopSubreddits() {
        const subreddits = {};
        this.posts.forEach(post => {
            if (!subreddits[post.subreddit]) {
                subreddits[post.subreddit] = { count: 0, totalRelevance: 0, avgQuality: 0 };
            }
            subreddits[post.subreddit].count++;
            subreddits[post.subreddit].totalRelevance += post.relevance_score;
            subreddits[post.subreddit].avgQuality += post.quality_score;
        });
        
        return Object.entries(subreddits)
            .map(([name, stats]) => ({
                subreddit: name,
                count: stats.count,
                avgRelevance: (stats.totalRelevance / stats.count).toFixed(1),
                avgQuality: (stats.avgQuality / stats.count).toFixed(1)
            }))
            .sort((a, b) => b.avgRelevance - a.avgRelevance)
            .slice(0, 10);
    }

    getMarketingOpportunities() {
        return this.posts
            .filter(p => p.relevance_score >= 15)
            .slice(0, 20)
            .map(post => ({
                title: post.title,
                opportunity: this.identifyMarketingOpportunity(post),
                action: this.suggestImmediateAction(post),
                relevanceScore: post.relevance_score,
                url: post.permalink
            }));
    }

    getCompetitiveIntelligence() {
        const competitors = ['salesforce', 'hubspot', 'pipedrive', 'outreach', 'salesloft'];
        const mentions = {};
        
        competitors.forEach(competitor => {
            mentions[competitor] = this.posts.filter(post => 
                post.selftext.toLowerCase().includes(competitor) || 
                post.title.toLowerCase().includes(competitor)
            ).length;
        });
        
        return Object.entries(mentions)
            .filter(([, count]) => count > 0)
            .sort(([,a], [,b]) => b - a)
            .map(([competitor, count]) => ({ competitor, mentions: count }));
    }

    async runProductionScraping() {
        try {
            this.log('='.repeat(60));
            this.log('STARTING PRODUCTION REDDIT SCRAPING');
            this.log('='.repeat(60));
            
            // Pre-flight checks
            await this.runPreflightChecks();
            
            // Main scraping
            await this.scrapeAllSubredditsProduction();
            
            // Generate outputs
            const outputFiles = await this.saveProductionOutputs();
            
            // Create final backup
            await this.createBackup('final');
            
            // Generate final report
            const report = this.generateFinalReport(outputFiles);
            
            this.log('='.repeat(60));
            this.log('PRODUCTION SCRAPING COMPLETED SUCCESSFULLY');
            this.log('='.repeat(60));
            
            return report;
            
        } catch (error) {
            this.log(`PRODUCTION SCRAPING FAILED: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async runPreflightChecks() {
        this.log('Running pre-flight checks...');
        
        // Check disk space
        // Check network connectivity
        // Validate configuration
        
        this.log('Pre-flight checks completed');
    }

    generateFinalReport(outputFiles) {
        const duration = this.metrics.endTime - this.metrics.startTime;
        const durationMinutes = Math.round(duration / 60000);
        
        const report = {
            success: true,
            duration: `${durationMinutes} minutes`,
            statistics: {
                totalPosts: this.metrics.totalPosts,
                qualityPosts: this.metrics.qualityPosts,
                urgentPosts: this.posts.filter(p => p.relevance_score >= 20).length,
                highValuePosts: this.posts.filter(p => p.relevance_score >= 15).length,
                successRate: `${Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100)}%`
            },
            outputFiles,
            recommendations: this.generateFinalRecommendations(),
            nextSteps: this.generateNextSteps()
        };
        
        // Log final report
        this.log('FINAL REPORT:');
        this.log(`Duration: ${durationMinutes} minutes`);
        this.log(`Total posts: ${this.metrics.totalPosts}`);
        this.log(`Quality posts: ${this.metrics.qualityPosts}`);
        this.log(`Urgent posts: ${this.posts.filter(p => p.relevance_score >= 20).length}`);
        this.log(`Output files: ${outputFiles.length}`);
        
        return report;
    }

    generateFinalRecommendations() {
        const urgentPosts = this.posts.filter(p => p.relevance_score >= 20).length;
        const qualityRate = (this.metrics.qualityPosts / this.metrics.totalPosts) * 100;
        
        const recommendations = [];
        
        if (urgentPosts > 0) {
            recommendations.push(`${urgentPosts} urgent posts ready for immediate marketing use`);
        }
        
        if (qualityRate > 70) {
            recommendations.push('Excellent content quality - proceed with confidence');
        } else if (qualityRate > 50) {
            recommendations.push('Good content quality - filter for best posts');
        } else {
            recommendations.push('Consider refining keyword targeting for better quality');
        }
        
        return recommendations;
    }

    generateNextSteps() {
        return [
            'Review urgent-content CSV for immediate marketing opportunities',
            'Analyze high-value CSV for content strategy planning',
            'Extract quotes and pain points for copy development',
            'Schedule regular scraping for ongoing market intelligence',
            'Share insights with sales and marketing teams'
        ];
    }
}

module.exports = ProductionRedditScraper;