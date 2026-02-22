# 💬 ChatApp React

A modern, real-time chat application built with **React**, **TypeScript**, and **Firebase**. Features a sleek UI with dark mode, emoji reactions, read receipts, and more.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20RTDB%20%7C%20Auth-orange?logo=firebase)
![Vite](https://img.shields.io/badge/Vite-7-purple?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-blue?logo=tailwindcss)

---

## ✨ Features

### 💬 Messaging
- **Real-time messaging** with Firestore snapshots
- **Emoji picker** with quick-access emojis
- **Message reactions** (👍 ❤️ 😂 😮 😢 🔥)
- **Reply to messages** with quoted preview
- **Forward messages** to other chats
- **Copy & delete** your own messages
- **Star important messages** with ⭐ indicator
- **Read receipts** — single tick (sent) / double blue tick (read)
- **Date separators** — Today, Yesterday, and date labels

### 👥 Chat Management
- **1:1 and group chats**
- **Search users** by name or email to start new chats
- **Delete entire chats** with confirmation
- **Message search** within conversations
- **Unread message badges**

### 🎨 UI & Experience
- **Dark mode** toggle with system persistence
- **Chat wallpaper** — subtle pattern background
- **Message entrance animations** — slide-in effect
- **Typing indicators** — real-time "user is typing..."
- **Online/offline presence** — green dot indicators
- **Last seen timestamps**
- **Mobile-responsive** — full-screen chat on mobile
- **Notification sound** — two-tone beep on new messages
- **Skeleton loading** states

### 🔒 Security
- **Chat lock (PIN)** — 4-digit PIN protection on app launch
- **Firebase Auth** — Google & email/password login
- **Firestore security rules** — participant-based access control
- **Admin panel** — ban users, manage chats

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Firestore, Realtime Database, and Authentication enabled

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/chatapp-react.git
cd chatapp-react

# Install dependencies
npm install

# Start development server
npm run dev
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Google + Email/Password)
3. Enable **Cloud Firestore** and **Realtime Database**
4. Update `src/firebase.ts` with your Firebase config
5. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 🏗️ Tech Stack

| Technology | Purpose |
|---|---|
| React 19 | UI Framework |
| TypeScript | Type Safety |
| Vite 7 | Build Tool |
| Tailwind CSS 4 | Styling |
| Firebase Auth | Authentication |
| Cloud Firestore | Message & Chat Storage |
| Realtime Database | Presence & Typing Indicators |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ChatWindow.tsx      # Main chat view with messages
│   ├── Sidebar.tsx          # Chat list, search, settings
│   ├── MessageBubble.tsx    # Individual message with reactions
│   ├── EmojiPicker.tsx      # Emoji selection grid
│   ├── LockScreen.tsx       # PIN lock screen
│   └── modals/
│       ├── NewChatModal.tsx  # Create new chat (user search)
│       ├── NewRoomModal.tsx  # Create group chat
│       └── ShareLinkModal.tsx
├── context/
│   ├── AuthContext.tsx       # Firebase Auth state
│   └── ChatContext.tsx       # Chats, users, presence
├── pages/
│   ├── LoginPage.tsx         # Auth page
│   └── Dashboard.tsx         # Main app layout
├── firebase.ts               # Firebase config
└── index.css                  # Global styles & animations
```

---

## 🌐 Deployment

### Firebase Hosting
```bash
npm run build
firebase init hosting  # Public dir: dist, SPA: Yes
firebase deploy --only hosting
```

### Vercel
Push to GitHub → Import on [vercel.com](https://vercel.com) → Auto-deploy

### Netlify
```bash
npm run build
# Drag & drop dist/ folder on netlify.com
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ by Likhith Kami**
