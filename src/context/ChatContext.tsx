import { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { db, rtdb, CHATS_COL, USERS_COL } from '../firebase';
import { useAuth } from './AuthContext';

interface UserData {
    uid: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    isBanned?: boolean;
    lastSeen?: any;
    customStatus?: string;
    chatWallpaper?: string;
}

interface ChatData {
    id: string;
    type: 'direct' | 'group';
    participants: string[];
    lastMessage?: string;
    lastMessageTime?: any;
    lastSenderId?: string;
    groupName?: string;
    groupAvatar?: string;
    theme?: string;
    nicknames?: Record<string, string>;
    pinnedBy?: string[];
    archivedBy?: string[];
    mutedBy?: string[];
}

interface ChatContextType {
    conversations: ChatData[];
    users: Record<string, UserData>;
    onlineStatus: Record<string, boolean>;
    typingStatus: Record<string, boolean>; // chatId -> typing (Currently unused in global context)
}

const ChatContext = createContext<ChatContextType>({
    conversations: [],
    users: {},
    onlineStatus: {},
    typingStatus: {},
});

export function useChat() {
    return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { currentUser } = useAuth();
    const [conversations, setConversations] = useState<ChatData[]>([]);
    const [users, setUsers] = useState<Record<string, UserData>>({});
    const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!currentUser) {
            setConversations([]);
            setOnlineStatus({});
            return;
        }

        // Set own presence as online
        const myStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
        const connectedRef = ref(rtdb, '.info/connected');
        const unsubConnected = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // When connected, set online
                set(myStatusRef, { state: 'online', lastChanged: rtdbTimestamp() });
                // When disconnected, set offline
                onDisconnect(myStatusRef).set({ state: 'offline', lastChanged: rtdbTimestamp() });
            }
        });

        // Listen to user's conversations
        const qChats = query(
            collection(db, CHATS_COL),
            where('participants', 'array-contains', currentUser.uid)
        );

        const unsubChats = onSnapshot(qChats, (snapshot) => {
            const chats: ChatData[] = [];
            snapshot.forEach(doc => {
                chats.push({ id: doc.id, ...doc.data() } as ChatData);
            });
            // Sort by lastMessageTime descending locally
            chats.sort((a, b) => {
                const timeA = a.lastMessageTime?.toMillis() || 0;
                const timeB = b.lastMessageTime?.toMillis() || 0;
                return timeB - timeA;
            });
            setConversations(chats);
        });

        // Listen to ALL users for name/avatar resolution
        const unsubUsers = onSnapshot(collection(db, USERS_COL), (snapshot) => {
            const usersMap: Record<string, UserData> = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                usersMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || data.displayName || '',
                    avatarUrl: data.avatarUrl || data.photoURL || '',
                    email: data.email || '',
                    lastSeen: data.lastSeen || null,
                    isBanned: data.isBanned || false,
                    customStatus: data.customStatus || ''
                } as UserData;
            });
            setUsers(usersMap);
        });

        // Listen to global online status
        const statusRef = ref(rtdb, '/status');
        const unsubStatus = onValue(statusRef, (snapshot) => {
            const data = snapshot.val() || {};
            const statusMap: Record<string, boolean> = {};
            Object.keys(data).forEach(uid => {
                statusMap[uid] = data[uid].state === 'online';
            });
            setOnlineStatus(statusMap);
        });

        return () => {
            unsubConnected();
            unsubChats();
            unsubUsers();
            unsubStatus();
        };
    }, [currentUser]);

    const value = {
        conversations,
        users,
        onlineStatus,
        typingStatus: {}, // Placeholder if components still depend on the type
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
}
