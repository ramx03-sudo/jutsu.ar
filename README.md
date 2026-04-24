# Jutsu AR – Hand Tracking Experience 🌀🤞

Welcome to **Jutsu AR**, an interactive Augmented Reality web application that brings your favorite anime powers to life! Using your webcam and MediaPipe hand tracking, you can perform hand signs to cast techniques from **Naruto** and **Jujutsu Kaisen**.

## ✨ Features

- **Real-Time Hand Tracking:** Powered by Google's MediaPipe for fast, highly accurate hand sign detection.
- **Naruto Mode:** 
  - Form the classic hand signs to charge up and unleash **Rasengan** or **Chidori**.
  - Dynamic visual particle effects and immersive audio.
- **Jujutsu Kaisen Mode:** 
  - Cross your fingers to trigger Gojo's **Reversal: Red**.
  - Clasp your hands together to unleash Sukuna's **Domain Expansion: Malevolent Shrine**.
  - Screen shake, dynamic lighting, and cinematic aura rendering.
- **Mobile Friendly:** Hosted via HTTPS for easy camera access on your mobile devices over the local network.

## 🚀 Getting Started

Follow these steps to run the AR experience locally on your machine.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ramx03-sudo/jutsu.ar.git
   cd jutsu.ar
   ```

2. **Install the dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   - **On your computer:** The terminal will display a `Local` URL (e.g., `https://localhost:5173/`). Click it to open it in your browser.
   - **On your phone/other devices:** Connect your phone to the same Wi-Fi network and open the `Network` URL provided in the terminal (e.g., `https://192.168.x.x:5173/`). 
   *(Note: You might see a "Connection is not private" warning because it uses local SSL for camera permissions. Click "Advanced" and "Proceed" to allow it).*

## 🎮 How to Play

1. When the website loads, choose your path: **Naruto** or **Jujutsu Kaisen**.
2. Allow camera permissions when prompted.
3. Stand a bit back so the camera can clearly see your hands.
4. Follow the on-screen hint instructions for hand gestures to trigger your powers!

## 🛠️ Built With
- **[React](https://react.dev/)** + **[Vite](https://vitejs.dev/)**
- **[MediaPipe Tasks Vision](https://developers.google.com/mediapipe)** (Hand Landmarker)
- HTML5 Canvas API for particle and aura rendering

---
*Created by [Ram Mamillapalli](https://github.com/ramx03-sudo)*
