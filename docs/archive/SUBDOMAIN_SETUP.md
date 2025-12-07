# 🌐 Subdomain Setup Guide - Railway

This guide covers setting up subdomains for your Walla Walla Travel deployment on Railway.

---

## Subdomain Architecture

Your application uses subdomains for different portals:

- **`wallawalla.travel`** → Main customer-facing website
- **`staff.wallawalla.travel`** → Admin/Staff portal  
- **`driver.wallawalla.travel`** → Driver portal
- **`business.wallawalla.travel`** → Business partner portal

---

## Railway Setup

### Step 1: Deploy to Railway

```bash
railway up
```

### Step 2: Add Custom Domain

1. Go to your Railway project
2. Click **Settings** → **Domains**
3. Click **"Custom Domain"**
4. Enter: `wallawalla.travel`
5. Railway will provide DNS instructions

---

## DNS Configuration

### Option A: CNAME Records (Recommended)

Add these records to your DNS provider:

```
# Root domain
Type: CNAME
Name: @
Value: your-project.up.railway.app
TTL: Auto

# Staff subdomain
Type: CNAME
Name: staff
Value: your-project.up.railway.app
TTL: Auto

# Driver subdomain
Type: CNAME  
Name: driver
Value: your-project.up.railway.app
TTL: Auto

# Business subdomain
Type: CNAME
Name: business
Value: your-project.up.railway.app
TTL: Auto
```

### Option B: A Records (Alternative)

If your DNS provider doesn't support CNAME for root domain:

1. Get Railway's IP address from project settings
2. Create A records:

```
# Root domain
Type: A
Name: @
Value: [Railway IP Address]
TTL: Auto

# Subdomains (same as above for CNAME)
Type: A
Name: staff
Value: [Railway IP Address]
```

---

## Middleware Configuration

The middleware (`middleware.ts`) automatically handles subdomain routing:

```typescript
// Already configured in your codebase
export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  
  // Staff portal
  if (hostname.startsWith('staff.')) {
    return NextResponse.rewrite(new URL('/admin', req.url));
  }
  
  // Driver portal
  if (hostname.startsWith('driver.')) {
    return NextResponse.rewrite(new URL('/driver-portal', req.url));
  }
  
  // Business portal
  if (hostname.startsWith('business.')) {
    return NextResponse.rewrite(new URL('/contribute', req.url));
  }
  
  // Main site (no subdomain)
  return NextResponse.next();
}
```

**No changes needed** - this already works with Railway!

---

## Testing

### Local Development

To test subdomains locally, add to `/etc/hosts`:

```
127.0.0.1 localhost
127.0.0.1 staff.localhost
127.0.0.1 driver.localhost
127.0.0.1 business.localhost
```

Then access:
- http://localhost:3000 (main site)
- http://staff.localhost:3000 (staff portal)
- http://driver.localhost:3000 (driver portal)
- http://business.localhost:3000 (business portal)

### Production Testing

After DNS propagation (5-30 minutes):

```bash
# Test each subdomain
curl https://wallawalla.travel
curl https://staff.wallawalla.travel
curl https://driver.wallawalla.travel
curl https://business.wallawalla.travel
```

---

## SSL Certificates

✅ **Railway handles SSL automatically**

- Certificates are provisioned automatically
- Renewed automatically before expiration
- Works for root domain and all subdomains
- No configuration needed

---

## Troubleshooting

### DNS Not Resolving

```bash
# Check DNS propagation
dig wallawalla.travel
dig staff.wallawalla.travel

# Or use online tool
https://www.whatsmydns.net/#A/wallawalla.travel
```

**Fix:**
- Wait 5-30 minutes for DNS propagation
- Verify CNAME records are correct
- Check Railway domain settings

### Subdomain Shows Wrong Page

**Check:**
1. Middleware is properly configured
2. Railway domain is set up correctly
3. Clear browser cache (Ctrl+Shift+R)

### SSL Certificate Error

**Fix:**
- Wait a few minutes (Railway provisions certs automatically)
- Verify domain is properly configured in Railway
- Check that DNS is pointing to Railway

---

## Custom Domain Checklist

- [ ] Deploy to Railway
- [ ] Add custom domain in Railway dashboard
- [ ] Configure DNS records (CNAME or A)
- [ ] Wait for DNS propagation (5-30 min)
- [ ] Test root domain (wallawalla.travel)
- [ ] Test each subdomain (staff., driver., business.)
- [ ] Verify SSL works on all domains
- [ ] Update environment variables if needed
- [ ] Test complete user workflows on each subdomain

---

## Support

**Railway Support:**
- Documentation: https://docs.railway.app/deploy/deployments#custom-domains
- Discord: https://discord.gg/railway

**DNS Issues:**
- Contact your DNS provider (Cloudflare, Namecheap, etc.)
- Check their documentation for CNAME setup

---

**For complete deployment instructions, see [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md)**
