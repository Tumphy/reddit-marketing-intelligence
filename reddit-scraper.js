const https = require('https');
const fs = require('fs');
const path = require('path');

class RedditScraper {
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
            'smallbusiness', 'marketing', 'SaaS', 'B2B', 'salesforce',
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
                score += matches.length * 2; // Give higher weight to keyword matches
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
            
            await this.delay(1000); // Rate limiting
            
            const data = await this.makeRequest(url);
            const posts = data.data.children;
            
            console.log(`Found ${posts.length} posts in r/${subreddit}`);
            
            const processedPosts = posts.map(post => {
                const postData = {
                    subreddit: subreddit,
                    title: post.data.title,
                    selftext: post.data.selftext,
                    score: post.data.score,
                    num_comments: post.data.num_comments,
                    created_utc: post.data.created_utc,
                    created_date: new Date(post.data.created_utc * 1000).toISOString(),
                    author: post.data.author,
                    permalink: `https://www.reddit.com${post.data.permalink}`,
                    flair_text: post.data.link_flair_text,
                    url: post.data.url,
                    is_self: post.data.is_self,
                    upvote_ratio: post.data.upvote_ratio
                };
                
                postData.relevance_score = this.calculateRelevanceScore(postData);
                postData.marketing_category = this.categorizeForMarketing(postData);
                
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

    containsKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async scrapeAllSubreddits() {
        console.log('Starting Reddit scraping for GreendoorAI marketing insights...');
        
        for (const subreddit of this.subreddits) {
            try {
                const posts = await this.scrapeSubreddit(subreddit, 'hot', 50);
                this.posts.push(...posts);
                
                // Also scrape top posts from the week
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

    async saveToCSV(filename = 'reddit-sales-insights.csv') {
        const csvRows = [];
        
        // Headers
        csvRows.push([
            'Title',
            'Subreddit', 
            'Marketing Category',
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
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, csvContent);
        
        console.log(`Saved ${relevantPosts.length} relevant posts to ${filename}`);
        console.log(`File location: ${filePath}`);
        
        return filePath;
    }

    suggestMarketingUseCase(post) {
        const category = post.marketing_category;
        const score = post.relevance_score;
        
        if (score > 15) {
            return 'High-priority: Use in pitch decks, case studies, or hero content';
        } else if (score > 10) {
            return 'Medium-priority: Good for blog posts, social media, or email campaigns';
        } else if (score > 5) {
            return 'Low-priority: Use for market research or content inspiration';
        } else {
            return 'Reference only: Background market intelligence';
        }
    }

    generateSummaryReport() {
        const categories = {};
        const subredditStats = {};
        
        this.posts.forEach(post => {
            // Category stats
            if (!categories[post.marketing_category]) {
                categories[post.marketing_category] = 0;
            }
            categories[post.marketing_category]++;
            
            // Subreddit stats
            if (!subredditStats[post.subreddit]) {
                subredditStats[post.subreddit] = { count: 0, totalScore: 0 };
            }
            subredditStats[post.subreddit].count++;
            subredditStats[post.subreddit].totalScore += post.relevance_score;
        });
        
        console.log('\n=== SUMMARY REPORT ===');
        console.log(`Total posts scraped: ${this.posts.length}`);
        console.log(`Highly relevant posts (score > 10): ${this.posts.filter(p => p.relevance_score > 10).length}`);
        
        console.log('\nTop Marketing Categories:');
        Object.entries(categories)
            .sort(([,a], [,b]) => b - a)
            .forEach(([category, count]) => {
                console.log(`  ${category}: ${count} posts`);
            });
        
        console.log('\nSubreddit Performance:');
        Object.entries(subredditStats)
            .sort(([,a], [,b]) => b.totalScore - a.totalScore)
            .forEach(([subreddit, stats]) => {
                const avgScore = (stats.totalScore / stats.count).toFixed(1);
                console.log(`  r/${subreddit}: ${stats.count} posts, avg relevance: ${avgScore}`);
            });
        
        return {
            totalPosts: this.posts.length,
            categories,
            subredditStats
        };
    }
}

module.exports = RedditScraper;