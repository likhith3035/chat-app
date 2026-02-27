import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { auth, rtdb, db, CHATS_COL, ADMIN_EMAILS } from '../firebase';
import { remove, ref, onValue } from 'firebase/database';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

import NewChatModal from './modals/NewChatModal';
import NewRoomModal from './modals/NewRoomModal';
import ShareLinkModal from './modals/ShareLinkModal';
import InfoModal from './modals/InfoModal';
import ProfileModal from './modals/ProfileModal';
import StarredMessagesModal from './modals/StarredMessagesModal';

interface SidebarProps {
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
}

export default function Sidebar({ activeChatId, onSelectChat }: SidebarProps) {
    const { currentUser } = useAuth();
    const { conversations, users, onlineStatus } = useChat();
    const navigate = useNavigate();

    const [showOnlyOnline, setShowOnlyOnline] = useState(false);
    const [showHiddenChats, setShowHiddenChats] = useState(false);
    const [globalTyping, setGlobalTyping] = useState<Record<string, string[]>>({});
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        const typingRef = ref(rtdb, `/typing`);
        const unsub = onValue(typingRef, (snapshot) => {
            const data = snapshot.val() || {};
            const newGlobal: Record<string, string[]> = {};
            Object.keys(data).forEach(cId => {
                const chatTypers = data[cId];
                newGlobal[cId] = Object.keys(chatTypers).filter(uid => uid !== currentUser.uid && chatTypers[uid].isTyping);
            });
            setGlobalTyping(newGlobal);
        });
        return () => unsub();
    }, [currentUser]);

    // Modals state
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [isStarredOpen, setIsStarredOpen] = useState(false);

    const handleLogout = () => {
        if (currentUser) {
            remove(ref(rtdb, `/status/${currentUser.uid}`));
        }
        auth.signOut();
    };

    const myUserData = currentUser ? users[currentUser.uid] : null;
    const isAdmin = currentUser ? ADMIN_EMAILS.includes(currentUser.email || '') : false;

    // Context Menu State
    const [contextMenuChatId, setContextMenuChatId] = useState<string | null>(null);

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

        const partnerId = chat.type === 'direct' ? chat.participants.find((uid: string) => uid !== currentUser?.uid) : null;
        const customStatus = partnerId && users[partnerId]?.customStatus ? users[partnerId].customStatus : null;

        if (showOnlyOnline && !isOnline) return null;

        const isUnread = chat.lastSenderId && chat.lastSenderId !== currentUser?.uid && activeChatId !== chat.id;
        const chatTypers = globalTyping[chat.id] || [];
        const isSomeoneTyping = chatTypers.length > 0;

        const userNameStyle = isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-slate-200';
        const lastMsgStyle = isUnread ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400';

        let lastMessageDisplay;
        if (isSomeoneTyping) {
            if (chat.type === 'group' && chatTypers.length > 0) {
                if (chatTypers.length === 1) {
                    const typerData = users[chatTypers[0]];
                    const typerName = typerData?.name?.split(' ')[0] || 'Someone';
                    lastMessageDisplay = <span className="text-blue-500 font-medium italic animate-pulse">{typerName} is typing...</span>;
                } else {
                    lastMessageDisplay = <span className="text-blue-500 font-medium italic animate-pulse">{chatTypers.length} people typing...</span>;
                }
            } else {
                lastMessageDisplay = <span className="text-blue-500 font-medium italic animate-pulse">typing...</span>;
            }
        } else {
            let lastMessageText = chat.lastMessage || 'No messages yet';
            if (chat.lastMessageType === 'image') lastMessageText = 'Image';
            lastMessageDisplay = <span className={`truncate ${lastMsgStyle}`}>{lastMessageText}</span>;
        }

        const isContextMenuOpen = contextMenuChatId === chat.id;

        return (
            <div
                key={chat.id}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuChatId(isContextMenuOpen ? null : chat.id);
                }}
                className={`relative mx-3 my-1.5 rounded-2xl transition-all duration-200 select-none hover-lift ${activeChatId === chat.id ? 'bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-gray-100 dark:bg-slate-800 dark:border-slate-700/50' : 'hover:bg-white/60 dark:hover:bg-slate-800/40 border border-transparent'} ${isContextMenuOpen ? 'z-[100]' : 'z-10'}`}
                style={{ WebkitTouchCallout: 'none' }}
            >
                <div
                    onClick={() => {
                        if (isContextMenuOpen) {
                            setContextMenuChatId(null);
                        } else {
                            onSelectChat(chat.id);
                        }
                    }}
                    className="p-3.5 flex items-center cursor-pointer w-full h-full"
                >
                    <div className="relative flex-shrink-0">
                        <img src={avatarUrl} alt={chatName} className="h-14 w-14 rounded-full object-cover shadow-sm border border-gray-100 dark:border-slate-700" />
                        {isOnline && (
                            <span className="absolute bottom-0 right-0 block h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 shadow-sm"></span>
                        )}
                    </div>
                    <div className="ml-4 flex-grow overflow-hidden">
                        <p className={`text-base truncate flex items-center justify-between`}>
                            <span className={userNameStyle}>{chatName}</span>
                            {/* Pin icon placeholder */}
                            {currentUser && chat.pinnedBy?.includes(currentUser.uid) && <span className="text-xs">📌</span>}
                        </p>
                        {customStatus && (
                            <p className="text-[11px] text-blue-500/80 dark:text-blue-400/80 font-medium truncate mb-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80 mr-0.5 mt-[1px]"></span>
                                {customStatus}
                            </p>
                        )}
                        <p className="text-sm truncate mt-0.5 flex items-center gap-1 justify-between">
                            <span className="flex items-center gap-1 truncate flex-grow">
                                {lastMessageDisplay}
                            </span>
                            <span className="flex items-center gap-1 flex-shrink-0">
                                {currentUser && chat.mutedBy?.includes(currentUser.uid) && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                )}
                                {chat.lastUpdated && !isSomeoneTyping && (
                                    <span className="text-xs text-gray-400 dark:text-slate-500">
                                        · {new Date(chat.lastUpdated?.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </span>
                        </p>
                    </div>
                    {isUnread && (
                        <div className="flex-shrink-0 ml-3 flex flex-col items-center justify-center">
                            <span className="w-3 h-3 bg-blue-500 rounded-full mt-1"></span>
                        </div>
                    )}
                </div>

                {/* Context Menu Overlay */}
                {isContextMenuOpen && (
                    <div className="absolute right-4 top-10 w-48 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200/50 dark:border-white/10 overflow-hidden z-20 py-1">
                        <button
                            onClick={async () => {
                                setContextMenuChatId(null);
                                if (!currentUser) return;
                                try {
                                    const chatRef = doc(db, CHATS_COL, chat.id);
                                    if (chat.pinnedBy?.includes(currentUser.uid)) {
                                        await updateDoc(chatRef, { pinnedBy: arrayRemove(currentUser.uid) });
                                    } else {
                                        await updateDoc(chatRef, { pinnedBy: arrayUnion(currentUser.uid) });
                                    }
                                } catch (e) {
                                    console.error("Error pinning chat", e);
                                }
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                            <span>📌</span> {chat.pinnedBy?.includes(currentUser?.uid) ? 'Unpin Chat' : 'Pin Chat'}
                        </button>
                        <button
                            onClick={async () => {
                                setContextMenuChatId(null);
                                if (!currentUser) return;
                                try {
                                    const chatRef = doc(db, CHATS_COL, chat.id);
                                    if (chat.mutedBy?.includes(currentUser.uid)) {
                                        await updateDoc(chatRef, { mutedBy: arrayRemove(currentUser.uid) });
                                    } else {
                                        await updateDoc(chatRef, { mutedBy: arrayUnion(currentUser.uid) });
                                    }
                                } catch (e) {
                                    console.error("Error muting chat", e);
                                }
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                            <span>🔇</span> {chat.mutedBy?.includes(currentUser?.uid) ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                            onClick={async () => {
                                setContextMenuChatId(null);
                                if (!currentUser) return;
                                try {
                                    const chatRef = doc(db, CHATS_COL, chat.id);
                                    if (chat.archivedBy?.includes(currentUser.uid)) {
                                        await updateDoc(chatRef, { archivedBy: arrayRemove(currentUser.uid) });
                                    } else {
                                        await updateDoc(chatRef, { archivedBy: arrayUnion(currentUser.uid), pinnedBy: arrayRemove(currentUser.uid) });
                                    }
                                } catch (e) {
                                    console.error("Error archiving chat", e);
                                }
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                            <span>📦</span> {chat.archivedBy?.includes(currentUser?.uid) ? 'Unarchive' : 'Archive Chat'}
                        </button>
                        <div className="h-px bg-gray-200 dark:bg-white/10 my-1"></div>
                        <button
                            onClick={async () => {
                                setContextMenuChatId(null);
                                if (!currentUser) return;
                                if (window.confirm(`Are you sure you want to ${chat.type === 'group' ? 'leave' : 'delete'} this chat?`)) {
                                    try {
                                        const chatRef = doc(db, CHATS_COL, chat.id);
                                        await updateDoc(chatRef, {
                                            participants: arrayRemove(currentUser.uid),
                                            pinnedBy: arrayRemove(currentUser.uid),
                                            archivedBy: arrayRemove(currentUser.uid),
                                            mutedBy: arrayRemove(currentUser.uid)
                                        });
                                        if (activeChatId === chat.id) {
                                            onSelectChat(''); // clear active chat if it was deleted
                                        }
                                    } catch (e) {
                                        console.error("Error deleting chat", e);
                                    }
                                }
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors flex items-center gap-2 font-medium"
                        >
                            <span>🗑️</span> {chat.type === 'group' ? 'Leave Group' : 'Delete Chat'}
                        </button>
                    </div>
                )}

                {/* Invisible backdrop to close menu */}
                {isContextMenuOpen && (
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setContextMenuChatId(null)}
                    ></div>
                )}
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
        <div className="flex flex-col h-full bg-white/40 dark:bg-slate-900/40" onClick={() => { if (contextMenuChatId) setContextMenuChatId(null); }}>
            <div className="p-4 glass-header flex justify-between items-center flex-shrink-0 sticky top-0 z-20">
                <div className="flex flex-col cursor-pointer max-w-[200px]" onClick={() => setIsProfileModalOpen(true)}>
                    <div className="flex items-center space-x-2">
                        <img className="h-12 w-12 rounded-full object-cover shadow-sm flex-shrink-0" src={myUserData?.avatarUrl || 'https://ui-avatars.com/api/?name=Me&background=random'} alt="Me" />
                        <div className="flex flex-col overflow-hidden">
                            <p className="text-xl font-semibold text-gray-800 dark:text-slate-100 truncate hover:text-blue-500 transition-colors">{myUserData?.name || 'My Profile'}</p>
                            {myUserData?.customStatus ? (
                                <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{myUserData.customStatus}</p>
                            ) : (
                                <p className="text-xs text-blue-500 dark:text-blue-400 truncate mt-0.5 hover:underline">Set a status...</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-1 shrink-0 ml-2">
                    <button onClick={toggleDarkMode} className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-slate-200 transition-colors" title={darkMode ? 'Light Mode' : 'Dark Mode'}>
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

            <div className="px-5 py-6 flex-shrink-0 bg-transparent border-b border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent tracking-tight">Chats<span className="text-sm text-gray-400 dark:text-slate-500 font-medium ml-2">({Object.values(onlineStatus).filter(v => v).length})</span></h2>
                    <div className="flex space-x-2">
                        <button onClick={() => setIsStarredOpen(true)} title="Starred Messages" className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-white hover:shadow-sm dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-slate-200 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </button>
                        <button onClick={() => setIsNewRoomOpen(true)} title="Create Public Room" className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-white hover:shadow-sm dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-slate-200 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button onClick={() => setIsNewChatOpen(true)} title="Start Private Chat" className="p-2 rounded-full text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30 transition-all hover-lift">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="mt-4 space-y-3">
                    <label className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400 cursor-pointer">
                        <span>Show only online</span>
                        <div className="relative">
                            <input type="checkbox" className="toggle-checkbox sr-only" checked={showOnlyOnline} onChange={(e) => setShowOnlyOnline(e.target.checked)} />
                            <div className={`border-2 border-transparent rounded-full w-11 h-6 transition-colors ${showOnlyOnline ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-400 dark:bg-slate-700'}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showOnlyOnline ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                    <label className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400 cursor-pointer">
                        <span>Show hidden chats</span>
                        <div className="relative">
                            <input type="checkbox" className="toggle-checkbox sr-only" checked={showHiddenChats} onChange={(e) => setShowHiddenChats(e.target.checked)} />
                            <div className={`border-2 border-transparent rounded-full w-11 h-6 transition-colors ${showHiddenChats ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-400 dark:bg-slate-700'}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showHiddenChats ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                </div>
            </div >

            <div className="flex-grow overflow-y-auto w-full bg-transparent custom-scrollbar-light dark:custom-scrollbar-dark pb-2">
                {/* Active Now Tray */}
                {(() => {
                    const activeUsersIds = Object.keys(onlineStatus).filter(uid => onlineStatus[uid] && uid !== currentUser?.uid);
                    if (activeUsersIds.length === 0 && !showOnlyOnline) return null; // Don't show tray if no one is online

                    return (
                        <div className="pt-4 pb-2 px-2 overflow-x-auto flex space-x-4 no-scrollbar border-b border-gray-100 dark:border-white/5 mb-2">
                            {/* Current User (Note/Story placeholder) */}
                            <div className="flex flex-col items-center flex-shrink-0 w-16 cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
                                <div className="relative">
                                    <img src={myUserData?.avatarUrl || 'https://ui-avatars.com/api/?name=Me'} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-slate-700 p-0.5" alt="Me" />
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm">
                                        <div className="bg-gray-200 dark:bg-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-gray-500 dark:text-slate-300 font-bold text-xs">+</div>
                                    </div>
                                </div>
                                <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-2 truncate w-full text-center">Your Note</span>
                            </div>

                            {/* Active Users */}
                            {activeUsersIds.map(uid => {
                                const u = users[uid];
                                if (!u) return null;

                                // Find a chat containing this user to open it on click
                                const chatWithUser = conversations.find(c => c.type === 'direct' && c.participants.includes(uid));

                                return (
                                    <div
                                        key={uid}
                                        className="flex flex-col items-center flex-shrink-0 w-16 cursor-pointer"
                                        onClick={() => chatWithUser ? onSelectChat(chatWithUser.id) : setIsNewChatOpen(true)}
                                    >
                                        <div className="relative">
                                            <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}`} className="w-16 h-16 rounded-full object-cover border-2 border-green-500 p-0.5" alt={u.name} />
                                            <span className="absolute bottom-1 right-0 block h-4 w-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 z-10"></span>
                                        </div>
                                        <span className="text-[11px] font-medium text-gray-800 dark:text-slate-200 mt-1 truncate w-full text-center">{u.name?.split(' ')[0]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

                {/* Chat List */}
                <div className="mt-2">
                    {(() => {
                        if (conversations.length === 0) {
                            return <p className="text-gray-500 dark:text-slate-500 p-4 text-center text-sm">No conversations yet. Start a new chat!</p>;
                        }

                        const visibleChats = conversations.filter(c => {
                            const isArchived = currentUser && c.archivedBy?.includes(currentUser.uid);
                            // If showing hidden chats, don't filter them out.
                            if (!showHiddenChats && isArchived) return false;
                            return true;
                        });

                        if (visibleChats.length === 0) {
                            return <p className="text-gray-500 dark:text-slate-500 p-4 text-center text-sm">No visible chats.</p>;
                        }

                        const pinned = visibleChats.filter(c => currentUser && c.pinnedBy?.includes(currentUser.uid));
                        const unpinned = visibleChats.filter(c => !(currentUser && c.pinnedBy?.includes(currentUser.uid)));

                        return (
                            <>
                                {pinned.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-4 py-1 flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                                            <span>📌</span> Pinned
                                        </div>
                                        {pinned.map(chat => renderChatItem(chat))}
                                    </div>
                                )}
                                {unpinned.length > 0 && (
                                    <div>
                                        {pinned.length > 0 && (
                                            <div className="px-4 py-1 flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                                                <span>💬</span> Recent
                                            </div>
                                        )}
                                        {unpinned.map(chat => renderChatItem(chat))}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Bottom bar - Email, Info, Logout */}
            <div className="border-t border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900 flex-shrink-0">
                {/* User email */}
                <div className="px-3 pt-2 pb-1">
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{currentUser?.email}</p>
                </div>
                <div className="px-3 pb-2 flex items-center gap-1">
                    <button onClick={() => setIsInfoOpen(true)} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm" title="Help & Info">
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
                        className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm"
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
                    <button onClick={handleLogout} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            </div>

            {/* MODALS */}
            {
                isNewChatOpen && (
                    <NewChatModal
                        onClose={() => setIsNewChatOpen(false)}
                        onChatCreated={(id) => { setIsNewChatOpen(false); onSelectChat(id); }}
                    />
                )
            }

            {
                isNewRoomOpen && (
                    <NewRoomModal
                        onClose={() => setIsNewRoomOpen(false)}
                        onRoomCreated={(link) => setShareLink(link)}
                    />
                )
            }

            {
                shareLink && (
                    <ShareLinkModal
                        link={shareLink}
                        onClose={() => setShareLink(null)}
                    />
                )
            }

            {
                isInfoOpen && (
                    <InfoModal onClose={() => setIsInfoOpen(false)} />
                )
            }
            {
                isProfileModalOpen && (
                    <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
                )
            }
            {
                isStarredOpen && (
                    <StarredMessagesModal onClose={() => setIsStarredOpen(false)} />
                )
            }
        </div>
    );
}
