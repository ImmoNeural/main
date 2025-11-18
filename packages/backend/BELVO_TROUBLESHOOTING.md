# Belvo Troubleshooting Guide 🔍

## Current Issue: Authentication Failing

If you're seeing "Invalid Secret Keys" errors and mock banks instead of real Belvo banks, follow these steps:

## 1. Verify Render Environment Variables

Go to your Render dashboard → Settings → Environment Variables and verify **EXACTLY** these 4 variables:

### Required Variables:

```bash
OPEN_BANKING_PROVIDER=belvo
BELVO_SECRET_ID=d337660a-6fc2-471f-bdb9-04e4824604c7
BELVO_SECRET_PASSWORD=3lIh2yWx#EBSvE1Z79tSQQGCs-2VboJS581g*r_ZiguZDav5IRxoPB9KgPEytSIV
BELVO_BASE_URL=https://sandbox.belvo.com
```

### Common Mistakes:
- ❌ Extra spaces before or after values
- ❌ Missing `https://` in BELVO_BASE_URL
- ❌ Using `api.belvo.com` instead of `sandbox.belvo.com`
- ❌ Typo in variable names (e.g., `BELVO_SECRET_PASSWORD` not `BELVO_PASSWORD`)
- ❌ Accidentally added quotes around values (Render doesn't need quotes)

## 2. Check Render Deployment

After changing environment variables:
1. Render should automatically redeploy
2. Check the "Events" tab to see if deployment succeeded
3. Look for "Live" status with a green checkmark
4. If it says "Build failed" or "Deploy failed", check the logs

## 3. Check Backend Logs

With the new enhanced logging, you should see this when the backend starts:

```
==================================================
[Belvo] Service initialized - DETAILED DEBUG
==================================================
   OPEN_BANKING_PROVIDER: belvo
   Base URL: https://sandbox.belvo.com
   Base URL is sandbox?: true
   Secret ID (first 12 chars): d337660a-6fc...
   Secret ID length: 36
   Secret ID exists?: true
   Secret Password (first 8 chars): 3lIh2yWx...
   Secret Password length: 68
   Secret Password exists?: true
   Auth String length: 140
   Auth String (first 20 chars): ZDMzNzY2MGEtNmZjMi...
==================================================
```

### What to Check:
- ✅ `Base URL is sandbox?` should be **true**
- ✅ `Secret ID length` should be **36**
- ✅ `Secret Password length` should be **68**
- ✅ `Secret ID exists?` should be **true**
- ✅ `Secret Password exists?` should be **true**

If any of these are wrong, the environment variables are not set correctly in Render.

## 4. Test Credentials Directly

You can test your Belvo credentials using curl:

```bash
curl -X GET "https://sandbox.belvo.com/api/institutions/?country_code=BR&page_size=10" \
  -H "Content-Type: application/json" \
  -u "d337660a-6fc2-471f-bdb9-04e4824604c7:3lIh2yWx#EBSvE1Z79tSQQGCs-2VboJS581g*r_ZiguZDav5IRxoPB9KgPEytSIV"
```

### Expected Response:
- ✅ **200 OK** with JSON containing Brazilian banks
- ❌ **401 Unauthorized** = credentials are wrong
- ❌ **Connection error** = URL is wrong

## 5. Common Solutions

### Solution A: Redeploy Manually
If Render didn't auto-redeploy:
1. Go to Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete
4. Check logs again

### Solution B: Re-enter Credentials
Sometimes Render has issues with special characters:
1. Delete all 4 Belvo environment variables
2. Add them again one by one
3. Make sure NO extra spaces
4. Make sure NO quotes around values
5. Save and wait for redeploy

### Solution C: Check Belvo Dashboard
1. Go to https://dashboard.belvo.com/
2. Check if credentials are still valid
3. Verify you're using SANDBOX credentials (not production)
4. Check if there's any API usage limits

## 6. Expected Behavior

When working correctly:
1. Backend logs show: `[Belvo] Found X institutions` (where X > 0)
2. Frontend shows real Brazilian banks: Nubank, Inter, C6, etc.
3. No authentication errors in logs
4. No fallback to mock/static banks

## 7. Still Not Working?

If after all these steps it's still failing:
1. Copy the FULL backend logs (especially the detailed debug section)
2. Take a screenshot of your Render environment variables
3. Share both to get help debugging

## 8. Quick Checklist

- [ ] OPEN_BANKING_PROVIDER is set to `belvo`
- [ ] BELVO_BASE_URL is `https://sandbox.belvo.com` (with https://)
- [ ] BELVO_SECRET_ID is the full 36-character UUID
- [ ] BELVO_SECRET_PASSWORD is the full 68-character password
- [ ] Render has redeployed after variable changes
- [ ] Backend logs show "Base URL is sandbox?: true"
- [ ] No 401 errors in backend logs
