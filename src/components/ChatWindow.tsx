import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { db, rtdb, CHATS_COL } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, set, remove, onValue } from 'firebase/database';
import MessageBubble from './MessageBubble';
import EmojiPicker from './EmojiPicker';

interface ChatWindowProps {
    chatId: string;
    onBack: () => void;
}

export default function ChatWindow({ chatId, onBack }: ChatWindowProps) {
    const { currentUser } = useAuth();
    const { conversations, users, onlineStatus } = useChat();

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [forwardMsg, setForwardMsg] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevMsgCountRef = useRef(0);

    const markedAsReadRef = useRef<Set<string>>(new Set());

    // Notification sound on new incoming message
    useEffect(() => {
        if (loading || messages.length === 0) {
            prevMsgCountRef.current = messages.length;
            return;
        }
        if (messages.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderId !== currentUser?.uid) {
                // Play notification sound
                try {
                    const audioCtx = new AudioContext();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.frequency.value = 800;
                    osc.type = 'sine';
                    gain.gain.value = 0.1;
                    osc.start();
                    setTimeout(() => {
                        osc.frequency.value = 1000;
                        setTimeout(() => { osc.stop(); audioCtx.close(); }, 100);
                    }, 100);
                } catch (e) { /* audio not supported */ }
            }
        }
        prevMsgCountRef.current = messages.length;
    }, [messages.length, currentUser?.uid, loading]); // Added currentUser?.uid and loading to dependencies

    // Mark messages as read (with loop prevention)
    useEffect(() => {
        if (!currentUser || !chatId || messages.length === 0) return;
        const unreadMsgs = messages.filter(
            m => m.senderId !== currentUser.uid &&
                (!m.readBy || !m.readBy.includes(currentUser.uid)) &&
                !markedAsReadRef.current.has(m.id)
        );
        if (unreadMsgs.length === 0) return;

        unreadMsgs.forEach(async (msg) => {
            markedAsReadRef.current.add(msg.id);
            try {
                const msgRef = doc(db, CHATS_COL, chatId, 'messages', msg.id);
                const currentReadBy = msg.readBy || [];
                await setDoc(msgRef, { readBy: [...currentReadBy, currentUser.uid] }, { merge: true });
            } catch (err) {
                // Silent fail for read receipts
            }
        });
    }, [messages, currentUser, chatId]);

    // Typing indicator - broadcast
    const broadcastTyping = (isTyping: boolean) => {
        if (!currentUser || !chatId) return;
        const typRef = ref(rtdb, `/typing/${chatId}/${currentUser.uid}`);
        if (isTyping) {
            set(typRef, { isTyping: true });
        } else {
            remove(typRef);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
        broadcastTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
    };

    // Clean up typing on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            broadcastTyping(false);
        };
    }, [chatId]);

    // Find current chat data
    const chatData = conversations.find(c => c.id === chatId);

    useEffect(() => {
        if (!currentUser || !chatId) return;

        setLoading(true);
        const messagesColRef = collection(db, CHATS_COL, chatId, 'messages');
        const q = query(messagesColRef, orderBy("timestamp", "asc"), limit(50));

        const unsub = onSnapshot(q, (snapshot) => {
            const msgs: any[] = [];
            snapshot.forEach(doc => {
                msgs.push({ id: doc.id, ...doc.data() });
            });
            setMessages(msgs);
            setLoading(false);

            // Auto-scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        return () => unsub();
    }, [chatId, currentUser]);

    let chatName = 'Chat';
    let avatarUrl = 'https://ui-avatars.com/api/?name=Chat&background=random';

    if (chatData) {
        if (chatData.type === 'group') {
            chatName = chatData.groupName || 'Group Chat';
            avatarUrl = chatData.groupAvatar || avatarUrl;
        } else {
            const partnerId = chatData.participants.find((uid: string) => uid !== currentUser?.uid);
            const partnerData = partnerId ? users[partnerId] : null;
            if (partnerData) {
                chatName = partnerData.name || 'User';
                avatarUrl = partnerData.avatarUrl || `https://ui-avatars.com/api/?name=${chatName}&background=random`;
            }
        }
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !currentUser || !chatId) return;

        const text = inputText;
        setInputText('');

        try {
            const chatDocRef = doc(db, CHATS_COL, chatId);
            const messagesColRef = collection(chatDocRef, 'messages');

            const msgData: any = {
                senderId: currentUser.uid,
                text: text,
                timestamp: serverTimestamp(),
                readBy: [currentUser.uid],
            };

            // Include reply data if replying
            if (replyTo) {
                msgData.replyTo = {
                    id: replyTo.id,
                    text: replyTo.text?.substring(0, 100) || '',
                    senderId: replyTo.senderId,
                    senderName: users[replyTo.senderId]?.name || 'User',
                };
                setReplyTo(null);
            }

            await addDoc(messagesColRef, msgData);

            await setDoc(chatDocRef, {
                lastMessage: text,
                lastMessageType: 'text',
                lastUpdated: serverTimestamp(),
            }, { merge: true });

            // Stop typing indicator
            broadcastTyping(false);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    // Typing indicator rendering

    const [typers, setTypers] = useState<string[]>([]);
    useEffect(() => {
        if (!chatId || !currentUser) return;
        const typingRef = ref(rtdb, `/typing/${chatId}`);
        const unsub = onValue(typingRef, (snapshot) => {
            const data = snapshot.val() || {};
            const activeTypers = Object.keys(data).filter(uid => uid !== currentUser.uid && data[uid].isTyping);
            setTypers(activeTypers);
        });
        return () => unsub();
    }, [chatId, currentUser]);

    let typingIndicatorText = '';
    if (typers.length === 1) {
        const typerName = users[typers[0]]?.name || 'Someone';
        typingIndicatorText = `${typerName} is typing...`;
    } else if (typers.length > 1) {
        typingIndicatorText = 'Several people are typing...';
    }

    return (
        <>
            <div className="flex-grow flex flex-col h-full bg-white">
                <div className="p-4 border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm flex items-center flex-shrink-0">
                    <button onClick={onBack} title="Close Chat" className="p-1 rounded-full text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <img className="h-10 w-10 rounded-full object-cover" src={avatarUrl} alt="Avatar" />
                    <div className="ml-3 flex-grow">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{chatName}</h3>
                        {chatData?.type !== 'group' && (() => {
                            const partnerId = chatData?.participants?.find((uid: string) => uid !== currentUser?.uid);
                            if (!partnerId) return null;
                            const isOnline = onlineStatus[partnerId];
                            const partnerData = users[partnerId];
                            const lastSeen = partnerData?.lastSeen;
                            if (isOnline) return <p className="text-xs text-green-500">Online</p>;
                            if (lastSeen) {
                                const lastSeenDate = lastSeen.seconds ? new Date(lastSeen.seconds * 1000) : new Date(lastSeen);
                                const now = new Date();
                                const diffMs = now.getTime() - lastSeenDate.getTime();
                                const diffMin = Math.floor(diffMs / 60000);
                                const diffHr = Math.floor(diffMin / 60);
                                let text = '';
                                if (diffMin < 1) text = 'Last seen just now';
                                else if (diffMin < 60) text = `Last seen ${diffMin}m ago`;
                                else if (diffHr < 24) text = `Last seen ${diffHr}h ago`;
                                else text = `Last seen ${lastSeenDate.toLocaleDateString()}`;
                                return <p className="text-xs text-gray-400">{text}</p>;
                            }
                            return null;
                        })()}
                    </div>
                    <button
                        onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }}
                        title="Search Messages"
                        className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={async () => {
                            if (!window.confirm('Delete this entire chat? This cannot be undone.')) return;
                            try {
                                // Delete all messages in the chat
                                const msgsRef = collection(db, CHATS_COL, chatId, 'messages');
                                const msgsSnap = await getDocs(msgsRef);
                                const deletePromises = msgsSnap.docs.map(d => deleteDoc(d.ref));
                                await Promise.all(deletePromises);
                                // Delete the chat document
                                await deleteDoc(doc(db, CHATS_COL, chatId));
                                onBack();
                            } catch (err) {
                                console.error('Error deleting chat:', err);
                                alert('Could not delete chat. You may not have permission.');
                            }
                        }}
                        title="Delete Chat"
                        className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                {/* Search Bar */}
                {showSearch && (
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search messages..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                            autoFocus
                        />
                        {searchQuery && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())).length} results found
                            </p>
                        )}
                    </div>
                )}

                <div className="flex-grow p-4 overflow-y-auto flex flex-col h-full chat-wallpaper">
                    {loading ? (
                        <div className="flex flex-col space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} animate-pulse`}>
                                    <div className={`w-2/3 md:w-1/2 max-w-sm ${i % 2 === 0 ? 'bg-blue-200' : 'bg-gray-200'} h-16 rounded-2xl`}></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {(() => {
                                const displayMsgs = searchQuery
                                    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
                                    : messages;
                                let lastDate = '';
                                return displayMsgs.map((msg, idx) => {
                                    let dateSeparator = null;
                                    if (msg.timestamp) {
                                        const msgDate = new Date(msg.timestamp.seconds * 1000);
                                        const today = new Date();
                                        const yesterday = new Date(today);
                                        yesterday.setDate(yesterday.getDate() - 1);

                                        let dateLabel = '';
                                        if (msgDate.toDateString() === today.toDateString()) {
                                            dateLabel = 'Today';
                                        } else if (msgDate.toDateString() === yesterday.toDateString()) {
                                            dateLabel = 'Yesterday';
                                        } else {
                                            dateLabel = msgDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
                                        }

                                        if (dateLabel !== lastDate) {
                                            lastDate = dateLabel;
                                            dateSeparator = (
                                                <div key={`date-${idx}`} className="flex items-center justify-center my-4">
                                                    <span className="px-4 py-1 bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 text-xs rounded-full font-medium shadow-sm">
                                                        {dateLabel}
                                                    </span>
                                                </div>
                                            );
                                        }
                                    }
                                    return (
                                        <div key={msg.id}>
                                            {dateSeparator}
                                            <div className="msg-entrance" style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}>
                                                <MessageBubble
                                                    message={msg}
                                                    isOwn={msg.senderId === currentUser?.uid}
                                                    senderData={users[msg.senderId]}
                                                    isGroup={chatData?.type === 'group'}
                                                    chatId={chatId}
                                                    currentUserId={currentUser?.uid || ''}
                                                    onReply={() => setReplyTo(msg)}
                                                    onForward={() => setForwardMsg(msg)}
                                                    participantCount={chatData?.participants?.length || 2}
                                                />
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                <div className="h-6 px-4 text-sm text-gray-500 italic flex-shrink-0 bg-white">
                    {typingIndicatorText}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0 pb-6 md:pb-4">
                    {/* Reply preview bar */}
                    {replyTo && (
                        <div className="px-4 pt-2 flex items-center gap-2">
                            <div className="flex-grow bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded px-3 py-2">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    Replying to {replyTo.senderId === currentUser?.uid ? 'yourself' : (users[replyTo.senderId]?.name || 'User')}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{replyTo.text}</p>
                            </div>
                            <button onClick={() => setReplyTo(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex space-x-2 items-center p-4 pt-2">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-3 text-gray-500 hover:text-yellow-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Emoji"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            {showEmojiPicker && (
                                <EmojiPicker
                                    onSelect={(emoji) => setInputText(prev => prev + emoji)}
                                    onClose={() => setShowEmojiPicker(false)}
                                />
                            )}
                        </div>
                        <input
                            type="text"
                            value={inputText}
                            onChange={handleInputChange}
                            placeholder="Type your message..."
                            className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700"
                            required
                            autoComplete="off"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors duration-200 flex-shrink-0"
                            title="Send"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>

            {/* Forward Message Modal */}
            {
                forwardMsg && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-5">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Forward Message</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate bg-gray-100 dark:bg-gray-700 rounded p-2">"{forwardMsg.text}"</p>
                            <div className="max-h-60 overflow-y-auto space-y-1">
                                {conversations.filter(c => c.id !== chatId).map(chat => {
                                    let name = 'Chat';
                                    if (chat.type === 'group') {
                                        name = chat.groupName || 'Group';
                                    } else {
                                        const pid = chat.participants.find((uid: string) => uid !== currentUser?.uid);
                                        name = pid && users[pid] ? users[pid].name || 'User' : 'Chat';
                                    }
                                    return (
                                        <button
                                            key={chat.id}
                                            onClick={async () => {
                                                try {
                                                    await addDoc(collection(db, CHATS_COL, chat.id, 'messages'), {
                                                        senderId: currentUser?.uid,
                                                        text: `↗️ Forwarded: ${forwardMsg.text}`,
                                                        timestamp: serverTimestamp(),
                                                        readBy: [currentUser?.uid],
                                                    });
                                                    await setDoc(doc(db, CHATS_COL, chat.id), {
                                                        lastMessage: `↗️ Forwarded: ${forwardMsg.text?.substring(0, 50)}`,
                                                        lastUpdated: serverTimestamp(),
                                                    }, { merge: true });
                                                    setForwardMsg(null);
                                                } catch (err) {
                                                    console.error('Error forwarding:', err);
                                                    alert('Could not forward message.');
                                                }
                                            }}
                                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                            <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{name}</p>
                                        </button>
                                    );
                                })}
                                {conversations.filter(c => c.id !== chatId).length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4">No other chats to forward to</p>
                                )}
                            </div>
                            <button onClick={() => setForwardMsg(null)} className="mt-3 w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                )
            }
        </>
    );
}
