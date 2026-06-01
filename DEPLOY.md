# Deploy to GitHub Pages

## One-time setup (~5 minutes)

### 1. Create the GitHub repo
1. Go to github.com/aballal-1998 → click **+** → **New repository**
2. Name it: `sndk-budget`
3. Set to **Public**, skip README
4. Click **Create repository**

### 2. Push the files
Open PowerShell in the Budget_App folder and run:

```powershell
cd "C:\Users\abhij\OneDrive\Desktop\Sandisk Interview\Budget_App"
git init
git add .
git commit -m "Initial budget app"
git branch -M main
git remote add origin https://github.com/aballal-1998/sndk-budget.git
git push -u origin main
```

### 3. Enable GitHub Pages
1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `/ (root)` → **Save**
4. Wait ~60 seconds → your app is live at:
   **https://aballal-1998.github.io/sndk-budget/**

---

## Install on Samsung S20 FE

1. Open Chrome on your phone
2. Go to: **https://aballal-1998.github.io/sndk-budget/**
3. Tap the **⋮ menu** → **Add to Home screen**
4. Tap **Add** — done. Works offline from now on.

---

## Updating the app later

```powershell
cd "C:\Users\abhij\OneDrive\Desktop\Sandisk Interview\Budget_App"
git add .
git commit -m "Update"
git push
```
GitHub Pages redeploys automatically (~60 seconds).
