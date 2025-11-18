# Pluggy Troubleshooting Guide 🔍

## Current Issue: Seeing Static/Mock Banks Instead of Real Pluggy Banks

If you're seeing generic banks (Santander, Itaú, Bradesco with emoji icons 🏦) instead of real Pluggy banks with logos, follow these steps:

## 1. Verify Render Environment Variables

Go to your Render dashboard → Settings → Environment Variables and verify **EXACTLY** these variables:

### Required Variables for Pluggy:

```bash
OPEN_BANKING_PROVIDER=pluggy
PLUGGY_CLIENT_ID=your_pluggy_client_id_here
PLUGGY_CLIENT_SECRET=your_pluggy_client_secret_here
```

### Where to Get Pluggy Credentials:

1. Go to: https://dashboard.pluggy.ai/
2. Sign up or log in
3. Create a new application
4. Copy your **Client ID** and **Client Secret**
5. Paste them in Render environment variables

### Common Mistakes:
- ❌ `OPEN_BANKING_PROVIDER` is still set to `belvo` or `mock`
- ❌ Missing `PLUGGY_CLIENT_ID` entirely
- ❌ Missing `PLUGGY_CLIENT_SECRET` entirely
- ❌ Extra spaces before or after values
- ❌ Accidentally added quotes around values (Render doesn't need quotes)
- ❌ Using old/expired credentials

## 2. Check Render Deployment

After changing environment variables:
1. Render should automatically redeploy
2. Check the "Events" tab to see if deployment succeeded
3. Look for "Live" status with a green checkmark
4. If it says "Build failed" or "Deploy failed", check the logs

## 3. Check Backend Logs

With the new enhanced logging, you should see this when the backend starts:

### ✅ GOOD LOGS (Pluggy configured correctly):

```
==================================================
[Pluggy] Service initialized - DETAILED DEBUG
==================================================
   OPEN_BANKING_PROVIDER: pluggy
   Base URL: https://api.pluggy.ai
   Client ID (first 12 chars): 7015037f-abc...
   Client ID length: 36
   Client ID exists? true
   Client Secret (first 8 chars): 4d3e2f1a...
   Client Secret length: 64
   Client Secret exists? true
==================================================

📋 [OpenBanking] getAvailableBanks START
   ✅ Provider has getConnectors (Pluggy detected)
   🔄 Calling provider.getConnectors...
[Pluggy] Fetching connectors for country: BR
[Pluggy] Authenticating with Client ID: 7015037f...
[Pluggy] ✅ Authentication successful!
[Pluggy] Found 150 connectors
   📊 Received 150 connectors from Pluggy API
   ✅ Returning 150 banks from Pluggy
```

### ❌ BAD LOGS (Pluggy NOT configured):

```
==================================================
[Pluggy] Service initialized - DETAILED DEBUG
==================================================
   OPEN_BANKING_PROVIDER: pluggy
   Base URL: https://api.pluggy.ai
   Client ID (first 12 chars): ...
   Client ID length: 0
   Client ID exists? false
   Client Secret (first 8 chars): ...
   Client Secret length: 0
   Client Secret exists? false
==================================================

❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌
❌ PLUGGY CREDENTIALS MISSING!
❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌

   PLUGGY_CLIENT_ID: MISSING ❌
   PLUGGY_CLIENT_SECRET: MISSING ❌

   Without these credentials, Pluggy will NOT work!
   The app will fall back to STATIC/MOCK banks.
```

## 4. What You Should See

### When Pluggy is Working Correctly:
- ✅ Backend logs show "Found 100+ connectors"
- ✅ Frontend shows 100+ Brazilian banks with **real logos/images**
- ✅ Banks include: Nubank, Inter, C6, PicPay, BTG Pactual, etc.
- ✅ Each bank has a colored logo (not just emoji)

### When Falling Back to Static List:
- ❌ Backend logs show "Falling back to static bank list"
- ❌ Frontend shows only 10 generic banks
- ❌ All banks have emoji icons (🏦 💜 🧡)
- ❌ Only: Santander, Itaú, Bradesco, Banco do Brasil, Caixa, Nubank, Inter, C6, PagBank, Original

## 5. Common Solutions

### Solution A: Add Missing Credentials
1. Go to Render → Environment Variables
2. Add `PLUGGY_CLIENT_ID` (if missing)
3. Add `PLUGGY_CLIENT_SECRET` (if missing)
4. Make sure `OPEN_BANKING_PROVIDER=pluggy`
5. Save and wait for redeploy

### Solution B: Redeploy Manually
If Render didn't auto-redeploy:
1. Go to Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete
4. Check logs again

### Solution C: Verify Credentials in Pluggy Dashboard
1. Go to https://dashboard.pluggy.ai/
2. Check if your credentials are still valid
3. Make sure the application is active
4. If needed, regenerate credentials

### Solution D: Test Credentials Manually
You can test your Pluggy credentials using curl:

```bash
curl -X POST "https://api.pluggy.ai/auth" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your_client_id_here",
    "clientSecret": "your_client_secret_here"
  }'
```

**Expected Response:**
```json
{
  "apiKey": "long_api_key_here..."
}
```

If you get an error, your credentials are invalid.

## 6. Mobile vs Desktop

**There should be NO difference** between mobile and desktop!

If you see different banks on mobile vs desktop:
- 🔄 **Clear browser cache** on mobile
- 🔄 **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
- 🔄 **Close and reopen** the browser app
- 🔄 **Check incognito/private mode** to rule out cache issues

## 7. Quick Checklist

- [ ] OPEN_BANKING_PROVIDER is set to `pluggy` (not belvo, not mock)
- [ ] PLUGGY_CLIENT_ID is set with your actual Client ID
- [ ] PLUGGY_CLIENT_SECRET is set with your actual Client Secret
- [ ] Render has redeployed after variable changes
- [ ] Backend logs show "Pluggy Service initialized"
- [ ] Backend logs show "Found X connectors" (where X > 50)
- [ ] Frontend shows 100+ banks with real logos
- [ ] No "❌ PLUGGY CREDENTIALS MISSING!" in logs
- [ ] No "Falling back to static bank list" in logs

## 8. Expected Bank Count

- **Static/Mock List**: ~10 banks (emoji icons)
- **Pluggy (Sandbox)**: ~150 banks (real logos)
- **Pluggy (Production)**: 150+ banks (real logos)

If you're seeing only 10 banks, **Pluggy is NOT working**.

## 9. Still Not Working?

If after all these steps it's still showing static banks:
1. Copy the FULL backend logs (especially the Pluggy section)
2. Take a screenshot of your Render environment variables (hide the secret values)
3. Check if you're using **Sandbox** or **Production** credentials
4. Share logs for debugging

---

**Pro Tip**: The easiest way to verify if Pluggy is working is to check the backend logs. If you see "Found 0 connectors" or "CREDENTIALS MISSING", Pluggy is NOT working and you'll see static banks.
