import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { auth, rtdb, ADMIN_EMAILS } from '../firebase';
import { remove, ref } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

import NewChatModal from './modals/NewChatModal';
import NewRoomModal from './modals/NewRoomModal';
import ShareLinkModal from './modals/ShareLinkModal';
import InfoModal from './modals/InfoModal';

interface SidebarProps {
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
    onShowProfile: () => void;
}

export default function Sidebar({ activeChatId, onSelectChat, onShowProfile }: SidebarProps) {
    const { currentUser } = useAuth();
    const { conversations, users, onlineStatus } = useChat();
    const navigate = useNavigate();

    const [showOnlyOnline, setShowOnlyOnline] = useState(false);
    const [showHiddenChats, setShowHiddenChats] = useState(false);

    // Modals state
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);

    const handleLogout = () => {
        if (currentUser) {
            remove(ref(rtdb, `/status/${currentUser.uid}`));
        }
        auth.signOut();
    };

    const myUserData = currentUser ? users[currentUser.uid] : null;
    const isAdmin = currentUser ? ADMIN_EMAILS.includes(currentUser.email || '') : false;

    // Render a chat item
    const renderChatItem = (chat: any) => {
        // Hidden chats logic placeholder
        // For now skip hidden

        let chatName = 'Chat';
        let avatarUrl = 'https://ui-avatars.com/api/?name=Chat&background=random';
        let isOnline = false;

        if (chat.type === 'group') {
            chatName = chat.groupName || 'Group Chat';
            avatarUrl = chat.groupAvatar || avatarUrl;
            isOnline = chat.participants.some((uid: string) => uid !== currentUser?.uid && onlineStatus[uid]);
        } else {
            const partnerId = chat.participants.find((uid: string) => uid !== currentUser?.uid);
            const partnerData = partnerId ? users[partnerId] : null;
            if (partnerData) {
                chatName = partnerData.name || 'User';
                avatarUrl = partnerData.avatarUrl || `https://ui-avatars.com/api/?name=${chatName}&background=random`;
                isOnline = onlineStatus[partnerId] || false;
            }
        }

        if (showOnlyOnline && !isOnline) return null;

        let lastMessageText = chat.lastMessage || 'No messages yet';
        if (chat.lastMessageType === 'image') lastMessageText = 'Image';

        // Show unread badge if the last message was from someone else and this chat is not currently active
        const isUnread = chat.lastSenderId && chat.lastSenderId !== currentUser?.uid && activeChatId !== chat.id;

        return (
            <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`p-3 flex items-center hover:bg-gray-200 cursor-pointer border-b border-gray-200 transition-colors ${activeChatId === chat.id ? 'bg-gray-200' : ''}`}
            >
                <div className="relative flex-shrink-0">
                    <img src={avatarUrl} alt={chatName} className="h-12 w-12 rounded-full object-cover" />
                    {isOnline && (
                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                    )}
                </div>
                <div className="ml-4 flex-grow overflow-hidden">
                    <div className="flex items-center justify-between">
                        <p className={`text-base font-semibold text-gray-900 truncate ${isUnread ? 'font-bold' : ''}`}>{chatName}</p>
                        {isUnread && (
                            <span className="flex-shrink-0 ml-2 w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                        )}
                    </div>
                    <p className={`text-sm truncate ${isUnread ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>{lastMessageText}</p>
                </div>
            </div>
        );
    };

    const [darkMode, setDarkMode] = useState(() => {
        return document.documentElement.classList.contains('dark');
    });

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center cursor-pointer" onClick={onShowProfile}>
                    <img className="h-12 w-12 rounded-full object-cover" src={myUserData?.avatarUrl || 'https://ui-avatars.com/api/?name=Me&background=random'} alt="Me" />
                    <p className="ml-3 text-xl font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[120px]">{myUserData?.name || 'My Profile'}</p>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={toggleDarkMode} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100 transition-colors" title={darkMode ? 'Light Mode' : 'Dark Mode'}>
                        {darkMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                    </button>
                    {isAdmin && (
                        <button onClick={() => navigate('/admin')} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs py-1 px-3 rounded-md transition-colors duration-200">
                            Admin
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Chats<span className="text-sm text-gray-500 font-normal ml-2">({Object.values(onlineStatus).filter(v => v).length})</span></h2>
                    <div className="flex space-x-2">
                        <button onClick={() => setIsNewRoomOpen(true)} title="Create Public Room" className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button onClick={() => setIsNewChatOpen(true)} title="Start Private Chat" className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="mt-4 space-y-3">
                    <label className="flex items-center justify-between text-sm text-gray-600 cursor-pointer">
                        <span>Show only online</span>
                        <div className="relative">
                            <input type="checkbox" className="toggle-checkbox sr-only" checked={showOnlyOnline} onChange={(e) => setShowOnlyOnline(e.target.checked)} />
                            <div className={`border-2 border-transparent rounded-full w-11 h-6 transition-colors ${showOnlyOnline ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showOnlyOnline ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                    <label className="flex items-center justify-between text-sm text-gray-600 cursor-pointer">
                        <span>Show hidden chats</span>
                        <div className="relative">
                            <input type="checkbox" className="toggle-checkbox sr-only" checked={showHiddenChats} onChange={(e) => setShowHiddenChats(e.target.checked)} />
                            <div className={`border-2 border-transparent rounded-full w-11 h-6 transition-colors ${showHiddenChats ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showHiddenChats ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto w-full">
                {conversations.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 p-4 text-center text-sm">No conversations yet. Start a new chat!</p>
                ) : (
                    conversations.map(chat => renderChatItem(chat))
                )}
            </div>

            {/* Bottom bar - Email, Info, Logout */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                {/* User email */}
                <div className="px-3 pt-2 pb-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{currentUser?.email}</p>
                </div>
                <div className="px-3 pb-2 flex items-center gap-1">
                    <button onClick={() => setIsInfoOpen(true)} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm" title="Help & Info">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Info
                    </button>
                    <button
                        onClick={() => {
                            const hasPin = !!localStorage.getItem('chatapp_lock_pin');
                            if (hasPin) {
                                if (window.confirm('Remove chat lock PIN?')) {
                                    localStorage.removeItem('chatapp_lock_pin');
                                    alert('Chat lock removed.');
                                }
                            } else {
                                const pin = prompt('Set a 4-digit PIN for chat lock:');
                                if (pin && pin.length === 4 && /^\d{4}$/.test(pin)) {
                                    localStorage.setItem('chatapp_lock_pin', pin);
                                    alert('Chat lock enabled! PIN will be required on next visit.');
                                } else if (pin !== null) {
                                    alert('Please enter exactly 4 digits.');
                                }
                            }
                        }}
                        className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                        title={localStorage.getItem('chatapp_lock_pin') ? 'Remove Chat Lock' : 'Set Chat Lock'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            {localStorage.getItem('chatapp_lock_pin') ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            )}
                        </svg>
                        Lock
                    </button>
                    <div className="flex-grow"></div>
                    <button onClick={handleLogout} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            </div>

            {/* MODALS */}
            {isNewChatOpen && (
                <NewChatModal
                    onClose={() => setIsNewChatOpen(false)}
                    onChatCreated={(id) => { setIsNewChatOpen(false); onSelectChat(id); }}
                />
            )}

            {isNewRoomOpen && (
                <NewRoomModal
                    onClose={() => setIsNewRoomOpen(false)}
                    onRoomCreated={(link) => setShareLink(link)}
                />
            )}

            {shareLink && (
                <ShareLinkModal
                    link={shareLink}
                    onClose={() => setShareLink(null)}
                />
            )}

            {isInfoOpen && (
                <InfoModal onClose={() => setIsInfoOpen(false)} />
            )}
        </>
    );
}
