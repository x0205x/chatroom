# Chatroom

A real-time chatroom that runs entirely on **GitHub Pages** — no server, no API keys.

Messages sync across browsers using [Gun.js](https://gun.eco/) peer relays. Pick a display name, join a room, and chat.

## Deploy to your GitHub

### 1. Create a new repository

On [github.com/new](https://github.com/new):

- **Repository name:** `chatroom` (or any name you like)
- **Visibility:** Public (required for free GitHub Pages)
- Do **not** add a README, .gitignore, or license — this folder already has everything

### 2. Push this folder

Open a terminal in this `chatroom` folder and run (replace `YOUR_USERNAME` with your GitHub username):

```bash
git init
git add .
git commit -m "Add real-time chatroom for GitHub Pages"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chatroom.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
3. The workflow in `.github/workflows/deploy.yml` runs automatically on push
4. After the first deploy finishes (~1 min), your site is live at:

   `https://YOUR_USERNAME.github.io/chatroom/`

   If you name the repo `YOUR_USERNAME.github.io` instead, the URL is just `https://YOUR_USERNAME.github.io/`

## Local preview

Serve the folder with any static server, for example:

```bash
npx serve .
```

Then open `http://localhost:3000` in two browser tabs to test messaging.

## How it works

- **Rooms** — Enter a room name on login, or share a link like `https://yoursite.github.io/chatroom/#gaming`
- **Real-time** — Gun.js syncs messages through public peer relays (no backend to maintain)
- **Presence** — Shows how many people are currently in the room
- **Persistence** — Messages are stored in the Gun network; they may eventually expire on free relays

## Customize

- Edit `css/style.css` for colors and layout
- Change default room in `js/app.js` (`sanitizeRoom` fallback)
- Add more Gun peers in `js/app.js` if relays are slow in your region
