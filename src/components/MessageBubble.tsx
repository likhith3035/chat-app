import { useState } from 'react';
import { db, CHATS_COL } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface SenderData {
    uid: string;
    name?: string;
    avatarUrl?: string;
}

interface Message {
    id: string;
    senderId: string;
    text?: string;
    imageUrl?: string;
    timestamp?: any;
    reactions?: Record<string, string[]>;
    replyTo?: {
        id: string;
        text: string;
        senderId: string;
        senderName: string;
    };
    readBy?: string[];
    starred?: boolean;
}

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    senderData?: SenderData;
    isGroup: boolean;
    chatId: string;
    currentUserId: string;
    onReply?: () => void;
    onForward?: () => void;
    participantCount?: number;
}

export default function MessageBubble({ message, isOwn, senderData, isGroup, chatId, currentUserId, onReply, onForward, participantCount = 2 }: MessageBubbleProps) {
    const [showReactions, setShowReactions] = useState(false);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    let timestamp = '';
    if (message.timestamp) {
        timestamp = new Date(message.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const senderName = (!isOwn && isGroup) ? (senderData?.name || 'Unknown User') : null;

    const handleReaction = async (emoji: string) => {
        try {
            const msgRef = doc(db, CHATS_COL, chatId, 'messages', message.id);
            const currentReactions = message.reactions || {};
            const usersForEmoji = currentReactions[emoji] || [];

            let updatedUsers: string[];
            if (usersForEmoji.includes(currentUserId)) {
                // Remove reaction
                updatedUsers = usersForEmoji.filter(uid => uid !== currentUserId);
            } else {
                // Add reaction
                updatedUsers = [...usersForEmoji, currentUserId];
            }

            const updatedReactions = { ...currentReactions };
            if (updatedUsers.length === 0) {
                delete updatedReactions[emoji];
            } else {
                updatedReactions[emoji] = updatedUsers;
            }

            await updateDoc(msgRef, { reactions: updatedReactions });
        } catch (err) {
            console.error('Error adding reaction:', err);
        }
        setShowReactions(false);
    };

    // Render existing reactions
    const reactions = message.reactions || {};
    const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);

    const handleCopy = () => {
        if (message.text) {
            navigator.clipboard.writeText(message.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
        setShowContextMenu(false);
    };

    const handleDelete = async () => {
        if (!isOwn) return;
        try {
            const msgRef = doc(db, CHATS_COL, chatId, 'messages', message.id);
            await deleteDoc(msgRef);
        } catch (err) {
            console.error('Error deleting message:', err);
        }
        setShowContextMenu(false);
    };

    const handleStar = async () => {
        try {
            const msgRef = doc(db, CHATS_COL, chatId, 'messages', message.id);
            await updateDoc(msgRef, { starred: !message.starred });
        } catch (err) {
            console.error('Error starring message:', err);
        }
        setShowContextMenu(false);
    };

    return (
        <div
            className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'} group`}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => { setShowReactions(false); setShowContextMenu(false); }}
        >
            <div className={`flex flex-col max-w-[70%] md:max-w-sm ${isOwn ? 'items-end' : 'items-start'}`}>

                {senderName && (
                    <p className="text-xs text-gray-500 ml-3 mb-1">{senderName}</p>
                )}

                <div className="relative">
                    <div className={`px-4 py-3 rounded-2xl ${isOwn ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'}`}>
                        {/* Reply quote */}
                        {message.replyTo && (
                            <div className={`mb-2 border-l-2 ${isOwn ? 'border-blue-300 bg-blue-700/50' : 'border-gray-400 bg-gray-300/50 dark:bg-gray-600/50'} rounded px-2 py-1`}>
                                <p className={`text-[10px] font-medium ${isOwn ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>{message.replyTo.senderName}</p>
                                <p className={`text-xs truncate ${isOwn ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'}`}>{message.replyTo.text}</p>
                            </div>
                        )}

                        {message.imageUrl ? (
                            <a href={message.imageUrl} target="_blank" rel="noreferrer">
                                <img src={message.imageUrl} alt="Chat attachment" className="rounded-lg max-h-48 object-cover mb-1" />
                            </a>
                        ) : (
                            <p className="text-sm break-words">{message.text}</p>
                        )}

                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                            {message.starred && (
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isOwn ? 'text-yellow-300' : 'text-yellow-500'}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            )}
                            <p className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                {timestamp}
                            </p>
                            {/* Read receipt ticks - only on own messages */}
                            {isOwn && (
                                <span className="inline-flex">
                                    {(message.readBy && message.readBy.length >= participantCount) ? (
                                        // Double blue tick - read by all
                                        <svg className="h-3.5 w-3.5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M1 13l5 5L17 7M7 13l5 5L23 7" />
                                        </svg>
                                    ) : (
                                        // Single grey tick - sent but not read
                                        <svg className="h-3.5 w-3.5 text-blue-200/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Reaction picker + context menu - appears on hover */}
                    {showReactions && (
                        <div
                            className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-10 flex bg-white dark:bg-gray-700 rounded-full shadow-lg border border-gray-100 dark:border-gray-600 px-1 py-1 z-10`}
                            style={{ animation: 'fadeIn 0.12s ease-out' }}
                        >
                            {QUICK_REACTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleReaction(emoji)}
                                    className="w-7 h-7 flex items-center justify-center text-base hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-transform hover:scale-125"
                                >
                                    {emoji}
                                </button>
                            ))}
                            {/* More actions button */}
                            <button
                                onClick={() => setShowContextMenu(!showContextMenu)}
                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Context menu dropdown */}
                    {showContextMenu && (
                        <div
                            className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-20 mt-[-0.5rem] bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-1 z-20 min-w-[120px]`}
                            style={{ animation: 'fadeIn 0.1s ease-out' }}
                        >
                            <button onClick={handleCopy} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                            {onReply && (
                                <button onClick={() => { onReply(); setShowContextMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    Reply
                                </button>
                            )}
                            <button onClick={handleStar} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={message.starred ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                {message.starred ? 'Unstar' : 'Star'}
                            </button>
                            {onForward && (
                                <button onClick={() => { onForward(); setShowContextMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    Forward
                                </button>
                            )}
                            {isOwn && (
                                <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Display existing reactions */}
                {reactionEntries.length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {reactionEntries.map(([emoji, users]) => (
                            <button
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${users.includes(currentUserId)
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <span>{emoji}</span>
                                <span className="font-medium">{users.length}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

