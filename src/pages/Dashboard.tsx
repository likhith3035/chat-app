import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import LockScreen from '../components/LockScreen';

export default function Dashboard() {
    const [activeChatId, setActiveChatId] = useState<string | null>(null);

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
        ? "hidden md:flex flex-col md:w-1/3 md:max-w-[300px] h-full bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-100 border-r border-gray-200 dark:border-white/5 flex-shrink-0"
        : "flex flex-col w-full md:w-1/3 md:max-w-[300px] h-full bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-100 border-r border-gray-200 dark:border-white/5 flex-shrink-0";

    // Right pane classes: on mobile, hidden when no right pane is active. On md+, always visible.
    const rightPaneClasses = isRightPaneActive
        ? "flex flex-col w-full md:flex-grow h-full bg-white dark:bg-slate-950"
        : "hidden md:flex flex-col md:flex-grow h-full bg-white dark:bg-slate-950";

    return (
        <div className="w-full h-[100dvh] bg-white dark:bg-slate-950 flex overflow-hidden">
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
                    <div className="flex flex-col items-center justify-center flex-grow text-gray-500 dark:text-slate-400 text-lg p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 text-gray-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h3 className="text-2xl font-semibold text-gray-700 dark:text-slate-200">Welcome to L Chat!</h3>
                        <p className="mt-2 text-slate-500">Select a conversation or start a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
