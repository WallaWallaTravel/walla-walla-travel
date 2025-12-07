# 🚀 Quick Setup: Monitoring & Self-Improvement System

## ✅ What You're Getting

A **self-improving system** that continuously:
- Monitors system health 24/7
- Tracks and learns from errors
- Analyzes user behavior
- Generates optimization recommendations
- Detects anomalies and trends

---

## 📋 Prerequisites

- PostgreSQL database (already have it via Heroku)
- OpenAI API key (for AI insights)
- Deepgram API key (for voice features)

---

## 🔧 Setup (5 Minutes)

### **Step 1: Run Database Migrations**

```bash
cd /Users/temp/walla-walla-final

# Run the monitoring system setup
bash scripts/setup-monitoring.sh
```

**Or manually:**

```bash
export DATABASE_URL=$(heroku config:get DATABASE_URL -a walla-walla-travel)
psql "$DATABASE_URL" -f migrations/create-monitoring-system.sql
```

### **Step 2: Access the System Dashboard**

```bash
# Start dev server if not running
npm run dev

# Visit the dashboard
open http://localhost:3000/admin/system-dashboard
```

### **Step 3: Run Initial Health Check**

Click the **"Refresh Now"** button in the dashboard to run your first comprehensive health check.

---

## 📊 What's Available Now

### **Dashboards:**

1. **System Dashboard** - `/admin/system-dashboard`
   - Real-time health monitoring
   - Auto-refresh every 30 seconds
   - Status indicators for all components
   - Quick links to diagnostic tools

2. **AI Diagnostics** - `/test/ai-diagnostics`
   - Test visitor tracking
   - Test AI query endpoint
   - View full response details

3. **Simple AI Test** - `/test/ai-simple-test`
   - One-click AI query test
   - Shows response and cost
   - Browser console logging

### **API Endpoints:**

- `GET /api/system/health` - System health check
- `POST /api/ai/query` - AI Directory queries
- `POST /api/visitor/capture-email` - Email capture

---

## 🔍 Monitoring Features

### **Health Checks:**
✅ Database connectivity (< 100ms = healthy)  
✅ Database schema verification  
✅ OpenAI API validation  
✅ Deepgram API validation  
✅ Error rate monitoring (< 10 errors/5min = healthy)  
✅ API performance (< 500ms = healthy)

### **Error Tracking:**
✅ Comprehensive error logging  
✅ Stack trace capture  
✅ Request context (path, method, user)  
✅ Severity levels (warning, error, critical)  
✅ Resolution workflow  
✅ Pattern detection (repeating, spikes, new types)

### **Performance Metrics:**
✅ API response times  
✅ Database query performance  
✅ External API latency  
✅ Historical tracking

### **Smart Insights:**
✅ Anomaly detection  
✅ Trend analysis  
✅ Predictive alerts  
✅ Correlation detection

---

## 📈 Next: Self-Optimization (Coming Soon)

### **Phase 3 - Analytics Agent:**
- Learn from user behavior patterns
- Identify conversion opportunities
- Suggest UX improvements
- Generate A/B test ideas

### **Phase 4 - Auto-Optimization:**
- Automated recommendation engine
- ROI scoring for improvements
- Impact measurement
- Continuous learning loop

### **Phase 5 - Self-Healing:**
- Automatic error recovery
- Performance auto-tuning
- Predictive maintenance
- Intelligent scaling

---

## 🧪 Testing the System

### **Test 1: Health Check**

```bash
curl http://localhost:3000/api/system/health
```

**Expected:** JSON with `status: "healthy"` and all checks passing.

### **Test 2: AI Query**

Visit `/test/ai-simple-test` and click "Test AI Query".

**Expected:** AI responds with winery recommendations.

### **Test 3: Dashboard**

Visit `/admin/system-dashboard` and enable auto-refresh.

**Expected:** Live updating health status every 30 seconds.

---

## 🐛 Troubleshooting

### **Issue: Health checks failing**

**Solution:** 
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check API keys
echo $OPENAI_API_KEY
echo $DEEPGRAM_API_KEY
```

### **Issue: Missing tables error**

**Solution:**
```bash
# Re-run migrations
bash scripts/setup-ai-database.sh
bash scripts/setup-monitoring.sh  # (create this)
```

### **Issue: Dashboard not loading**

**Solution:**
```bash
# Check dev server is running
npm run dev

# Check for errors in terminal
# Visit /api/system/health directly to test API
```

---

## 📚 Documentation

- **Full Architecture:** `docs/SELF_IMPROVING_SYSTEM.md`
- **API Reference:** See docs above
- **Database Schema:** `migrations/create-monitoring-system.sql`

---

## ✨ Features at a Glance

| Feature | Status | Dashboard |
|---------|--------|-----------|
| Health Monitoring | ✅ Live | `/admin/system-dashboard` |
| Error Tracking | ✅ Live | Coming soon |
| Performance Metrics | ✅ Live | Coming soon |
| User Behavior Analysis | 🚧 Building | Coming soon |
| Optimization Recommendations | 🚧 Building | Coming soon |
| AI Insights | 🚧 Building | Coming soon |
| Auto-Healing | 📋 Planned | TBD |

---

## 🎯 Success Metrics

**You'll know it's working when:**
1. ✅ Dashboard shows all systems "healthy"
2. ✅ Auto-refresh updates every 30 seconds
3. ✅ AI queries return responses < 3 seconds
4. ✅ Error logs are being captured (if any errors occur)
5. ✅ Health check history is building up

---

## 🚀 Production Deployment

Before deploying to production:
1. ✅ Run all migrations on production database
2. ✅ Verify all environment variables set
3. ✅ Test health checks in production
4. ✅ Set up monitoring alerts (coming soon)
5. ✅ Schedule regular database backups

---

**Ready to build something amazing! 🎉**

For questions: Check `docs/SELF_IMPROVING_SYSTEM.md`

