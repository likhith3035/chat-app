import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, setDoc, doc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { ref as dbRef, set, remove, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, rtdb, storage, CHATS_COL } from '../firebase';
import MessageBubble from './MessageBubble';
import EmojiPicker from './EmojiPicker';
import TypingIndicator from './TypingIndicator';
import ForwardModal from './modals/ForwardModal';
import ChatDetailsModal from './modals/ChatDetailsModal';
import CreatePollModal from './modals/CreatePollModal';
import { getThemeGradient } from '../utils/themes';

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
    const [editingMsg, setEditingMsg] = useState<any>(null);
    const [showScrollFab, setShowScrollFab] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);
    const [globalTyping, setGlobalTyping] = useState<Record<string, string[]>>({});

    // Voice Message State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
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
        const typRef = dbRef(rtdb, `/typing/${chatId}/${currentUser.uid}`);
        if (isTyping) {
            set(typRef, { isTyping: true });
        } else {
            remove(typRef);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);

        // Auto-resize logic
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }

        broadcastTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            // Create a synthetic event or just call the logic since form submit isn't strictly necessary
            if (inputText.trim()) {
                handleSendMessage(e as unknown as React.FormEvent);
            }
        }
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

            // Check if we were already near the bottom before adding new messages
            const container = messagesContainerRef.current;
            const isNearBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 100) : true;

            setMessages(msgs);
            setLoading(false);

            // Auto-scroll to bottom if we were already near it, or on initial load
            if (isNearBottom || msgs.length === snapshot.size) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else if (msgs.length > messages.length) {
                // if new message arrived and we are scrolled up, show the fab right away
                setShowScrollFab(true);
            }
        });

        // Listen for global typing changes to render the new animated typing bubble
        const typingRef = dbRef(rtdb, `/typing`);
        const unsubTyping = onValue(typingRef, (snapshot) => {
            const data = snapshot.val() || {};
            const newGlobal: Record<string, string[]> = {};
            Object.keys(data).forEach(cId => {
                const chatTypers = data[cId];
                newGlobal[cId] = Object.keys(chatTypers).filter(uid => uid !== currentUser.uid && chatTypers[uid].isTyping);
            });
            setGlobalTyping(newGlobal);
        });


        return () => {
            unsub();
            unsubTyping();
        };
    }, [chatId, currentUser]);

    const handleScroll = () => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        setShowScrollFab(!isNearBottom);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    let chatName = 'Chat';
    let avatarUrl = 'https://ui-avatars.com/api/?name=Chat&background=random';

    const getDisplayName = (uid: string, defaultName: string) => {
        return chatData?.nicknames?.[uid] || defaultName;
    };

    if (chatData) {
        if (chatData.type === 'group') {
            chatName = chatData.groupName || 'Group Chat';
            avatarUrl = chatData.groupAvatar || avatarUrl;
        } else {
            const partnerId = chatData.participants.find((uid: string) => uid !== currentUser?.uid);
            const partnerData = partnerId ? users[partnerId] : null;
            if (partnerData && partnerId) {
                chatName = getDisplayName(partnerId, partnerData.name || 'User');
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

            // Reset textarea height instantly
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }

            if (editingMsg) {
                const msgRef = doc(db, CHATS_COL, chatId, 'messages', editingMsg.id);
                await updateDoc(msgRef, {
                    text: text,
                    editedAt: serverTimestamp()
                });
                setEditingMsg(null);
                broadcastTyping(false);
                return;
            }

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

    // Drag and Drop Logic
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleQuoteClick = (msgId: string) => {
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-yellow-100', 'dark:bg-yellow-500/20', 'transition-colors', 'duration-500', 'rounded-xl');
            setTimeout(() => {
                el.classList.remove('bg-yellow-100', 'dark:bg-yellow-500/20');
            }, 2000);
        }
    };

    const handlePinMessage = async (msg: any) => {
        if (!chatId) return;
        try {
            await updateDoc(doc(db, CHATS_COL, chatId), {
                pinnedMessage: {
                    id: msg.id,
                    text: msg.text || 'Message',
                    senderName: users[msg.senderId]?.name || 'User'
                }
            });
        } catch (error) {
            console.error('Error pinning message:', error);
        }
    };

    const startRecording = async () => {
        if (!currentUser) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                if (recordingDuration < 1) return; // Too short

                try {
                    const audioRef = storageRef(storage, `audios/${Date.now()}_${currentUser.uid}.webm`);
                    await uploadBytes(audioRef, audioBlob);
                    const url = await getDownloadURL(audioRef);

                    const msgData: any = {
                        senderId: currentUser.uid,
                        audioUrl: url,
                        timestamp: serverTimestamp(),
                        readBy: [currentUser.uid]
                    };
                    if (replyTo) {
                        msgData.replyTo = {
                            id: replyTo.id,
                            text: replyTo.text || 'Voice Message',
                            senderId: replyTo.senderId,
                            senderName: users[replyTo.senderId]?.name || 'User'
                        };
                    }
                    await addDoc(collection(db, CHATS_COL, chatId, 'messages'), msgData);

                    // Update chat last message
                    await updateDoc(doc(db, CHATS_COL, chatId), {
                        lastMessage: '🎤 Voice Message',
                        lastMessageType: 'audio',
                        lastMessageTime: serverTimestamp(),
                        lastSenderId: currentUser.uid
                    });

                    setReplyTo(null);
                    scrollToBottom();
                } catch (error) {
                    console.error("Error uploading audio:", error);
                    alert("Failed to send voice message.");
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingDuration(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Microphone access is required to send voice messages.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            // override onstop so it doesn't upload
            mediaRecorderRef.current.onstop = () => {
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            setRecordingDuration(0);
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find(f => f.type.startsWith('image/'));

        if (imageFile && currentUser && chatId) {
            try {
                // Upload image
                const fileRef = storageRef(storage, `chat_images/${chatId}/${Date.now()}_${imageFile.name}`);
                await uploadBytes(fileRef, imageFile);
                const imageUrl = await getDownloadURL(fileRef);

                // Send message with image
                const chatDocRef = doc(db, CHATS_COL, chatId);
                const messagesColRef = collection(chatDocRef, 'messages');

                await addDoc(messagesColRef, {
                    senderId: currentUser.uid,
                    text: '',
                    imageUrl: imageUrl,
                    timestamp: serverTimestamp(),
                    readBy: [currentUser.uid],
                });

                await setDoc(chatDocRef, {
                    lastMessage: 'Image',
                    lastMessageType: 'image',
                    lastUpdated: serverTimestamp(),
                }, { merge: true });

            } catch (err) {
                console.error("Error uploading dragged image:", err);
                alert("Failed to upload image.");
            }
        }
    };

    return (
        <>
            <div
                className="flex-grow flex flex-col h-full bg-white relative"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-2xl m-4 flex items-center justify-center pointer-events-none">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-slate-100">Drop Image to Send</h2>
                        </div>
                    </div>
                )}

                <div className="p-4 glass-header border-b-0 shadow-sm flex items-center flex-shrink-0 z-20">
                    <button onClick={onBack} title="Close Chat" className="p-2 rounded-full text-gray-600 dark:text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all mr-3 hover-lift">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <img className="h-10 w-10 rounded-full object-cover shadow-sm" src={avatarUrl} alt="Avatar" />
                    <div className="ml-3 flex-grow">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">{chatName}</h3>
                        {chatData?.type !== 'group' && (() => {
                            const partnerId = chatData?.participants?.find((uid: string) => uid !== currentUser?.uid);
                            if (!partnerId) return null;
                            const partnerData = users[partnerId];
                            const isOnline = onlineStatus[partnerId];
                            const lastSeen = partnerData?.lastSeen;

                            let lastSeenText = '';
                            if (!isOnline && lastSeen) {
                                const lastSeenDate = lastSeen.seconds ? new Date(lastSeen.seconds * 1000) : new Date(lastSeen);
                                const now = new Date();
                                const diffMs = now.getTime() - lastSeenDate.getTime();
                                const diffMin = Math.floor(diffMs / 60000);
                                const diffHr = Math.floor(diffMin / 60);
                                if (diffMin < 1) lastSeenText = 'Last seen just now';
                                else if (diffMin < 60) lastSeenText = `Last seen ${diffMin}m ago`;
                                else if (diffHr < 24) lastSeenText = `Last seen ${diffHr}h ago`;
                                else lastSeenText = `Last seen ${lastSeenDate.toLocaleDateString()}`;
                            }

                            return (
                                <div className="flex items-center gap-2 mt-0.5">
                                    {isOnline ? (
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                                            <span className="text-[11px] font-medium text-green-600 dark:text-green-400">Online</span>
                                        </div>
                                    ) : lastSeenText ? (
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 whitespace-nowrap">{lastSeenText}</span>
                                    ) : null}

                                    {partnerData?.customStatus && (
                                        <div className="flex items-center gap-1 truncate border-l border-gray-200 dark:border-slate-700 pl-2 ml-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80 mr-0.5 flex-shrink-0"></span>
                                            <p className="text-[11px] text-blue-500/90 dark:text-blue-400/90 font-medium truncate" title={partnerData.customStatus}>
                                                {partnerData.customStatus}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    <button
                        onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }}
                        title="Search Messages"
                        className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ml-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setIsDetailsModalOpen(true)}
                        title="Chat Details"
                        className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ml-1 border border-transparent dark:border-white/5 bg-gray-50 dark:bg-slate-800 shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                        className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ml-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                {/* Search Bar */}
                {showSearch && (
                    <div className="px-5 py-3 border-b border-gray-200/50 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md flex-shrink-0 z-10 animate-fade-in-up">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search messages..."
                                className="w-full pl-10 pr-3 py-2.5 text-sm border-0 ring-1 ring-gray-200 dark:ring-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 shadow-sm transition-all"
                                autoFocus
                            />
                        </div>
                        {searchQuery && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())).length} results found
                            </p>
                        )}
                    </div>
                )}

                <div
                    className="flex-grow p-4 overflow-y-auto flex flex-col h-full chat-wallpaper relative"
                    style={{
                        backgroundImage: currentUser && users[currentUser.uid]?.chatWallpaper?.startsWith('url') ? users[currentUser.uid].chatWallpaper : undefined,
                        backgroundColor: currentUser && users[currentUser.uid]?.chatWallpaper?.startsWith('#') ? users[currentUser.uid].chatWallpaper : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                >
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
                                    ? messages.filter(m => !m.isDeleted && m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
                                    : messages.filter(m => !m.isDeleted);

                                const participantCount = chatData?.participants?.length || 2;

                                let lastDate = '';
                                return displayMsgs.map((msg, idx) => {
                                    const isFirstInGroup = idx === 0 || displayMsgs[idx - 1].senderId !== msg.senderId;
                                    const isLastInGroup = idx === displayMsgs.length - 1 || displayMsgs[idx + 1].senderId !== msg.senderId;

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
                                                <div key={`date-${idx}`} className="flex items-center justify-center my-4 sticky top-2 z-20">
                                                    <span className="px-4 py-1.5 bg-gray-200/90 dark:bg-slate-800/90 backdrop-blur-md text-gray-700 dark:text-slate-300 text-xs rounded-full font-semibold shadow-sm border border-white/20 dark:border-white/5">
                                                        {dateLabel}
                                                    </span>
                                                </div>
                                            );
                                        }
                                    }

                                    return (
                                        <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors duration-1000 -mx-2 px-2 py-1 rounded-xl relative hover:z-40">
                                            {dateSeparator}
                                            <div className="msg-entrance relative" style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}>
                                                <MessageBubble
                                                    message={msg}
                                                    isOwn={msg.senderId === currentUser?.uid}
                                                    senderData={{
                                                        ...users[msg.senderId],
                                                        name: getDisplayName(msg.senderId, users[msg.senderId]?.name || 'User')
                                                    }}
                                                    isGroup={chatData?.type === 'group'}
                                                    chatId={chatId}
                                                    currentUserId={currentUser?.uid || ''}
                                                    onReply={() => setReplyTo(msg)}
                                                    onForward={() => setForwardMsg(msg)}
                                                    onEdit={() => { setEditingMsg(msg); setInputText(msg.text || ''); textareaRef.current?.focus(); }}
                                                    onPin={() => handlePinMessage(msg)}
                                                    onQuoteClick={handleQuoteClick}
                                                    searchQuery={searchQuery}
                                                    isFirstInGroup={isFirstInGroup}
                                                    isLastInGroup={isLastInGroup}
                                                    isRead={!!(msg.readBy && msg.readBy.length >= participantCount)}
                                                    themeGradient={getThemeGradient(chatData?.theme)}
                                                />
                                            </div>
                                        </div>
                                    );
                                });
                            })()}

                            {/* Granular Typing Indicator */}
                            {(() => {
                                const chatTypers = globalTyping[chatId] || [];
                                if (chatTypers.length === 0) return null;
                                let typingText = 'typing...';
                                if (chatData?.type === 'group') {
                                    if (chatTypers.length === 1) {
                                        const typerName = getDisplayName(chatTypers[0], users[chatTypers[0]]?.name || 'Someone').split(' ')[0];
                                        typingText = `${typerName} is typing...`;
                                    } else {
                                        typingText = `${chatTypers.length} people are typing...`;
                                    }
                                }

                                return (
                                    <div className="flex justify-start animate-fade-in-up mt-2 px-2 pb-2">
                                        <div className="flex flex-col gap-1 items-start">
                                            <TypingIndicator />
                                            <span className="text-[10px] text-gray-400 dark:text-slate-500 italic ml-2">
                                                {typingText}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div ref={messagesEndRef} className="h-4" />
                        </>
                    )}
                </div>

                <div className="relative">
                    {/* Scroll to bottom FAB */}
                    {showScrollFab && (
                        <button
                            onClick={scrollToBottom}
                            className="absolute right-4 bottom-4 p-2 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-full shadow-lg border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all z-10 flex items-center justify-center animate-bounce duration-300"
                            style={{ animationDuration: '2s' }}
                            title="Scroll to bottom"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="bg-transparent flex-shrink-0 px-4 pb-6 md:pb-4 pt-2 relative z-20">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl mx-auto w-full transition-all flex flex-col">
                        {/* Editing / Reply preview bar */}
                        {editingMsg && (
                            <div className="px-4 pt-2 flex items-center gap-2">
                                <div className="flex-grow bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded px-3 py-2">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                        Editing Message
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-slate-300 truncate">{editingMsg.text}</p>
                                </div>
                                <button onClick={() => { setEditingMsg(null); setInputText(''); }} className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        {replyTo && !editingMsg && (
                            <div className="px-4 pt-2 flex items-center gap-2">
                                <div className="flex-grow bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded px-3 py-2">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                        Replying to {replyTo.senderId === currentUser?.uid ? 'yourself' : (users[replyTo.senderId]?.name || 'User')}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-slate-300 truncate">{replyTo.text}</p>
                                </div>
                                <button onClick={() => setReplyTo(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
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
                                    className="p-3 text-gray-500 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded-lg transition-colors"
                                    title="Emoji"
                                    disabled={isRecording}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                                {showEmojiPicker && !isRecording && (
                                    <EmojiPicker
                                        onSelect={(emoji) => setInputText(prev => prev + emoji)}
                                        onClose={() => setShowEmojiPicker(false)}
                                    />
                                )}
                            </div>

                            {chatData?.type === 'group' && (
                                <button
                                    type="button"
                                    onClick={() => setIsCreatePollModalOpen(true)}
                                    className="p-3 text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded-lg transition-colors flex-shrink-0"
                                    title="Create Poll"
                                    disabled={isRecording}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </button>
                            )}

                            {isRecording ? (
                                <div className="flex-grow flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-2xl px-4 py-2 h-[48px] animate-pulse">
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                        <span className="font-medium text-sm">Recording {formatDuration(recordingDuration)}</span>
                                    </div>
                                    <button type="button" onClick={cancelRecording} className="text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 text-sm font-medium px-2">
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <textarea
                                    ref={textareaRef}
                                    value={inputText}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Message..."
                                    className="flex-grow p-3 min-h-[48px] max-h-[120px] resize-none overflow-y-auto border-0 focus:ring-0 bg-transparent text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all custom-scrollbar-light dark:custom-scrollbar-dark leading-relaxed"
                                    style={{ height: '48px', outline: 'none', boxShadow: 'none' }}
                                    required
                                />
                            )}

                            {inputText.trim() || isRecording ? (
                                <button
                                    type={isRecording ? "button" : "submit"}
                                    onClick={isRecording ? stopRecording : undefined}
                                    className="bg-blue-600 hover:bg-blue-700 self-end mb-1 text-white p-3 rounded-full transition-colors duration-200 flex-shrink-0 flex items-center justify-center w-12 h-12 shadow-sm"
                                    title={isRecording ? "Send Voice" : "Send Text"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 self-end mb-1 p-3 rounded-full transition-colors duration-200 flex-shrink-0 flex items-center justify-center w-12 h-12 shadow-sm border border-transparent dark:border-white/5"
                                    title="Hold to record audio"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            {/* Forward Message Modal */}
            {
                forwardMsg && (
                    <ForwardModal
                        messageToForward={forwardMsg}
                        onClose={() => setForwardMsg(null)}
                    />
                )
            }

            {/* Chat Details Modal */}
            {
                isDetailsModalOpen && (
                    <ChatDetailsModal
                        chatId={chatId}
                        chatData={chatData}
                        messages={messages}
                        onClose={() => setIsDetailsModalOpen(false)}
                        onSelectTheme={async (themeId) => {
                            try {
                                await updateDoc(doc(db, CHATS_COL, chatId), { theme: themeId });
                            } catch (err) {
                                console.error('Failed to change theme', err);
                            }
                        }}
                        onUpdateNickname={async (uid, nickname) => {
                            try {
                                const currentNicknames = chatData?.nicknames || {};
                                const updatedNicknames = { ...currentNicknames };
                                if (nickname) {
                                    updatedNicknames[uid] = nickname;
                                } else {
                                    delete updatedNicknames[uid]; // Remove nickname if empty
                                }
                                await updateDoc(doc(db, CHATS_COL, chatId), { nicknames: updatedNicknames });
                            } catch (err) {
                                console.error('Failed to update nickname', err);
                            }
                        }}
                    />
                )
            }

            {/* Create Poll Modal */}
            {
                isCreatePollModalOpen && (
                    <CreatePollModal
                        chatId={chatId}
                        onClose={() => setIsCreatePollModalOpen(false)}
                    />
                )
            }
        </>
    );
}
