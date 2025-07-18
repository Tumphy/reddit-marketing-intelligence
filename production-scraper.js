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
            requestDelay: 2000,
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
            maxFileSize: 50 * 1024 * 1024,
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
        this.log('='.repeat(50));
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        console.log(logMessage);
        
        if (this.config.enableLogging && this.logFile) {
            try {
                fs.appendFileSync(this.logFile, logMessage + '\\n');
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

    validatePost(post) {
        if (!post.title || post.title.length < 10) return false;
        if (post.author === '[deleted]' && !post.selftext) return false;
        if (post.is_self && post.selftext.length < this.config.minContentLength) return false;
        if (post.selftext.includes('[removed]') || post.selftext.includes('[deleted]')) return false;
        return true;
    }

    calculateQualityScore(post) {
        let score = 0;
        
        if (post.selftext.length > 200) score += 2;
        if (post.selftext.length > 500) score += 3;
        if (post.selftext.length > 1000) score += 5;
        
        if (post.upvote_ratio > 0.8) score += 2;
        if (post.score > 10) score += 1;
        if (post.score > 50) score += 2;
        if (post.num_comments > 5) score += 1;
        if (post.num_comments > 20) score += 2;
        
        const daysSincePosted = (Date.now() - (post.created_utc * 1000)) / (1000 * 60 * 60 * 24);
        if (daysSincePosted < 7) score += 2;
        if (daysSincePosted < 30) score += 1;
        
        return score;
    }

    async scrapeSubredditProduction(subreddit, sortBy = 'hot', limit = 100) {
        const startTime = Date.now();
        this.log(`Starting production scraping: r/${subreddit} (${sortBy}, limit: ${limit})`);
        
        try {
            const url = `https://www.reddit.com/r/${subreddit}/${sortBy}/.json?limit=${limit}`;
            
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

    async scrapeAllSubredditsProduction() {
        this.metrics.startTime = Date.now();
        this.log('Starting comprehensive production scraping...');
        
        const totalSubreddits = this.subreddits.length;
        let completedSubreddits = 0;
        
        try {
            for (const subreddit of this.subreddits) {
                try {
                    this.log(`Progress: ${completedSubreddits + 1}/${totalSubreddits} - Processing r/${subreddit}`);
                    
                    const hotPosts = await this.scrapeSubredditProduction(subreddit, 'hot', 50);
                    this.posts.push(...hotPosts);
                    
                    const topPosts = await this.scrapeSubredditProduction(subreddit, 'top', 25);
                    this.posts.push(...topPosts);
                    
                    completedSubreddits++;
                    const progressPercent = Math.round((completedSubreddits / totalSubreddits) * 100);
                    this.log(`Progress: ${progressPercent}% complete (${completedSubreddits}/${totalSubreddits} subreddits)`);
                    
                    if (this.config.enableBackup && completedSubreddits % 5 === 0) {
                        await this.createBackup(`progress_${completedSubreddits}_subreddits`);
                    }
                    
                } catch (error) {
                    this.log(`Failed to process r/${subreddit}: ${error.message}`, 'ERROR');
                    completedSubreddits++;
                }
            }
            
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

    async runProductionScraping() {
        try {
            this.log('STARTING PRODUCTION REDDIT SCRAPING');
            
            await this.scrapeAllSubredditsProduction();
            const outputFiles = await this.saveProductionOutputs();
            await this.createBackup('final');
            
            const report = this.generateFinalReport(outputFiles);
            
            this.log('PRODUCTION SCRAPING COMPLETED SUCCESSFULLY');
            return report;
            
        } catch (error) {
            this.log(`PRODUCTION SCRAPING FAILED: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async saveProductionOutputs() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFiles = [];
        
        try {
            this.log('Generating production output files...');
            
            // Use enhanced scraper methods with production paths
            const urgentPosts = this.posts.filter(p => p.relevance_score >= 20 && p.quality_score >= 5);
            const highValuePosts = this.posts.filter(p => p.relevance_score >= 15 && p.quality_score >= 3);
            
            if (urgentPosts.length > 0) {
                const urgentPath = await this.saveTopPostsDetailed(`urgent-content-${timestamp}.csv`, 20);
                outputFiles.push({ type: 'urgent', path: urgentPath, count: urgentPosts.length });
            }
            
            if (highValuePosts.length > 0) {
                const highValuePath = await this.saveTopPostsDetailed(`high-value-${timestamp}.csv`, 15);
                outputFiles.push({ type: 'high-value', path: highValuePath, count: highValuePosts.length });
            }
            
            const detailedPath = await this.saveDetailedCSV(`detailed-analysis-${timestamp}.csv`);
            outputFiles.push({ type: 'detailed', path: detailedPath, count: this.posts.length });
            
            const summaryPath = await this.saveToCSV(`executive-summary-${timestamp}.csv`);
            outputFiles.push({ type: 'summary', path: summaryPath, count: this.posts.filter(p => p.relevance_score > 10).length });
            
            const jsonData = {
                metadata: {
                    version: '2.0.0',
                    generatedAt: new Date().toISOString(),
                    totalPosts: this.posts.length,
                    qualityPosts: this.posts.filter(p => p.quality_score > 5).length,
                    urgentPosts: this.posts.filter(p => p.relevance_score >= 20).length,
                    metrics: this.metrics
                },
                summary: this.generateSummaryReport(),
                posts: this.posts
            };
            
            const jsonPath = `complete-dataset-${timestamp}.json`;
            fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
            outputFiles.push({ type: 'json', path: jsonPath, count: this.posts.length });
            
            const metricsData = {
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
                recommendations: []
            };
            
            const metricsPath = `metrics-${timestamp}.json`;
            fs.writeFileSync(metricsPath, JSON.stringify(metricsData, null, 2));
            outputFiles.push({ type: 'metrics', path: metricsPath, count: 1 });
            
            this.log('All production outputs generated successfully');
            return outputFiles;
            
        } catch (error) {
            this.log(`Failed to generate outputs: ${error.message}`, 'ERROR');
            throw error;
        }
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
            recommendations: [
                'Review urgent-content CSV for immediate marketing opportunities',
                'Use high-value CSV for strategic content planning'
            ],
            nextSteps: [
                'Review urgent-content CSV for immediate marketing opportunities',
                'Analyze high-value CSV for content strategy planning',
                'Extract quotes and pain points for copy development',
                'Schedule regular scraping for ongoing market intelligence',
                'Share insights with sales and marketing teams'
            ]
        };
        
        this.log('FINAL REPORT:');
        this.log(`Duration: ${durationMinutes} minutes`);
        this.log(`Total posts: ${this.metrics.totalPosts}`);
        this.log(`Quality posts: ${this.metrics.qualityPosts}`);
        this.log(`Urgent posts: ${this.posts.filter(p => p.relevance_score >= 20).length}`);
        this.log(`Output files: ${outputFiles.length}`);
        
        return report;
    }
}

module.exports = ProductionRedditScraper;