# 🎆 AI Fireworks - Interactive 3D Photo Gallery

A stunning 3D interactive experience featuring AI-powered hand gesture control, where memories transform from a sphere into an explosive fireworks display.

![Modern Purple Theme](https://img.shields.io/badge/Theme-Purple-8B5CF6)
![Three.js](https://img.shields.io/badge/Three.js-black?logo=three.js)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## ✨ Features

### 🎮 Hand Gesture Control
- **AI-Powered Recognition**: Uses MediaPipe for real-time hand tracking
- **Open Palm**: Trigger fireworks explosion
- **Closed Fist**: Form circle back together
- **Slide Left/Right**: Rotate the 3D view
- **Live Camera Feed**: See your hand tracking in the top-left corner with red skeleton

### 🎆 Fireworks Effects
- **Dynamic Explosion**: Photos and particles explode outward with physics
- **Gravity Simulation**: Particles fall naturally like real fireworks
- **Color Shifting**: Purple gradient effects during explosion
- **Smooth Transitions**: Seamless animations between states

### 📸 Photo Gallery
- **300 Polaroid-style Photos**: Arranged in a 3D sphere
- **Click to View**: Click any photo during fireworks to see it full-screen
- **Double-sided Display**: Photos visible from all angles

### 🎨 Modern Purple Theme
- Vibrant purple gradient (`#8B5CF6`, `#C084FC`, `#E9D5FF`)
- Deep space background with star field
- Glowing particles and lighting effects
- Blur and bloom post-processing

### 🎪 3D Elements
- **15K Particles**: Form the circular structure
- **200 Decorative Elements**: Boxes, spheres, and shapes
- **400 Fairy Lights**: Twinkling purple lights
- **Center Star**: Animated golden star in the middle

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Webcam for hand gesture control

### Installation

```bash
# Clone the repository
git clone https://github.com/JohnCarloGamayo/ai-fireworks.git

# Navigate to project directory
cd ai-fireworks

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
├── public/
│   └── photos/           # Your photo gallery (1.jpg - 30.jpg, top.jpg)
├── src/
│   ├── App.tsx           # Main application component
│   ├── App.css           # Styles
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🎯 How to Use

1. **Allow Camera Access**: Grant permission when prompted
2. **Wait for AI Ready**: Look for "AI READY: SHOW HAND" status
3. **Show Your Hand**: The AI will detect it and start tracking (red skeleton overlay)
4. **Control the Experience**:
   - **Open Palm** → Fireworks explosion
   - **Closed Fist** → Reform circle
   - **Slide Hand Left/Right** → Rotate view (2x faster rotation)
5. **Click Photos**: During fireworks, click any photo to view it full-screen

## 🎨 Customization

### Add Your Photos
Replace images in `/public/photos/`:
- `1.jpg` to `30.jpg` - Gallery photos
- `top.jpg` - Featured photo

Edit `TOTAL_NUMBERED_PHOTOS` in `App.tsx` if you have different number of photos:
```typescript
const TOTAL_NUMBERED_PHOTOS = 30; // Change this number
```

### Change Theme Colors
Edit `CONFIG.colors` in `App.tsx`:
```typescript
colors: {
  emerald: '#8B5CF6',  // Main purple
  gold: '#C084FC',     // Accent purple
  // ... more colors
}
```

### Adjust Particle Count
Modify `CONFIG.counts`:
```typescript
counts: {
  foliage: 15000,    // Main particles
  ornaments: 300,    // Photos
  elements: 200,     // Decorative shapes
  lights: 400        // Fairy lights
}
```

### Adjust Circle Size
Edit `CONFIG.circle`:
```typescript
circle: { 
  radius: 12,      // Circle radius
  thickness: 3     // Sphere thickness
}
```

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Three.js** - 3D graphics
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F
- **@react-three/postprocessing** - Visual effects
- **MediaPipe Tasks Vision** - Hand gesture recognition
- **Vite** - Build tool and dev server

## 🎬 Key Components

### Foliage
15,000 particles forming the sphere with custom fireworks explosion shader

### PhotoOrnaments
300 double-sided polaroid-style photos with click interactions and hover effects

### ChristmasElements
200 decorative 3D shapes (boxes, spheres, cylinders) in purple theme

### FairyLights
400 twinkling lights with pulsing animations

### GestureController
AI-powered hand tracking and gesture recognition with red skeleton visualization

## ⚡ Performance Tips

- Adjust particle counts for better performance on slower devices
- Reduce `foliage` count to 10000 if experiencing lag
- Disable bloom effects if needed: comment out `<Bloom />` in Experience
- Use `dpr={[1, 1.5]}` instead of `[1, 2]` in Canvas for lower resolution
- Close other tabs/applications for better performance

## 🐛 Troubleshooting

**Camera not working?**
- Check browser permissions (usually in address bar)
- Use HTTPS or localhost (MediaPipe requirement)
- Try a different browser (Chrome/Edge recommended)

**Slow performance?**
- Reduce particle counts in CONFIG
- Lower the `dpr` value in Canvas component
- Update graphics drivers
- Close resource-intensive applications

**Gestures not detected?**
- Ensure good lighting conditions
- Keep hand clearly in camera view
- Move hand slowly and deliberately
- Check camera feed in top-left corner

**Photos not loading?**
- Verify photos exist in `/public/photos/`
- Check file names match exactly (1.jpg, 2.jpg, etc.)
- Ensure `TOTAL_NUMBERED_PHOTOS` matches your photo count

## 📝 License

MIT License - feel free to use this project for your own photo galleries!

## 🙏 Acknowledgments

- Three.js and React Three Fiber community
- MediaPipe team for amazing hand tracking technology
- Inspiration from fireworks displays worldwide

## 👤 Author

**John Carlo Gamayo**
- GitHub: [@JohnCarloGamayo](https://github.com/JohnCarloGamayo)

---

⭐ Star this repo if you like it! 🎆

