# 🚀 Quick Start Guide

Get your Reddit Marketing Intelligence System running in 5 minutes!

## ⚡ Installation

```bash
# Clone the repository
git clone https://github.com/Tumphy/reddit-marketing-intelligence.git
cd reddit-marketing-intelligence

# Install dependencies
npm install

# Create directories
npm run setup
```

## 🎯 Run Your First Scrape

### Option 1: Production Mode (Recommended)
```bash
npm run production
```
**Expected:** 5-10 minute runtime, comprehensive 6-file output, enterprise reliability

### Option 2: Test First
```bash
npm run test-production
```
**Expected:** 30-second verification that everything works

### Option 3: Development Mode
```bash
npm run enhanced
```
**Expected:** 3-5 minute runtime, development output with detailed logging

## 📁 Find Your Results

After running, check these directories:
- `./data/csv/` - Marketing-ready CSV files
- `./data/json/` - Complete datasets and metrics
- `./logs/` - System logs and performance data

## 🎯 Key Output Files

| File | Purpose | Use For |
|------|---------|---------|
| `urgent-content-*.csv` | Score 20+ posts | Immediate pitch deck content |
| `high-value-*.csv` | Score 15+ posts | Strategic campaigns |
| `detailed-analysis-*.csv` | All relevant posts | Comprehensive analysis |
| `executive-summary-*.csv` | Top 50 overview | Management reports |

## 💡 Your First Marketing Win

1. **Open `urgent-content-*.csv`**
2. **Find highest relevance score posts**
3. **Extract pain points from "Full Content" column**
4. **Use for email subjects, pitch deck problems, hero content**

**Example:**
```
Pain Point Found: "I spend 3 hours daily on manual research"
→ Email Subject: "Stop wasting 3+ hours daily on prospect research"
→ Pitch Slide: "Sales reps waste 15+ hours weekly on manual research"
```

## 🔧 Configuration

Default settings work great! To customize:

1. **Edit `production-config.json`**
2. **Modify subreddits, keywords, quality thresholds**
3. **Run `npm run production` again**

## 🆘 Troubleshooting

**"Request failed" errors:** Increase `requestDelay` to 3000ms in config
**Low quality results:** Add industry-specific subreddits to config
**Large files:** Increase `minRelevanceScore` for more filtering

## 📋 Next Steps

1. **Import CSV to Google Sheets** for team collaboration
2. **Schedule weekly runs** for ongoing intelligence  
3. **Track performance improvements** in your marketing
4. **Share insights** with sales and marketing teams

**Ready to transform Reddit discussions into marketing gold!** 🎯

---

**Full documentation:** See [README.md](README.md) for complete features and usage.