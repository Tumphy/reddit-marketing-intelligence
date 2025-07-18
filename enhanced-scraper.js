const https = require('https');
const fs = require('fs');
const path = require('path');

class EnhancedRedditScraper {
    constructor() {
        this.posts = [];
        this.relevantKeywords = [
            // Sales pain points
            'cold calling', 'cold email', 'prospecting', 'lead generation', 'sales process',
            'crm', 'salesforce', 'hubspot', 'sales automation', 'sales tools',
            'outreach', 'follow up', 'pipeline', 'quota', 'sales target',
            'discovery call', 'demo', 'proposal', 'closing deals', 'objection handling',
            'sales enablement', 'sales training', 'sales coaching', 'sales performance',
            'account management', 'territory planning', 'sales strategy',
            
            // AI/Automation related
            'ai', 'artificial intelligence', 'automation', 'chatgpt', 'machine learning',
            'automate', 'efficiency', 'productivity', 'time saving', 'scale',
            
            // Business problems GreendoorAI solves
            'research', 'admin', 'data entry', 'meeting prep', 'note taking',
            'follow up', 'pipeline management', 'forecasting', 'reporting',
            'contact management', 'lead scoring', 'qualification',
            'personalization', 'outbound', 'inbound', 'multi-touch',
            
            // Emotional/pain keywords
            'frustrated', 'overwhelmed', 'time consuming', 'manual', 'repetitive',
            'burnout', 'stress', 'difficult', 'challenging', 'struggle',
            'wish', 'need', 'want', 'looking for', 'solution', 'help',
            'problem', 'issue', 'pain', 'headache', 'nightmare'
        ];
        
        this.subreddits = [
            'sales', 'techsales', 'startups', 'entrepreneur', 'EntrepreneurRideAlong',
            'smallbusiness', 'marketing', 'SaaS', 'salesforce',
            'hubspot', 'digitalnomad', 'remotework', 'productivity'
        ];
    }

    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            };

            https.get(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    calculateRelevanceScore(post) {
        let score = 0;
        const title = (post.title || '').toLowerCase();
        const selftext = (post.selftext || '').toLowerCase();
        const combined = title + ' ' + selftext;
        
        // Check for keyword matches
        this.relevantKeywords.forEach(keyword => {
            const regex = new RegExp(keyword.toLowerCase(), 'gi');
            const matches = combined.match(regex);
            if (matches) {
                score += matches.length * 2;
            }
        });
        
        // Bonus for high engagement
        if (post.score > 50) score += 5;
        if (post.score > 100) score += 10;
        if (post.num_comments > 20) score += 5;
        if (post.num_comments > 50) score += 10;
        
        // Bonus for questions (potential pain points)
        if (title.includes('?') || title.toLowerCase().includes('how') || 
            title.toLowerCase().includes('what') || title.toLowerCase().includes('why')) {
            score += 5;
        }
        
        // Bonus for self posts (usually more detailed stories)
        if (post.is_self) score += 3;
        
        return score;
    }

    async scrapeSubreddit(subreddit, sortBy = 'hot', limit = 100) {
        const url = `https://www.reddit.com/r/${subreddit}/${sortBy}/.json?limit=${limit}`;
        
        try {
            console.log(`Scraping r/${subreddit} (${sortBy})...`);
            
            await this.delay(1000);
            
            const data = await this.makeRequest(url);
            const posts = data.data.children;
            
            console.log(`Found ${posts.length} posts in r/${subreddit}`);
            
            const processedPosts = posts.map(post => {
                const postData = {
                    subreddit: subreddit,
                    title: post.data.title,
                    selftext: post.data.selftext || '',
                    selftext_html: post.data.selftext_html || '',
                    score: post.data.score,
                    num_comments: post.data.num_comments,
                    created_utc: post.data.created_utc,
                    created_date: new Date(post.data.created_utc * 1000).toISOString(),
                    author: post.data.author,
                    permalink: `https://www.reddit.com${post.data.permalink}`,
                    flair_text: post.data.link_flair_text,
                    url: post.data.url,
                    is_self: post.data.is_self,
                    upvote_ratio: post.data.upvote_ratio,
                    post_hint: post.data.post_hint || '',
                    domain: post.data.domain || ''
                };
                
                postData.relevance_score = this.calculateRelevanceScore(postData);
                postData.marketing_category = this.categorizeForMarketing(postData);
                postData.content_length = postData.selftext.length;
                postData.marketing_priority = this.getMarketingPriority(postData);
                
                return postData;
            });
            
            return processedPosts;
            
        } catch (error) {
            console.error(`Error scraping r/${subreddit}:`, error.message);
            return [];
        }
    }

    categorizeForMarketing(post) {
        const title = (post.title || '').toLowerCase();
        const selftext = (post.selftext || '').toLowerCase();
        const combined = title + ' ' + selftext;
        
        if (this.containsKeywords(combined, ['cold', 'outreach', 'prospecting', 'lead generation'])) {
            return 'Outreach & Prospecting';
        } else if (this.containsKeywords(combined, ['crm', 'salesforce', 'hubspot', 'pipeline', 'automation'])) {
            return 'CRM & Automation';
        } else if (this.containsKeywords(combined, ['meeting', 'demo', 'call', 'presentation', 'prep'])) {
            return 'Meeting & Demo Management';
        } else if (this.containsKeywords(combined, ['admin', 'data entry', 'manual', 'repetitive', 'time consuming'])) {
            return 'Admin & Efficiency';
        } else if (this.containsKeywords(combined, ['research', 'account', 'company', 'contact', 'intel'])) {
            return 'Research & Intelligence';
        } else if (this.containsKeywords(combined, ['quota', 'target', 'performance', 'forecast', 'pipeline'])) {
            return 'Performance & Forecasting';
        } else if (this.containsKeywords(combined, ['burnout', 'stress', 'overwhelmed', 'frustrated', 'difficult'])) {
            return 'Pain Points & Challenges';
        } else if (this.containsKeywords(combined, ['success', 'won', 'closed', 'achievement', 'celebration'])) {
            return 'Success Stories';
        } else {
            return 'General Sales';
        }
    }

    getMarketingPriority(post) {
        if (post.relevance_score >= 20) return 'URGENT - Use immediately';
        if (post.relevance_score >= 15) return 'HIGH - Pitch decks, case studies';
        if (post.relevance_score >= 10) return 'MEDIUM - Blog posts, emails';
        if (post.relevance_score >= 5) return 'LOW - Research, inspiration';
        return 'ARCHIVE - Background intel';
    }

    containsKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    extractMarketingInsights(post) {
        const insights = {
            pain_points: [],
            success_metrics: [],
            tools_mentioned: [],
            emotional_triggers: [],
            quotes: []
        };

        const text = (post.title + ' ' + post.selftext).toLowerCase();
        
        // Extract pain points
        const painPatterns = [
            /(?:frustrated|annoyed|hate|difficult|struggle|problem|issue) (?:with|about|when) ([^.!?]+)/gi,
            /(?:spend|waste|takes?) (\\d+) (?:hours?|minutes?) (?:on|doing|per) ([^.!?]+)/gi,
            /(?:wish|need|want) (?:to|a|an) ([^.!?]+)/gi
        ];
        
        painPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                insights.pain_points.push(...matches.slice(0, 3)); // Limit to 3 per pattern
            }
        });

        // Extract success metrics
        const successPatterns = [
            /(?:increased|improved|reduced|saved|gained) (\\d+(?:%|\\s*percent|x|times|hours?|minutes?))/gi,
            /(?:from \\d+ to \\d+|by \\d+%|in \\d+ (?:days?|weeks?|months?))/gi
        ];
        
        successPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                insights.success_metrics.push(...matches.slice(0, 3));
            }
        });

        // Extract tool mentions
        const tools = ['salesforce', 'hubspot', 'pipedrive', 'outreach', 'salesloft', 'apollo', 'zoominfo', 'linkedin'];
        tools.forEach(tool => {
            if (text.includes(tool)) {
                insights.tools_mentioned.push(tool);
            }
        });

        // Extract emotional triggers
        const emotions = ['frustrated', 'overwhelmed', 'excited', 'amazed', 'grateful', 'stressed', 'exhausted'];
        emotions.forEach(emotion => {
            if (text.includes(emotion)) {
                insights.emotional_triggers.push(emotion);
            }
        });

        // Extract quotable sentences (high impact statements)
        const sentences = post.selftext.split(/[.!?]+/);
        sentences.forEach(sentence => {
            if (sentence.length > 50 && sentence.length < 200) {
                const score = this.relevantKeywords.reduce((acc, keyword) => {
                    return acc + (sentence.toLowerCase().includes(keyword) ? 1 : 0);
                }, 0);
                
                if (score >= 2) {
                    insights.quotes.push(sentence.trim());
                }
            }
        });

        return insights;
    }

    async scrapeAllSubreddits() {
        console.log('Starting Enhanced Reddit scraping for GreendoorAI marketing insights...');
        
        for (const subreddit of this.subreddits) {
            try {
                const posts = await this.scrapeSubreddit(subreddit, 'hot', 50);
                this.posts.push(...posts);
                
                const topPosts = await this.scrapeSubreddit(subreddit, 'top', 25);
                this.posts.push(...topPosts);
                
            } catch (error) {
                console.error(`Failed to scrape r/${subreddit}:`, error.message);
            }
        }
        
        // Sort by relevance score
        this.posts.sort((a, b) => b.relevance_score - a.relevance_score);
        
        // Remove duplicates
        const uniquePosts = [];
        const seenTitles = new Set();
        
        for (const post of this.posts) {
            if (!seenTitles.has(post.title)) {
                seenTitles.add(post.title);
                uniquePosts.push(post);
            }
        }
        
        this.posts = uniquePosts;
        
        console.log(`Scraped ${this.posts.length} unique posts total`);
        console.log(`Found ${this.posts.filter(p => p.relevance_score > 5).length} highly relevant posts`);
        
        return this.posts;
    }

    generateSpecificMarketingApplications(post) {
        const category = post.marketing_category;
        const title = post.title;
        const content = post.selftext.substring(0, 500);
        
        let applications = [];

        // Generate specific use cases based on content
        if (content.includes('hours') || content.includes('time')) {
            applications.push('Email subject: Stop wasting hours on [specific task]');
        }
        
        if (content.includes('automated') || content.includes('automation')) {
            applications.push('Case study: How automation saved [time/effort]');
        }
        
        if (content.includes('frustrated') || content.includes('difficult')) {
            applications.push('Problem statement: Address frustration with [specific pain]');
        }
        
        if (post.score > 100) {
            applications.push('Social proof: High engagement validates this pain point');
        }
        
        if (category === 'Success Stories') {
            applications.push('Customer testimonial angle, before/after story');
        }
        
        // Add category-specific applications
        switch (category) {
            case 'Outreach & Prospecting':
                applications.push('Cold email templates, prospecting guides');
                break;
            case 'CRM & Automation':
                applications.push('Feature comparison, integration benefits');
                break;
            case 'Meeting & Demo Management':
                applications.push('Demo preparation content, meeting efficiency');
                break;
            case 'Admin & Efficiency':
                applications.push('Time-saving ROI calculator, efficiency metrics');
                break;
        }

        return applications.join(' | ');
    }

    async saveDetailedCSV(filename = 'reddit-detailed-insights.csv') {
        const csvRows = [];
        
        // Headers
        csvRows.push([
            'Title',
            'Subreddit', 
            'Marketing Category',
            'Marketing Priority',
            'Relevance Score',
            'Score (Upvotes)',
            'Comments',
            'Content Length',
            'Created Date',
            'Author',
            'URL',
            'Full Content',
            'Pain Points',
            'Success Metrics',
            'Tools Mentioned',
            'Emotional Triggers',
            'Best Quotes',
            'Flair',
            'Marketing Use Case'
        ]);
        
        // Filter for most relevant posts with content
        const relevantPosts = this.posts.filter(post => 
            post.relevance_score > 3 && 
            post.is_self && 
            post.selftext.length > 50
        );
        
        for (const post of relevantPosts) {
            const insights = this.extractMarketingInsights(post);
            const marketingUseCase = this.suggestMarketingUseCase(post);
            
            // Clean and format content
            const cleanContent = post.selftext
                .replace(/\\n+/g, ' ')
                .replace(/"/g, '""')
                .substring(0, 2000); // Limit to 2000 chars for CSV

            csvRows.push([
                `"${post.title.replace(/"/g, '""')}"`,
                post.subreddit,
                post.marketing_category,
                post.marketing_priority,
                post.relevance_score,
                post.score,
                post.num_comments,
                post.content_length,
                post.created_date,
                post.author,
                post.permalink,
                `"${cleanContent}"`,
                `"${insights.pain_points.slice(0, 3).join('; ').replace(/"/g, '""')}"`,
                `"${insights.success_metrics.slice(0, 3).join('; ').replace(/"/g, '""')}"`,
                `"${insights.tools_mentioned.join(', ')}"`,
                `"${insights.emotional_triggers.join(', ')}"`,
                `"${insights.quotes.slice(0, 2).join(' | ').replace(/"/g, '""')}"`,
                post.flair_text || '',
                `"${marketingUseCase.replace(/"/g, '""')}"`
            ]);
        }
        
        const csvContent = csvRows.map(row => row.join(',')).join('\\n');
        
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, csvContent);
        
        console.log(`Saved ${relevantPosts.length} detailed posts to ${filename}`);
        console.log(`File location: ${filePath}`);
        
        return filePath;
    }

    async saveTopPostsDetailed(filename = 'reddit-top-posts-full.csv', minScore = 15) {
        const topPosts = this.posts.filter(post => 
            post.relevance_score >= minScore && 
            post.is_self && 
            post.selftext.length > 100
        );

        const csvRows = [];
        
        csvRows.push([
            'Priority',
            'Title',
            'Subreddit',
            'Relevance Score',
            'Upvotes',
            'Comments',
            'Marketing Category',
            'Full Content',
            'URL',
            'Created Date',
            'Specific Marketing Applications'
        ]);

        for (const post of topPosts.slice(0, 50)) { // Top 50 posts
            const applications = this.generateSpecificMarketingApplications(post);
            
            csvRows.push([
                post.marketing_priority,
                `"${post.title.replace(/"/g, '""')}"`,
                post.subreddit,
                post.relevance_score,
                post.score,
                post.num_comments,
                post.marketing_category,
                `"${post.selftext.replace(/"/g, '""')}"`,
                post.permalink,
                post.created_date,
                `"${applications.replace(/"/g, '""')}"`
            ]);
        }

        const csvContent = csvRows.map(row => row.join(',')).join('\\n');
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, csvContent);
        
        console.log(`Saved ${topPosts.length} top posts with full content to ${filename}`);
        return filePath;
    }

    suggestMarketingUseCase(post) {
        const category = post.marketing_category;
        const score = post.relevance_score;
        
        if (score > 20) {
            return 'URGENT: Hero content, main pitch deck slide, primary value prop';
        } else if (score > 15) {
            return 'HIGH: Case studies, sales presentations, website headlines';
        } else if (score > 10) {
            return 'MEDIUM: Blog posts, email campaigns, social media content';
        } else if (score > 5) {
            return 'LOW: Market research, content inspiration, SEO content';
        } else {
            return 'ARCHIVE: Background intelligence, trend monitoring';
        }
    }

    async saveToCSV(filename = 'reddit-sales-insights.csv') {
        const csvRows = [];
        
        // Headers
        csvRows.push([
            'Title',
            'Subreddit', 
            'Marketing Category',
            'Marketing Priority',
            'Relevance Score',
            'Score (Upvotes)',
            'Comments',
            'Created Date',
            'Author',
            'URL',
            'Content Preview',
            'Flair',
            'Marketing Use Case'
        ]);
        
        // Filter for most relevant posts
        const relevantPosts = this.posts.filter(post => post.relevance_score > 3);
        
        for (const post of relevantPosts) {
            const contentPreview = post.selftext ? 
                post.selftext.substring(0, 200) + '...' : 
                'Link post';
            
            const marketingUseCase = this.suggestMarketingUseCase(post);
            
            csvRows.push([
                `"${post.title.replace(/"/g, '""')}"`,
                post.subreddit,
                post.marketing_category,
                post.marketing_priority,
                post.relevance_score,
                post.score,
                post.num_comments,
                post.created_date,
                post.author,
                post.permalink,
                `"${contentPreview.replace(/"/g, '""')}"`,
                post.flair_text || '',
                `"${marketingUseCase.replace(/"/g, '""')}"`
            ]);
        }
        
        const csvContent = csvRows.map(row => row.join(',')).join('\\n');
        
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, csvContent);
        
        console.log(`Saved ${relevantPosts.length} relevant posts to ${filename}`);
        console.log(`File location: ${filePath}`);
        
        return filePath;
    }

    generateSummaryReport() {
        const categories = {};
        const subredditStats = {};
        const priorityBreakdown = {};
        
        this.posts.forEach(post => {
            // Category stats
            if (!categories[post.marketing_category]) {
                categories[post.marketing_category] = 0;
            }
            categories[post.marketing_category]++;
            
            // Priority stats
            if (!priorityBreakdown[post.marketing_priority]) {
                priorityBreakdown[post.marketing_priority] = 0;
            }
            priorityBreakdown[post.marketing_priority]++;
            
            // Subreddit stats
            if (!subredditStats[post.subreddit]) {
                subredditStats[post.subreddit] = { count: 0, totalScore: 0, avgLength: 0 };
            }
            subredditStats[post.subreddit].count++;
            subredditStats[post.subreddit].totalScore += post.relevance_score;
            subredditStats[post.subreddit].avgLength += post.content_length;
        });
        
        // Calculate averages
        Object.keys(subredditStats).forEach(sub => {
            subredditStats[sub].avgLength = Math.round(subredditStats[sub].avgLength / subredditStats[sub].count);
        });
        
        console.log('\\n=== ENHANCED SUMMARY REPORT ===');
        console.log(`Total posts scraped: ${this.posts.length}`);
        console.log(`High-value posts (score > 15): ${this.posts.filter(p => p.relevance_score > 15).length}`);
        console.log(`Posts with substantial content (>200 chars): ${this.posts.filter(p => p.content_length > 200).length}`);
        
        console.log('\\nMarketing Priority Breakdown:');
        Object.entries(priorityBreakdown)
            .sort(([,a], [,b]) => b - a)
            .forEach(([priority, count]) => {
                console.log(`  ${priority}: ${count} posts`);
            });
        
        console.log('\\nTop Content-Rich Subreddits:');
        Object.entries(subredditStats)
            .sort(([,a], [,b]) => b.avgLength - a.avgLength)
            .slice(0, 8)
            .forEach(([subreddit, stats]) => {
                const avgScore = (stats.totalScore / stats.count).toFixed(1);
                console.log(`  r/${subreddit}: avg ${stats.avgLength} chars, relevance ${avgScore}`);
            });
        
        return {
            totalPosts: this.posts.length,
            categories,
            priorityBreakdown,
            subredditStats
        };
    }
}

module.exports = EnhancedRedditScraper;