# Deploying Sakshi Bot to Vercel (via GitHub)

## Project Structure

```
Sakshi Bot/
├── src/                  # Frontend (React + Vite)
├── server/               # Backend (Express)
│   ├── server.js
│   ├── package.json
│   ├── vercel.json
│   └── .env              # Local environment variables (not pushed to GitHub)
├── .gitignore
└── package.json
```

---

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/sakshi-bot.git
git branch -M main
git push -u origin main
```

> ⚠️ **Note:** The `.env` file is in `.gitignore` and won't be pushed. You'll add these values in Vercel dashboard.

---

## Step 2: Deploy Backend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your `sakshi-bot` repo
4. **Configure:**
   - **Root Directory:** `server`
   - **Framework Preset:** Other
5. Click **Deploy**
6. **Copy the deployed URL** (e.g., `https://sakshi-bot-server.vercel.app`)

### Add Backend Environment Variables

Go to your **Backend Project** → **Settings** → **Environment Variables**

Add these:

| Name | Value |
|------|-------|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `API_KEY` | Your API key for the AI model |
| `MODEL` | AI model name (e.g., `gemini-3-flash-preview-cloud`) |
| `FRONTEND_URL` | (Add this after frontend deploys) |

Then click **Redeploy** to apply the changes.

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) again
2. Import the **same repo**
3. **Configure:**
   - **Root Directory:** Leave empty (or `/`)
   - **Framework Preset:** Vite
4. Click **Deploy**
5. Copy the frontend URL

### Add Frontend Environment Variable

Go to your **Frontend Project** → **Settings** → **Environment Variables**

Add:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://your-backend-url.vercel.app` (from Step 2) |

Then click **Redeploy**.

---

## Step 4: Update Backend CORS

After frontend deploys, go back to your **Backend Project** → **Settings** → **Environment Variables**

Add:

| Name | Value |
|------|-------|
| `FRONTEND_URL` | `https://your-frontend-url.vercel.app` |

Then **Redeploy** the backend.

---

## Environment Variables Summary

### Backend (`/server`)
| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `API_KEY` | API key for the AI model |
| `MODEL` | AI model name |
| `FRONTEND_URL` | Your deployed frontend URL (for CORS) |

### Frontend (`/`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Your deployed backend URL |

---

## MongoDB Atlas Setup

Make sure your MongoDB Atlas cluster allows connections from anywhere:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Select your cluster → **Network Access**
3. Click **Add IP Address**
4. Add `0.0.0.0/0` (allows all IPs)
5. Click **Confirm**

---

## Troubleshooting

### CORS Error
- Make sure `FRONTEND_URL` is set in backend environment variables
- Redeploy backend after adding the variable

### MongoDB Connection Error
- Check `MONGO_URI` is correct
- Whitelist `0.0.0.0/0` in MongoDB Atlas Network Access

### API Not Working
- Check Vercel logs: Go to project → **Deployments** → Click latest → **Functions** tab
- Verify all environment variables are set

### "No response" or API Error
- Check `API_KEY` and `MODEL` are set correctly
- Verify the API endpoint is working

---

## Quick Checklist

- [ ] Backend deployed to Vercel
- [ ] Backend environment variables set (MONGO_URI, API_KEY, MODEL)
- [ ] Frontend deployed to Vercel  
- [ ] Frontend environment variable set (VITE_API_URL)
- [ ] FRONTEND_URL added to backend
- [ ] MongoDB Atlas allows all IPs (0.0.0.0/0)
- [ ] Both projects redeployed after adding env vars

---

## Your Live URLs

- **Frontend:** `https://sakshi-bot.vercel.app`
- **Backend:** `https://sakshi-bot-server.vercel.app`

💕 **Done!** Your Sakshi Bot is now live!
