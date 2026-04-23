# 🎓 EduLearn - Distraction-Free Learning Platform

A free, student-focused video-sharing website designed for educational purposes with YouTube embedding, playlists, progress tracking, notes, gamification, and more.

## ✨ Features

- 📺 **YouTube Video Embedding** - Paste any YouTube link
- 🔍 **Smart Search** - Powered by Lunr.js
- 📋 **Playlist Management** - Create, share, and export playlists
- 📊 **Progress Tracking** - Auto-saves your watch progress
- 📝 **Timestamped Notes** - Take notes synced with video playback
- ⏲️ **Pomodoro Timer** - Built-in study timer
- 🏆 **Gamification** - Badges, streaks, and goals
- 🎯 **Focus Mode** - Distraction-free viewing
- 🌙 **Dark Mode** - Easy on the eyes
- ♿ **Accessibility** - High contrast, adjustable text size
- 📱 **Fully Responsive** - Works on all devices
- 💾 **Offline Support** - Export data as JSON

## 📁 Project Structure

```
edulearn/
├── index.html          # Homepage
├── video.html          # Video player page
├── playlist.html       # Playlists page
├── dashboard.html      # Analytics dashboard
├── css/
│   ├── styles.css      # Main styles
│   ├── themes.css      # Dark mode & themes
│   └── responsive.css  # Mobile responsiveness
├── js/
│   ├── storage.js      # Data management (LocalStorage)
│   ├── main.js         # Homepage logic
│   ├── search.js       # Lunr.js search engine
│   ├── video-player.js # Video playback logic
│   ├── notes.js        # Note-taking feature
│   ├── pomodoro.js     # Study timer
│   ├── playlist.js     # Playlist management
│   └── dashboard.js    # Dashboard & charts
└── data/
    └── videos.json     # Sample data (optional)
```

## 🚀 Quick Start

### Option 1: Run Locally (Easiest)

1. Download/clone all files into a folder
2. Open `index.html` in your browser
3. That's it! 🎉

### Option 2: Using VS Code Live Server

1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → "Open with Live Server"
3. Website opens at `http://localhost:5500`

### Option 3: Using Python

```bash
cd edulearn
python -m http.server 8000
```
Visit `http://localhost:8000`

### Option 4: Using Node.js

```bash
npx serve
```

## 🌐 Free Deployment Options

| Platform | Steps |
|----------|-------|
| **GitHub Pages** | Push to GitHub → Settings → Pages → Deploy |
| **Netlify** | Drag & drop folder at [netlify.com/drop](https://netlify.com/drop) |
| **Vercel** | Connect GitHub repo at [vercel.com](https://vercel.com) |
| **Cloudflare Pages** | Connect repo at [pages.cloudflare.com](https://pages.cloudflare.com) |

## 🎮 How to Use

### Adding Videos
1. Copy a YouTube URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
2. Paste it on the homepage's "Add Video" form
3. Add title, tags, and description
4. Click "Add Video"

### Creating Playlists
1. Go to **Playlists** page
2. Click **New** → Enter name & description
3. Add videos from the video page

### Taking Notes
1. Open any video
2. Type in the note box
3. Click "Save" - timestamp is automatic!
4. Click any timestamp to jump back

### Using Pomodoro
- Click the timer in the navbar (25:00)
- Work for 25 min → 5 min break cycle
- Browser notifications keep you on track

## 🔧 Customization

### Change Theme Colors
Edit `css/styles.css`:
```css
:root {
    --primary: #6366f1;    /* Main color */
    --secondary: #8b5cf6;  /* Accent color */
    --accent: #ec4899;     /* Highlight */
}
```

### Add More Badges
Edit `js/dashboard.js` → `badgeDefinitions` array

## 💾 Data Storage

All data is stored in **browser LocalStorage**:
- No server required
- No sign-up needed
- Data stays on your device
- Use "Export" to backup

⚠️ **Note**: Clearing browser data will delete your videos/notes. Export regularly!

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome 6
- **Charts**: Chart.js
- **Search**: Lunr.js
- **Fonts**: Inter + Poppins (Google Fonts)
- **Storage**: Browser LocalStorage

## 📜 Browser Support

✅ Chrome 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Edge 90+  

## 🤝 Contributing

Feel free to fork and enhance! Ideas:
- Add backend (Firebase/Supabase) for cloud sync
- Add user authentication
- Integrate more video sources (Vimeo, etc.)
- Add quiz/assessment features

## 📄 License

MIT License - Free for personal and educational use.

## 💡 Tips for Students

1. **Use Focus Mode** during tough topics
2. **Take timestamped notes** for quick review
3. **Set weekly goals** to stay accountable
4. **Share playlists** with study groups
5. **Maintain streaks** for consistent learning

---

**Happy Learning! 🎓✨**
