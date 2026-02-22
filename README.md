# 💬 L Chat: Modern Real-Time Messenger

A high-performance, real-time chat ecosystem built with **React 19**, **TypeScript**, and **Firebase**. Designed with a focus on visual excellence, security, and a seamless user experience.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Core-orange?logo=firebase)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)

---

## 🌟 Premium Features

### � Power Messaging
- **Real-Time Engine**: Instant message delivery powered by Firestore.
- **Rich Interactions**: Full emoji picker, localized reactions, and quoted replies.
- **Smart Inbox**: Message stars, forwarding, and search filters.
- **Presence Tracking**: Live online/offline status with "Last Seen" timestamps.

### 🎨 State-of-the-Art UI
- **Dynamic Design**: Smooth slide-in animations and global dark mode.
- **Polished UX**: Unread badges, typing indicators, and beautiful chat wallpapers.
- **Audio Feedback**: Subtle two-tone notification audio using Web Audio API.

### 🛡️ Enterprise Security
- **Access Control**: Biometric-style PIN lock on startup.
- **Identity**: Secure Google & Email authentication.
- **Protection**: Robust Firestore security rules and environment-based secret management.

---

## 🏗️ Technical Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Tailwind CSS 4, Lucide Icons |
| **State** | Context API (Auth & Chat Providers) |
| **Database** | Cloud Firestore (Persistent), RTDB (Presence/Typing) |
| **Storage** | Firebase Cloud Storage |
| **Runtime** | Node.js 18+ |

---

## 🚀 Quick Start

### Local Setup
1. **Clone & Install**:
   ```bash
   git clone https://github.com/likhith3035/chat-app.git
   npm install
   ```
2. **Environment**: Create a `.env` file with your Firebase credentials (see `src/firebase.ts` for mapping).
3. **Run**:
   ```bash
   npm run dev
   ```

### Deployment
The project is optimized for one-click deployment to **Vercel** or **Firebase Hosting**. Ensure all environment variables are mapped in your CI/CD dashboard.

---

## 📁 Project Overview
```
src/
├── components/   # Atomic & Layout components
├── context/      # Global state management
├── pages/        # Route-level views (Dashboard, Admin, Login)
├── firebase.ts   # Core service initialization
└── index.css     # Global design tokens & animations
```

---

**Crafted with excellence by Likhith Kami**
