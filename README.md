# EduLearn

EduLearn is a polished, student-focused video learning app.

It helps students:

- Save YouTube learning videos
- Track video progress
- Take timestamped notes
- Build playlists
- Use a Pomodoro focus timer
- View dashboard analytics
- Set learning goals
- Unlock study badges

The app works offline with `localStorage` by default. Supabase can be configured later for cloud authentication and sync.

---

## Project Structure

```text
edulearn/
├── index.html
├── video.html
├── playlist.html
├── dashboard.html
├── auth.html
├── package.json
├── css/
│   └── custom.css
├── js/
│   ├── config/
│   │   └── supabase.js
│   ├── modules/
│   │   ├── storage.js
│   │   ├── ui.js
│   │   ├── auth.js
│   │   ├── animations.js
│   │   └── user-menu.js
│   ├── components/
│   │   ├── note-editor.js
│   │   └── pomodoro.js
│   └── pages/
│       ├── home.js
│       ├── video.js
│       ├── playlist.js
│       └── dashboard.js
├── data/
│   └── videos.json
└── supabase/
    └── schema.sql
```
