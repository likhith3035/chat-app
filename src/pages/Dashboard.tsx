import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import LockScreen from '../components/LockScreen';
import { useAuth } from '../context/AuthContext';
import { db, CHATS_COL } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [activeChatId, setActiveChatId] = useState<string | null>(null);

    // Handle state.chatId (from InviteHandler) and ?join= (from group links)
    useEffect(() => {
        const handleJoin = async () => {
            // Check for direct chat ID from router state
            if (location.state?.chatId) {
                setActiveChatId(location.state.chatId);
                // Clear state so it doesn't re-trigger
                navigate(location.pathname, { replace: true, state: {} });
                return;
            }

            // Check for group chat ?join= query param
            const queryParams = new URLSearchParams(location.search);
            const joinId = queryParams.get('join');

            if (joinId && currentUser) {
                try {
                    const chatRef = doc(db, CHATS_COL, joinId);
                    const chatSnap = await getDoc(chatRef);

                    if (chatSnap.exists()) {
                        const chatData = chatSnap.data();

                        // If it's a public group, ensure the user is in participants
                        if (chatData.type === 'group' && chatData.public) {
                            if (!chatData.participants.includes(currentUser.uid)) {
                                await updateDoc(chatRef, {
                                    participants: arrayUnion(currentUser.uid)
                                });
                            }
                            setActiveChatId(joinId);
                        } else if (chatData.participants.includes(currentUser.uid)) {
                            // Already have access to this chat (either group or direct)
                            setActiveChatId(joinId);
                        } else {
                            alert("You don't have permission to join this chat.");
                        }
                    } else {
                        alert("Chat room not found.");
                    }
                } catch (error) {
                    console.error("Error joining chat:", error);
                } finally {
                    // Remove the query param from the URL
                    navigate(location.pathname, { replace: true, state: location.state });
                }
            }
        };

        handleJoin();
    }, [location.state?.chatId, location.search, location.pathname, currentUser, navigate]);

    // Check if PIN lock is enabled and session is locked
    const hasPinSet = !!localStorage.getItem('chatapp_lock_pin');
    const [isLocked, setIsLocked] = useState(hasPinSet);

    if (isLocked) {
        return <LockScreen onUnlock={() => setIsLocked(false)} />;
    }

    // True when a chat is active (for mobile full-screen behavior)
    const isRightPaneActive = !!activeChatId;

    const handleSelectChat = (id: string) => {
        setActiveChatId(id);
    };

    // Sidebar classes: on mobile, hidden when right pane is active. On md+, always visible.
    const sidebarClasses = isRightPaneActive
        ? "hidden md:flex flex-col md:w-1/3 md:max-w-[320px] lg:max-w-[380px] h-full bg-white/50 dark:bg-slate-900/50 text-gray-800 dark:text-slate-100 border-r border-gray-200/50 dark:border-white/5 flex-shrink-0"
        : "flex flex-col w-full md:w-1/3 md:max-w-[320px] lg:max-w-[380px] h-full bg-white/50 dark:bg-slate-900/50 text-gray-800 dark:text-slate-100 border-r border-gray-200/50 dark:border-white/5 flex-shrink-0";

    // Right pane classes: on mobile, hidden when no right pane is active. On md+, always visible.
    const rightPaneClasses = isRightPaneActive
        ? "flex flex-col w-full md:flex-grow h-full bg-white/60 dark:bg-slate-950/60"
        : "hidden md:flex flex-col md:flex-grow h-full bg-white/60 dark:bg-slate-950/60";

    return (
        <div className="w-full min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/30 overflow-hidden relative">
            {/* Ambient background glows for premium feel */}
            <div className="hidden md:block absolute top-[0%] left-[-5%] w-[40%] h-[40%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] pointer-events-none"></div>
            <div className="hidden md:block absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-[120px] pointer-events-none"></div>

            {/* Main App Container */}
            <div className="w-full h-[100dvh] md:w-[96vw] md:h-[94vh] lg:w-[90vw] lg:max-w-7xl md:rounded-[2rem] md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:md:shadow-[0_8px_30px_rgb(0,0,0,0.2)] md:border md:border-white/60 dark:md:border-white/10 flex overflow-hidden bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl transition-all duration-300">
                {/* Sidebar */}
                <div className={sidebarClasses}>
                    <Sidebar
                        activeChatId={activeChatId}
                        onSelectChat={handleSelectChat}
                    />
                </div>

                {/* Right Pane - Profile, Chat, or Welcome */}
                <div className={rightPaneClasses}>
                    {activeChatId ? (
                        <ChatWindow
                            chatId={activeChatId}
                            onBack={() => setActiveChatId(null)}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-grow text-gray-500 dark:text-slate-400 p-4 text-center animate-fade-in-up">
                            <div className="w-24 h-24 mb-6 rounded-full bg-blue-50 dark:bg-slate-800/50 flex items-center justify-center shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Welcome to L Chat</h3>
                            <p className="mt-3 text-slate-500 font-medium max-w-sm">Select a conversation from the sidebar or start a new seamless connection.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
