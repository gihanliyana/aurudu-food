# Pittsburgh Aurudu 2026 — Setup Guide

## What you need
- Node.js installed
- Firebase account (already done)
- GitHub account (free)
- Vercel account (free) — sign up at vercel.com with your GitHub

---

## Step 1 — Get your Firebase config keys

1. Go to https://console.firebase.google.com
2. Open your project → click the gear icon ⚙️ → **Project settings**
3. Scroll to **Your apps** → click **</>** (Web) if you haven't added a web app yet
4. Name it anything (e.g. "aurudu-app") → click **Register app**
5. Copy the `firebaseConfig` values — you'll need them in Step 3

---

## Step 2 — Set up Firestore database

1. In Firebase Console → left sidebar → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (allows open read/write for now)
4. Pick any region (us-east1 is fine for Pittsburgh) → **Done**

---

## Step 3 — Set up the project locally

```bash
# Navigate into the project folder
cd aurudu-app

# Install dependencies
npm install

# Create your .env file from the example
cp .env.example .env
```

Now open `.env` and fill in your Firebase values from Step 1:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc...
```

Test it locally:
```bash
npm run dev
# Opens at http://localhost:5173
```

---

## Step 4 — Push to GitHub

```bash
git init
git add .
git commit -m "Pittsburgh Aurudu sign-up app"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/aurudu-app.git
git push -u origin main
```

---

## Step 5 — Deploy to Vercel

1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo (`aurudu-app`)
3. Vercel auto-detects Vite — no changes needed
4. Before clicking Deploy, click **Environment Variables** and add all 6 values from your `.env` file:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Click **Deploy**

Vercel gives you a free URL like:
**https://aurudu-app.vercel.app**

Share that link on WhatsApp — everyone's sign-ups appear in real time!

---

## How real-time works

The app uses Firestore's `onSnapshot` listener. When anyone submits, edits,
or deletes a sign-up, every open browser tab updates automatically within
about 1 second — no refresh needed.
