const fs = require('fs');
const path = require('path');

class InsightAnalyzer {
    constructor() {
        this.painPointPatterns = [
            /(?:spend|waste|takes?)\s+(\d+)\s+(?:hours?|minutes?)\s+(?:on|doing|per)/gi,
            /(?:frustrated|annoyed|hate|difficult|struggle)\s+(?:with|about|when)/gi,
            /(?:wish|need|want)\s+(?:to|a|an)\s+automate/gi,
            /(?:manual|repetitive|time consuming|tedious)/gi
        ];
        
        this.successPatterns = [
            /(?:saved|reduced|cut|eliminated)\s+(\d+(?:%|\s*percent|\s*hours?|\s*minutes?))/gi,
            /(?:increased|improved|boosted|grew)\s+(\d+(?:%|\s*percent|x|\s*times))/gi,
            /from\s+\d+\s+(?:hours?|minutes?)\s+to\s+\d+\s+(?:hours?|minutes?)/gi
        ];
        
        this.emotionalTriggers = [
            'frustrated', 'overwhelmed', 'exhausted', 'stressed', 'burned out',
            'excited', 'amazed', 'grateful', 'relieved', 'impressed',
            'disappointed', 'angry', 'confused', 'worried', 'concerned'
        ];
        
        this.competitorTools = [
            'salesforce', 'hubspot', 'pipedrive', 'outreach', 'salesloft',
            'apollo', 'zoominfo', 'linkedin sales navigator', 'gong', 'chorus'
        ];
    }

    async analyzeDataFiles() {
        console.log('📊 Advanced Reddit Marketing Intelligence Analysis');
        console.log('='.repeat(55));
        console.log('');
        
        try {
            // Find the most recent data files
            const dataFiles = this.findLatestDataFiles();
            
            if (!dataFiles.json) {
                console.log('⚠️  No JSON data files found.');
                console.log('Run the scraper first: npm run production');
                return;
            }
            
            const data = JSON.parse(fs.readFileSync(dataFiles.json, 'utf8'));
            const posts = data.posts || data;
            
            console.log(`📁 Analyzing ${posts.length} posts from: ${path.basename(dataFiles.json)}`);
            console.log('');
            
            // Perform comprehensive analysis
            const insights = this.extractComprehensiveInsights(posts);
            
            // Display analysis results
            this.displayInsightsSummary(insights);
            this.displayPainPointAnalysis(insights.painPoints);
            this.displaySuccessMetrics(insights.successMetrics);
            this.displayEmotionalAnalysis(insights.emotions);
            this.displayCompetitiveIntelligence(insights.competitors);
            this.displayMarketingOpportunities(insights.opportunities);
            this.displayActionableRecommendations(insights);
            
            // Save detailed analysis
            await this.saveInsightsReport(insights);
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Ensure you have run the scraper first');
            console.log('2. Check that data files exist in ./data/ directory');
            console.log('3. Verify JSON file format is valid');
        }
    }

    findLatestDataFiles() {
        const files = { json: null, csv: null };
        
        try {
            const dataDir = './data';
            if (!fs.existsSync(dataDir)) return files;
            
            // Find JSON files
            const jsonDir = path.join(dataDir, 'json');
            if (fs.existsSync(jsonDir)) {
                const jsonFiles = fs.readdirSync(jsonDir)
                    .filter(f => f.endsWith('.json') && f.includes('complete-dataset'))
                    .sort()
                    .reverse();
                
                if (jsonFiles.length > 0) {
                    files.json = path.join(jsonDir, jsonFiles[0]);
                }
            }
            
            // Find CSV files  
            const csvDir = path.join(dataDir, 'csv');
            if (fs.existsSync(csvDir)) {
                const csvFiles = fs.readdirSync(csvDir)
                    .filter(f => f.endsWith('.csv') && f.includes('detailed-analysis'))
                    .sort()
                    .reverse();
                
                if (csvFiles.length > 0) {
                    files.csv = path.join(csvDir, csvFiles[0]);
                }
            }
            
        } catch (error) {
            console.log('Warning: Error finding data files:', error.message);
        }
        
        return files;
    }

