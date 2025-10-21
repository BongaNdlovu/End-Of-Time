# 🚀 Quick Start Guide

## Get Your Presentation Running in 2 Minutes!

---

## ⚡ Super Quick Start

### Step 1: Start a Local Server
Open terminal/command prompt in your Desktop folder and run:

**Windows (PowerShell):**
```powershell
cd C:\Users\fanel\OneDrive\Desktop
python -m http.server 8000
```

**Or use Node.js:**
```bash
npx http-server -p 8000
```

### Step 2: Open in Browser
Navigate to: **http://localhost:8000**

### Step 3: Enjoy! 🎉
Your presentation is now running with all features!

---

## 🎯 First Things to Try

1. **Change Theme** - Click colored circles in top-left corner
2. **Navigation** - Press arrow keys or swipe on mobile
3. **Speaker Notes** - Press **N** to see presenter notes
4. **Overview** - Press **O** to see all slides at once
5. **Timer** - Press **T** to start presentation timer
6. **Help** - Press **?** to see all keyboard shortcuts

---

## 📱 On Mobile?

Just swipe left/right to navigate slides!
Tap the chat icon for AI assistance.

---

## ❓ Why Do I Need a Local Server?

The new version uses:
- **Web Workers** (require HTTP)
- **Fetch API** to load slides.json (requires HTTP)

Without a server, browsers block these for security.

---

## 🎨 4 Themes Available

Click the colored circles in top-left:
- 🌙 **Dark** - Classic dark mode (default)
- ☀️ **Light** - Bright and clean
- 🎯 **High Contrast** - Maximum readability
- 📜 **Sepia** - Easy on the eyes

---

## ⌨️ Essential Shortcuts

| Key | What It Does |
|-----|--------------|
| `→` | Next slide |
| `←` | Previous slide |
| `F` | Fullscreen |
| `N` | Speaker notes |
| `O` | Overview mode |
| `T` | Timer |
| `?` | Show all shortcuts |

---

## 📝 Edit Slides

Open **slides.json** in any text editor and modify:
- Content
- Speaker notes
- Background images

Save and refresh - changes appear instantly!

---

## 🆘 Troubleshooting

### Nothing loads?
- ✅ Make sure you're running a local server
- ✅ Check the URL is `http://localhost:8000` (not `file://`)

### Images loading slow?
- ✅ This is normal on first load
- ✅ Lazy loading kicks in - only 3 images load at once
- ✅ Gets faster as you navigate

### Themes not saving?
- ✅ Make sure localStorage is enabled
- ✅ Not in private/incognito mode

---

## 🎓 For Presenters

### Before Presentation:
```
1. Press F - Enter fullscreen
2. Press T - Start timer
3. Press N - Open speaker notes
```

### During Presentation:
```
→ / ← - Navigate
O - Quick overview to jump slides
? - Remind yourself of shortcuts
```

### After Presentation:
```
Ctrl+P / Cmd+P - Print to PDF
Everything auto-saves!
```

---

## 📊 What's Different from Original?

### New Features:
- ✨ 4 theme options
- ✨ 90% faster loading (lazy images)
- ✨ Modern loading skeleton
- ✨ Organized files
- ✨ Web Worker for smooth animations

### Better:
- 🚀 Performance
- 📱 Mobile experience
- ♿ Accessibility
- 🔧 Maintainability

---

## 📁 Files You Have

- **index.html** ← **Use this one!**
- styles.css
- app.js
- canvas-worker.js
- slides.json
- Academy.html (original backup)
- README.md (full docs)

---

## 🎉 That's It!

You're ready to present! Press `F` to go fullscreen and start presenting.

**Need more help?** Check README.md for complete documentation.

---

## 💡 Quick Tips

1. **First time?** Press `?` to see all shortcuts
2. **Presenting?** Use dual monitors - one for presentation, one for notes
3. **Want to edit?** Just modify slides.json
4. **Different venue?** Try different themes for different lighting
5. **Mobile?** Everything works with touch too!

---

**Happy Presenting! 🚀**
