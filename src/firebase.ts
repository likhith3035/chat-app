import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBhT_NN5BGOap2d2F9TiCbyjDlDcZ1xIfo",
    authDomain: "likhith-chat-application29.firebaseapp.com",
    projectId: "likhith-chat-application29",
    storageBucket: "likhith-chat-application29.firebasestorage.app",
    messagingSenderId: "423377327251",
    appId: "1:423377327251:web:d56ea2cfec508eab872966",
    measurementId: "G-YJ8FTZQEFF",
    databaseURL: "https://likhith-chat-application29-default-rtdb.asia-southeast1.firebasedatabase.app"
};

export const appId = 'likhith-chat-application29';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

// Shared Constants
export const USERS_COL = `/artifacts/${appId}/public/data/users`;
export const CHATS_COL = `/artifacts/${appId}/public/data/chats`;
export const APPEALS_COL = `/artifacts/${appId}/public/data/ban_appeals`;
export const ADMIN_EMAILS = ['kamilikhith@gmail.com', 'likhith@example.com', 'admin@gmail.com'];