    extractComprehensiveInsights(posts) {
        const insights = {
            painPoints: [],
            successMetrics: [],
            emotions: {},
            competitors: {},
            opportunities: [],
            categories: {},
            timeMetrics: [],
            quotes: []
        };
        
        posts.forEach(post => {
            const content = (post.title + ' ' + (post.selftext || '')).toLowerCase();
            
            // Extract pain points
            this.painPointPatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        insights.painPoints.push({
                            text: match,
                            post: post.title,
                            subreddit: post.subreddit,
                            score: post.relevance_score || 0,
                            url: post.permalink
                        });
                    });
                }
            });
            
            // Extract success metrics
            this.successPatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        insights.successMetrics.push({
                            text: match,
                            post: post.title,
                            subreddit: post.subreddit,
                            score: post.relevance_score || 0,
                            url: post.permalink
                        });
                    });
                }
            });
            
            // Extract emotional triggers
            this.emotionalTriggers.forEach(emotion => {
                if (content.includes(emotion)) {
                    if (!insights.emotions[emotion]) {
                        insights.emotions[emotion] = [];
                    }
                    insights.emotions[emotion].push({
                        post: post.title,
                        subreddit: post.subreddit,
                        score: post.relevance_score || 0
                    });
                }
            });
            
            // Extract competitor mentions
            this.competitorTools.forEach(tool => {
                if (content.includes(tool)) {
                    if (!insights.competitors[tool]) {
                        insights.competitors[tool] = [];
                    }
                    insights.competitors[tool].push({
                        post: post.title,
                        subreddit: post.subreddit,
                        score: post.relevance_score || 0,
                        sentiment: this.analyzeSentiment(content, tool)
                    });
                }
            });
            
            // Category analysis
            const category = post.marketing_category || 'Unknown';
            if (!insights.categories[category]) {
                insights.categories[category] = { count: 0, totalScore: 0, avgScore: 0 };
            }
            insights.categories[category].count++;
            insights.categories[category].totalScore += (post.relevance_score || 0);
            
            // High-value opportunities
            if ((post.relevance_score || 0) >= 15) {
                insights.opportunities.push({
                    title: post.title,
                    category: post.marketing_category,
                    score: post.relevance_score,
                    subreddit: post.subreddit,
                    opportunity: this.identifyOpportunityType(post),
                    url: post.permalink
                });
            }
            
            // Extract quotable content
            if (post.selftext && post.selftext.length > 100) {
                const sentences = post.selftext.split(/[.!?]+/);
                sentences.forEach(sentence => {
                    if (sentence.length > 50 && sentence.length < 200) {
                        const quotability = this.assessQuotability(sentence);
                        if (quotability > 3) {
                            insights.quotes.push({
                                text: sentence.trim(),
                                quotability,
                                post: post.title,
                                category: post.marketing_category,
                                score: post.relevance_score
                            });
                        }
                    }
                });
            }
        });
        
        // Calculate category averages
        Object.keys(insights.categories).forEach(category => {
            const cat = insights.categories[category];
            cat.avgScore = (cat.totalScore / cat.count).toFixed(1);
        });
        
        // Sort and limit results
        insights.opportunities.sort((a, b) => b.score - a.score);
        insights.quotes.sort((a, b) => b.quotability - a.quotability);
        insights.quotes = insights.quotes.slice(0, 20); // Top 20 quotes
        
        return insights;
    }

    analyzeSentiment(content, tool) {
        const positive = ['love', 'great', 'amazing', 'excellent', 'fantastic', 'perfect', 'best'];
        const negative = ['hate', 'terrible', 'awful', 'worst', 'frustrated', 'annoyed', 'difficult'];
        
        const toolContext = content.substring(
            Math.max(0, content.indexOf(tool) - 100),
            content.indexOf(tool) + tool.length + 100
        );
        
        const positiveCount = positive.filter(word => toolContext.includes(word)).length;
        const negativeCount = negative.filter(word => toolContext.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    identifyOpportunityType(post) {
        const content = (post.title + ' ' + (post.selftext || '')).toLowerCase();
        
        if (content.includes('hours') && (content.includes('waste') || content.includes('spend'))) {
            return 'Time-saving value proposition';
        } else if (content.includes('automated') || content.includes('automation')) {
            return 'Automation case study';
        } else if (content.includes('frustrated') || content.includes('difficult')) {
            return 'Pain point validation';
        } else if ((post.relevance_score || 0) >= 20) {
            return 'Hero content opportunity';
        } else {
            return 'Strategic content asset';
        }
    }

    assessQuotability(sentence) {
        let score = 0;
        
        // Check for emotional language
        const emotions = ['frustrated', 'excited', 'amazed', 'overwhelmed', 'grateful'];
        emotions.forEach(emotion => {
            if (sentence.toLowerCase().includes(emotion)) score += 2;
        });
        
        // Check for metrics
        if (/\d+\s*(?:hours?|minutes?|%|percent)/.test(sentence)) score += 2;
        
        // Check for strong language
        const strongWords = ['never', 'always', 'completely', 'totally', 'absolutely'];
        strongWords.forEach(word => {
            if (sentence.toLowerCase().includes(word)) score += 1;
        });
        
        // Check for pain/solution language
        if (sentence.toLowerCase().includes('problem') || sentence.toLowerCase().includes('solution')) {
            score += 1;
        }
        
        return score;
    }

    displayInsightsSummary(insights) {
        console.log('📈 Executive Summary');
        console.log('-'.repeat(25));
        console.log(`🚨 Pain Points Identified: ${insights.painPoints.length}`);
        console.log(`🎆 Success Metrics Found: ${insights.successMetrics.length}`);
        console.log(`🎭 Emotional Triggers: ${Object.keys(insights.emotions).length}`);
        console.log(`🏁 Competitor Mentions: ${Object.keys(insights.competitors).length}`);
        console.log(`⭐ High-Value Opportunities: ${insights.opportunities.length}`);
        console.log(`💬 Quotable Content: ${insights.quotes.length}`);
        console.log('');
    }

    displayPainPointAnalysis(painPoints) {
        console.log('🚨 Top Pain Points Analysis');
        console.log('-'.repeat(30));
        
        const timeWasters = painPoints.filter(p => p.text.includes('hours') || p.text.includes('minutes'));
        
        console.log(`⏰ Time-related pain points: ${timeWasters.length}`);
        
        if (timeWasters.length > 0) {
            console.log('\nTop time-wasting activities:');
            timeWasters.slice(0, 5).forEach((pain, i) => {
                console.log(`${i + 1}. "${pain.text}" (Score: ${pain.score}, r/${pain.subreddit})`);
            });
        }
        
        console.log('');
    }

    displaySuccessMetrics(successMetrics) {
        console.log('🎆 Success Metrics & ROI Data');
        console.log('-'.repeat(35));
        
        if (successMetrics.length > 0) {
            console.log('Top quantified improvements:');
            successMetrics.slice(0, 5).forEach((metric, i) => {
                console.log(`${i + 1}. "${metric.text}" (Score: ${metric.score}, r/${metric.subreddit})`);
            });
        } else {
            console.log('No specific success metrics found. Look for qualitative improvements.');
        }
        
        console.log('');
    }

    displayEmotionalAnalysis(emotions) {
        console.log('🎭 Emotional Landscape Analysis');
        console.log('-'.repeat(35));
        
        const emotionCounts = Object.entries(emotions)
            .map(([emotion, posts]) => ({ emotion, count: posts.length }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
        
        emotionCounts.forEach(({ emotion, count }) => {
            console.log(`${emotion.padEnd(15)} | ${'█'.repeat(Math.min(count, 20))} ${count}`);
        });
        
        console.log('');
    }

    displayCompetitiveIntelligence(competitors) {
        console.log('🏁 Competitive Intelligence');
        console.log('-'.repeat(30));
        
        const compData = Object.entries(competitors)
            .map(([tool, mentions]) => ({
                tool,
                count: mentions.length,
                avgScore: (mentions.reduce((sum, m) => sum + m.score, 0) / mentions.length).toFixed(1),
                sentiment: this.calculateOverallSentiment(mentions)
            }))
            .sort((a, b) => b.count - a.count);
        
        if (compData.length > 0) {
            console.log('Tool mentions and sentiment:');
            compData.forEach(({ tool, count, avgScore, sentiment }) => {
                const sentimentIcon = sentiment === 'positive' ? '😊' : 
                                    sentiment === 'negative' ? '🙁' : '😐';
                console.log(`${sentimentIcon} ${tool.padEnd(20)} | ${count} mentions (avg score: ${avgScore})`);
            });
        } else {
            console.log('No competitor mentions found.');
        }
        
        console.log('');
    }

    calculateOverallSentiment(mentions) {
        const sentiments = mentions.map(m => m.sentiment);
        const positive = sentiments.filter(s => s === 'positive').length;
        const negative = sentiments.filter(s => s === 'negative').length;
        
        if (positive > negative) return 'positive';
        if (negative > positive) return 'negative';
        return 'neutral';
    }

    displayMarketingOpportunities(opportunities) {
        console.log('⭐ Top Marketing Opportunities');
        console.log('-'.repeat(35));
        
        if (opportunities.length > 0) {
            opportunities.slice(0, 8).forEach((opp, i) => {
                console.log(`${i + 1}. ${opp.opportunity} (Score: ${opp.score})`);
                console.log(`   "${opp.title.substring(0, 80)}..."`);
                console.log(`   Category: ${opp.category} | r/${opp.subreddit}`);
                console.log('');
            });
        } else {
            console.log('No high-value opportunities found. Lower relevance threshold.');
        }
    }

    displayActionableRecommendations(insights) {
        console.log('💡 Immediate Action Items');
        console.log('-'.repeat(30));
        
        console.log('1. 💪 URGENT: Extract top 3 pain points for email subjects');
        if (insights.painPoints.length > 0) {
            insights.painPoints.slice(0, 3).forEach((pain, i) => {
                console.log(`   ${i + 1}. Email subject: "Stop ${pain.text.replace(/.*\s+(\w+ing).*/, '$1')} forever"`);
            });
        }
        
        console.log('\n2. 📈 HIGH: Use success metrics for ROI claims');
        if (insights.successMetrics.length > 0) {
            console.log(`   Found ${insights.successMetrics.length} quantified improvements`);
            console.log('   Use in case studies and value propositions');
        }
        
        console.log('\n3. 🎭 MEDIUM: Incorporate emotional language');
        const topEmotions = Object.entries(insights.emotions)
            .sort(([,a], [,b]) => b.length - a.length)
            .slice(0, 3)
            .map(([emotion]) => emotion);
        console.log(`   Focus on: ${topEmotions.join(', ')}`);
        
        console.log('\n4. 💬 ONGOING: Use top quotes for authentic copy');
        if (insights.quotes.length > 0) {
            console.log('   Best quote for marketing:');
            console.log(`   "${insights.quotes[0].text.substring(0, 120)}..."`);
        }
        
        console.log('');
    }

    async saveInsightsReport(insights) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportPath = `./insights-report-${timestamp}.json`;
            
            const report = {
                generatedAt: new Date().toISOString(),
                summary: {
                    painPointsCount: insights.painPoints.length,
                    successMetricsCount: insights.successMetrics.length,
                    emotionalTriggersCount: Object.keys(insights.emotions).length,
                    competitorMentionsCount: Object.keys(insights.competitors).length,
                    opportunitiesCount: insights.opportunities.length,
                    quotesCount: insights.quotes.length
                },
                insights
            };
            
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`💾 Detailed insights saved to: ${reportPath}`);
            
        } catch (error) {
            console.log('Warning: Could not save insights report:', error.message);
        }
    }
}

async function runInsightAnalysis() {
    const analyzer = new InsightAnalyzer();
    await analyzer.analyzeDataFiles();
}

if (require.main === module) {
    runInsightAnalysis();
}

module.exports = InsightAnalyzer;