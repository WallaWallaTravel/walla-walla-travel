# Driver Onboarding - Credential Distribution Template

**⚠️ SECURITY NOTICE: Use secure channels to distribute credentials**

---

## 📱 SMS/Text Message Template

```
Hi [Driver Name]! Your Walla Walla Travel driver portal is ready.

Website: [YOUR-PRODUCTION-URL]
Email: [driver-email]
Password: travel2024

⚠️ CHANGE PASSWORD after first login!

Questions? Call [your phone]
```

---

## 💬 In-Person Handoff Script

**What to say:**
> "Here's your login information for the driver portal. I'm writing it down for you now:
>
> - Website: [production URL]
> - Your email: [their email]
> - Temporary password: travel2024
>
> **Please change this password as soon as you log in** for security. Do you have any questions about accessing the system?"

**What to demonstrate:**
1. How to navigate to the website
2. Where to enter email and password
3. How to change password after login
4. Basic navigation (clock in/out, inspections)

---

## 📧 Secure Email Template (For Website URL Only)

**Subject:** Walla Walla Travel Driver Portal - Getting Started

Hi [Driver Name],

Welcome to the Walla Walla Travel team! We've set up your driver portal account.

**Your portal website:** [YOUR-PRODUCTION-URL]
**Your login email:** [driver-email]

**⚠️ I will send your temporary password separately via text message** for security.

**What you can do in the portal:**
- ✅ Clock in and out for shifts
- ✅ Complete vehicle inspections (pre-trip and post-trip)
- ✅ View your schedule
- ✅ Access vehicle documents
- ✅ Track your hours

**First Login Steps:**
1. Go to the portal website
2. Enter your email and the temporary password (sent via text)
3. **Immediately change your password** to something secure
4. Explore the dashboard

**Need Help?**
- Technical issues: [support contact]
- Questions about the system: [your contact]

Welcome aboard!

Best regards,
[Your Name]
Walla Walla Travel

---

## 🔐 Password Manager Sharing (Recommended for Teams)

If using a password manager (1Password, LastPass, Bitwarden):

1. Create a shared vault named "Walla Walla Travel - Drivers"
2. Add each driver's credentials
3. Share only with that specific driver
4. Set expiration on temporary passwords
5. Track when they've changed it

---

## 📋 Distribution Checklist

For each driver:

- [ ] **Prepare credentials**
  - [ ] Verify email address is correct
  - [ ] Confirm they can receive text messages
  - [ ] Test that login works

- [ ] **Send website URL** (via email is OK)
- [ ] **Send temporary password** (via secure channel)
  - ✅ SMS/Text message
  - ✅ In-person handoff
  - ✅ Secure messaging app
  - ❌ Email (not recommended)
  - ❌ Written note (can be lost)

- [ ] **Follow up within 24 hours**
  - [ ] Confirm they received credentials
  - [ ] Verify they can log in
  - [ ] Check if they changed password
  - [ ] Answer any questions

- [ ] **Document completion**
  - [ ] Date credentials sent
  - [ ] Method used
  - [ ] Date of first login
  - [ ] Date password changed

---

## 🚨 Security Reminders for Drivers

**When distributing credentials, remind drivers:**

1. **Change Your Password Immediately**
   - Use a strong, unique password
   - Don't reuse passwords from other sites
   - Consider using a password manager

2. **Keep Credentials Secure**
   - Don't share your password with anyone
   - Don't write it down where others can see
   - Log out when using shared devices

3. **Be Aware of Phishing**
   - We will never ask for your password via email or text
   - Always verify the website URL before logging in
   - Report suspicious emails or messages

4. **If You Forget Your Password**
   - Contact [admin contact]
   - We will reset it securely
   - Never share your password to "verify" your account

---

## 📞 Support Contact Information

**For credential distribution questions:**
- Name: [Your Name]
- Phone: [Your Phone]
- Email: [Your Email]
- Available: [Your Hours]

**For technical issues:**
- Email: support@wallawallatravel.com
- Phone: [Support Phone]
- Hours: [Support Hours]

---

## 🎯 Quick Reference - Current Production Logins

| Driver | Email | Status | Notes |
|--------|-------|--------|-------|
| Eric Critchlow | evcritchlow@gmail.com | Active | Update email sent |
| Janine Bergevin | janinebergevin@hotmail.com | Active | Update email sent |
| Ryan Madsen | madsry@gmail.com | New | First-time setup |

**All passwords:** travel2024 (temporary)
**All require:** Immediate password change on first login

---

## 📝 Example First-Time Login Walkthrough

**For new drivers like Ryan:**

1. **Send Initial Contact:**
   ```
   Hi Ryan! Welcome to Walla Walla Travel. I'm setting up your driver portal account.

   You'll receive:
   1. Email with website link (now)
   2. Text with password (within 5 minutes)

   Watch for both messages!
   ```

2. **Send Website Email** (use template above)

3. **Send Password via Text:**
   ```
   Your temporary password: travel2024

   ⚠️ Change this after you log in!
   ```

4. **Follow Up Call (Optional):**
   - "Did you get both messages?"
   - "Were you able to log in successfully?"
   - "Do you need help changing your password?"

---

## ✅ Post-Distribution Verification

After sending credentials to all drivers:

```bash
# Check login activity (run in production database)
SELECT
  email,
  name,
  last_login,
  CASE
    WHEN last_login IS NULL THEN '❌ Never logged in'
    WHEN last_login > NOW() - INTERVAL '24 hours' THEN '✅ Recent login'
    ELSE '⚠️ No recent login'
  END as status
FROM users
WHERE role = 'driver'
ORDER BY last_login DESC NULLS LAST;
```

**Expected timeline:**
- Day 1: Send all credentials
- Day 2: Follow up with anyone who hasn't logged in
- Day 3: Verify all passwords have been changed
- Week 1: Check for any access issues

---

**Security is everyone's responsibility. Thanks for keeping our driver credentials secure!**

---

*Last Updated: 2025-10-16*
