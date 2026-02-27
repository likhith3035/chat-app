import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db, CHATS_COL } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ImageModal from './modals/ImageModal';
import ReactionDetailsModal from './modals/ReactionDetailsModal';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface SenderData {
    uid: string;
    name?: string;
    avatarUrl?: string;
}

interface LinkPreviewData {
    title?: string;
    description?: string;
    image?: { url: string };
    url?: string;
    publisher?: string;
    logo?: { url: string };
}

interface Message {
    id: string;
    senderId: string;
    type?: 'text' | 'image' | 'audio' | 'poll';
    text?: string;
    imageUrl?: string;
    audioUrl?: string;
    pollData?: {
        question: string;
        options: { id: string; text: string; votes: string[] }[];
        votedBy?: string[];
    };
    timestamp?: any;
    reactions?: Record<string, string[]>;
    replyTo?: {
        id: string;
        text: string;
        senderId: string;
        senderName: string;
    };
    readBy?: string[];
    starredBy?: string[];
    editedAt?: any;
    isDeleted?: boolean;
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
    onEdit?: () => void;
    onPin?: () => void;
    onQuoteClick?: (msgId: string) => void;
    isFirstInGroup?: boolean;
    isLastInGroup?: boolean;
    isRead?: boolean;
    themeGradient?: string;
}

export default function MessageBubble({ message, isOwn, senderData, isGroup, chatId, currentUserId, onReply, onForward, onEdit, onPin, onQuoteClick, isFirstInGroup = true, isLastInGroup = true, isRead = false, themeGradient }: MessageBubbleProps) {
    const [showReactions, setShowReactions] = useState(false);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showHeartAnimation, setShowHeartAnimation] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showReactionDetails, setShowReactionDetails] = useState(false);
    const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);

    // Swipe-to-reply state
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [trayPosition, setTrayPosition] = useState<{ top: number, left?: number, right?: number }>({ top: 0 });

    useEffect(() => {
        if (message.isDeleted || !message.text) return;

        // Find the first URL in the text
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const match = message.text.match(urlRegex);
        if (match && match.length > 0) {
            const url = match[0];
            fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success' && data.data) {
                        setLinkPreview(data.data);
                    }
                })
                .catch(err => console.error("Error fetching link preview", err));
        }
    }, [message.text, message.isDeleted]);

    let timestamp = '';
    if (message.timestamp) {
        timestamp = new Date(message.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const isEdited = !!message.editedAt;

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
            await updateDoc(msgRef, {
                isDeleted: true,
                text: '',
                imageUrl: null,
                audioUrl: null,
                reactions: {}
            });
        } catch (err) {
            console.error('Error deleting message:', err);
        }
        setShowContextMenu(false);
    };

    const handleStar = async () => {
        try {
            const msgRef = doc(db, CHATS_COL, chatId, 'messages', message.id);
            const currentStarredBy = message.starredBy || [];
            let newStarredBy;
            if (currentStarredBy.includes(currentUserId)) {
                newStarredBy = currentStarredBy.filter(uid => uid !== currentUserId);
            } else {
                newStarredBy = [...currentStarredBy, currentUserId];
            }
            await updateDoc(msgRef, { starredBy: newStarredBy });
        } catch (err) {
            console.error('Error starring message:', err);
        }
        setShowContextMenu(false);
    };

    const handleDoubleClick = () => {
        if (message.isDeleted) return;
        handleReaction('❤️');
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 1000);
    };

    const SWIPE_THRESHOLD = 60; // minimum pixels to trigger reply

    const handleTouchStart = (e: React.TouchEvent) => {
        if (message.isDeleted) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;

        longPressTimer.current = setTimeout(() => {
            setShowContextMenu(true);
        }, 400);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - touchStartX.current;
        const diffY = currentY - touchStartY.current;

        // Cancel long press if finger moves
        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        }

        if (diffX > 0 && diffX < SWIPE_THRESHOLD * 1.5) {
            setSwipeOffset(diffX);
            setIsSwiping(true);
        } else if (diffX > 0) {
            setSwipeOffset(SWIPE_THRESHOLD * 1.5);
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (swipeOffset >= SWIPE_THRESHOLD && onReply) {
            onReply();
        }
        setSwipeOffset(0);
        setIsSwiping(false);
        touchStartX.current = null;
        touchStartY.current = null;
    };

    const handleMouseEnter = () => {
        if (!bubbleRef.current) return;
        const rect = bubbleRef.current.getBoundingClientRect();

        // Position tray just above the bubble
        const top = rect.top + window.scrollY - 46;

        if (isOwn) {
            setTrayPosition({ top, right: window.innerWidth - rect.right });
        } else {
            setTrayPosition({ top, left: rect.left });
        }
        setShowReactions(true);
    };

    return (
        <div
            className={`msg-entrance relative ${showReactions || showContextMenu ? 'z-50' : 'z-10'}`}
            onMouseLeave={() => setShowReactions(false)}
        >
            <div
                ref={bubbleRef}
                className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'} group relative`}
                onMouseEnter={handleMouseEnter}
                onContextMenu={(e) => { e.preventDefault(); setCopied(false); setShowContextMenu(true); }}
            >
                {/* Reply icon indicator (appears on swipe) */}
                {swipeOffset > 20 && (
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center bg-gray-200 dark:bg-slate-700 rounded-full w-8 h-8 shadow text-gray-600 dark:text-slate-300 transition-opacity"
                        style={{
                            opacity: Math.min(swipeOffset / SWIPE_THRESHOLD, 1),
                            transform: `translateY(-50%) translateX(${Math.max(0, swipeOffset - 40)}px)`
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </div>
                )}

                <div
                    className={`flex flex-col max-w-[70%] md:max-w-sm ${isOwn ? 'items-end' : 'items-start'} transition-transform duration-200 ${isSwiping ? 'ease-linear' : 'ease-out'}`}
                    style={{ transform: `translateX(${swipeOffset}px)` }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDoubleClick={handleDoubleClick}
                >

                    {senderName && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 ml-3 mb-1">{senderName}</p>
                    )}

                    <div className="relative">
                        {(() => {
                            let radiusClass = 'rounded-[20px]';
                            if (isOwn) {
                                if (isFirstInGroup && isLastInGroup) radiusClass = 'rounded-[20px]';
                                else if (isFirstInGroup) radiusClass = 'rounded-[20px] rounded-br-md';
                                else if (isLastInGroup) radiusClass = 'rounded-[20px] rounded-tr-md';
                                else radiusClass = 'rounded-[20px] rounded-tr-md rounded-br-md';
                            } else {
                                if (isFirstInGroup && isLastInGroup) radiusClass = 'rounded-[20px]';
                                else if (isFirstInGroup) radiusClass = 'rounded-[20px] rounded-bl-md';
                                else if (isLastInGroup) radiusClass = 'rounded-[20px] rounded-tl-md';
                                else radiusClass = 'rounded-[20px] rounded-tl-md rounded-bl-md';
                            }

                            const bgClass = isOwn
                                ? (themeGradient || 'bg-gradient-to-bl from-blue-500 via-blue-600 to-indigo-600 text-white border-transparent shadow-[0_4px_14px_0_rgba(59,130,246,0.25)]')
                                : 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-gray-200/50 dark:border-white/10 text-gray-800 dark:text-slate-100 shadow-[0_4px_14px_0_rgba(0,0,0,0.04)]';

                            return (
                                <div className={`px-4 py-2.5 border transition-all duration-200 ${bgClass} ${radiusClass}`}>
                                    {/* Reply quote */}
                                    {message.replyTo && (
                                        <div
                                            onClick={() => onQuoteClick && message.replyTo?.id && onQuoteClick(message.replyTo.id)}
                                            className={`mb-2 border-l-2 cursor-pointer hover:opacity-80 transition-opacity ${isOwn ? 'border-blue-300 bg-blue-700/50' : 'border-gray-400 dark:border-slate-500 bg-gray-100 dark:bg-slate-900/50'} rounded px-2 py-1`}
                                        >
                                            <p className={`text-[10px] font-medium ${isOwn ? 'text-blue-200' : 'text-gray-500 dark:text-slate-400'}`}>{message.replyTo.senderName}</p>
                                            <p className={`text-xs truncate ${isOwn ? 'text-blue-100' : 'text-gray-600 dark:text-slate-300'}`}>{message.replyTo.text}</p>
                                        </div>
                                    )}

                                    {message.isDeleted ? (
                                        <div className={`flex items-center gap-2 italic text-sm ${isOwn ? 'text-blue-200' : 'text-gray-500 dark:text-slate-400'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                            <span>This message was deleted</span>
                                        </div>
                                    ) : message.imageUrl ? (
                                        <img
                                            src={message.imageUrl}
                                            alt="Chat attachment"
                                            className="rounded-lg max-h-48 object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setShowImageModal(true)}
                                        />
                                    ) : message.audioUrl ? (
                                        <div className="flex items-center gap-2">
                                            <audio controls className={`max-w-[200px] md:max-w-[250px] h-10 ${isOwn ? 'grayscale contrast-150' : ''}`} src={message.audioUrl} />
                                        </div>
                                    ) : message.pollData ? (
                                        <div className={`text-sm w-full min-w-[200px] ${isOwn ? 'text-white' : 'text-gray-800 dark:text-slate-100'}`}>
                                            <p className="font-bold mb-3 text-[15px]">{message.pollData.question}</p>
                                            <div className="space-y-2">
                                                {message.pollData.options.map((opt) => {
                                                    const totalVotes = message.pollData?.votedBy?.length || 0;
                                                    const optVotes = opt.votes.length;
                                                    const percent = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                                                    const hasVotedThis = opt.votes.includes(currentUserId);

                                                    return (
                                                        <div
                                                            key={opt.id}
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                try {
                                                                    const msgRef = doc(db, CHATS_COL, chatId, 'messages', message.id);
                                                                    const currentPollData = message.pollData;
                                                                    if (!currentPollData) return;

                                                                    const newOptions = currentPollData.options.map(o => {
                                                                        const votesWithoutUser = o.votes.filter(uid => uid !== currentUserId);
                                                                        if (o.id === opt.id && !o.votes.includes(currentUserId)) {
                                                                            votesWithoutUser.push(currentUserId);
                                                                        }
                                                                        return { ...o, votes: votesWithoutUser };
                                                                    });

                                                                    const allVoters = new Set<string>();
                                                                    newOptions.forEach(o => o.votes.forEach(uid => allVoters.add(uid)));

                                                                    await updateDoc(msgRef, {
                                                                        pollData: {
                                                                            ...currentPollData,
                                                                            options: newOptions,
                                                                            votedBy: Array.from(allVoters)
                                                                        }
                                                                    });
                                                                } catch (err) {
                                                                    console.error(err);
                                                                }
                                                            }}
                                                            className={`relative overflow-hidden rounded-xl border cursor-pointer transition-all hover:brightness-95 ${hasVotedThis ? (isOwn ? 'border-white bg-blue-500/50 shadow-inner' : 'border-blue-500/50 bg-blue-50 dark:bg-blue-900/40 shadow-inner') : (isOwn ? 'border-blue-300/30 bg-blue-700/20' : 'border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50')} py-2.5 px-3 z-10 flex`}
                                                        >
                                                            <div
                                                                className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out z-0 rounded-r-xl ${isOwn ? 'bg-white/20' : 'bg-blue-500/15 dark:bg-blue-500/20'}`}
                                                                style={{ width: `${percent}%` }}
                                                            ></div>
                                                            <div className="relative z-10 flex justify-between items-center w-full font-medium">
                                                                <span className="flex items-center gap-2">
                                                                    {hasVotedThis && (
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                        </svg>
                                                                    )}
                                                                    <span className="leading-tight">{opt.text}</span>
                                                                </span>
                                                                {totalVotes > 0 && <span className="text-xs opacity-80 shrink-0 ml-3 font-bold">{percent}%</span>}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <p className="text-[10px] opacity-70 mt-3 text-right font-medium uppercase tracking-wider">
                                                {message.pollData.votedBy?.length || 0} vote{(message.pollData.votedBy?.length !== 1) ? 's' : ''}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className={`text-sm break-words markdown-content ${isOwn ? 'text-white' : 'text-gray-800 dark:text-slate-100'}`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }: any) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        return !inline && match ? (
                                                            <div className="relative group mt-2 mb-2 max-w-full overflow-hidden rounded-md border border-slate-700/50 shadow-sm">
                                                                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                                        }}
                                                                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded transition-colors shadow-sm"
                                                                    >
                                                                        Copy
                                                                    </button>
                                                                </div>
                                                                <div className="bg-slate-800/80 px-4 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700/50">
                                                                    {match[1]}
                                                                </div>
                                                                <SyntaxHighlighter
                                                                    {...props}
                                                                    style={vscDarkPlus as any}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    className="!m-0 !bg-[#1e1e1e] text-xs custom-scrollbar-light"
                                                                    customStyle={{ padding: '1rem', backgroundColor: '#1e1e1e' }}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            </div>
                                                        ) : (
                                                            <code {...props} className={className ? className + " bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[13px] font-mono" : "bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[13px] font-mono"}>
                                                                {children}
                                                            </code>
                                                        )
                                                    }
                                                }}
                                            >
                                                {message.text || ''}
                                            </ReactMarkdown>
                                        </div>
                                    )}

                                    {linkPreview && !message.isDeleted && (
                                        <a href={linkPreview.url} target="_blank" rel="noopener noreferrer" className={`mt-2 block overflow-hidden rounded-xl border transition-colors ${isOwn ? 'border-blue-300 bg-blue-700/50 hover:bg-blue-800/50 text-white' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-200'} no-underline`}>
                                            {linkPreview.image?.url && (
                                                <img src={linkPreview.image.url} alt={linkPreview.title} className="w-full h-32 object-cover border-b border-inherit" />
                                            )}
                                            <div className="p-3">
                                                {linkPreview.title && <h4 className="text-sm font-semibold truncate leading-tight">{linkPreview.title}</h4>}
                                                {linkPreview.description && <p className={`text-xs mt-1 line-clamp-2 ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{linkPreview.description}</p>}
                                                {linkPreview.publisher && <p className={`text-[10px] uppercase tracking-wider mt-2 font-semibold ${isOwn ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>{linkPreview.publisher}</p>}
                                            </div>
                                        </a>
                                    )}

                                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                                        {message.starredBy && message.starredBy.includes(currentUserId) && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isOwn ? 'text-yellow-300' : 'text-yellow-500'}`} viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        )}
                                        <p className={`text-[10px] flex items-center gap-1 ${isOwn ? 'text-blue-100' : 'text-gray-400 dark:text-slate-500'}`}>
                                            {timestamp}{isEdited && <span className="italic opacity-80">(edited)</span>}
                                            {isOwn && (
                                                <span className="flex">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRead ? 'text-blue-300 drop-shadow-sm' : 'opacity-70 text-gray-300 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isRead ? "2.5" : "2"}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7M5 13l4 4L19 7" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 13l4 4L24 7M10 13l4 4L24 7" className="translate-x-[-5px]" />
                                                    </svg>
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Temporary Heart Animation on Double Click */}
                        {showHeartAnimation && (
                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                <div className="text-6xl animate-heart-pop text-red-500 drop-shadow-xl" style={{ filter: 'drop-shadow(0px 10px 15px rgba(239, 68, 68, 0.4))' }}>❤️</div>
                            </div>
                        )}

                        {/* Reaction picker + context menu - appears on hover */}
                        {showReactions && !message.isDeleted && createPortal(
                            <div
                                className="absolute z-50 pb-2"
                                style={{
                                    top: `${trayPosition.top}px`,
                                    ...(trayPosition.left !== undefined ? { left: `${trayPosition.left}px` } : {}),
                                    ...(trayPosition.right !== undefined ? { right: `${trayPosition.right}px` } : {}),
                                    animation: 'fadeIn 0.12s ease-out'
                                }}
                                onMouseEnter={() => setShowReactions(true)}
                                onMouseLeave={() => setShowReactions(false)}
                            >
                                <div className="flex bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-100 dark:border-white/10 px-1 py-1 relative">
                                    {/* Invisible bridge to prevent hover loss between bubble and tray */}
                                    <div className="absolute inset-x-0 h-4 -bottom-4 bg-transparent"></div>

                                    {QUICK_REACTIONS.map(emoji => {
                                        const hasReacted = message.reactions?.[emoji]?.includes(currentUserId);
                                        return (
                                            <button
                                                key={emoji}
                                                onClick={() => handleReaction(emoji)}
                                                className={`w-7 h-7 flex items-center justify-center text-base hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-transform hover:scale-125 ${hasReacted ? 'bg-gray-200 dark:bg-slate-600' : ''}`}
                                            >
                                                {emoji}
                                            </button>
                                        );
                                    })}
                                    {/* More actions button */}
                                    <button
                                        onClick={() => setShowContextMenu(!showContextMenu)}
                                        className="w-7 h-7 flex items-center justify-center text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* Instagram-style Bottom Sheet Context Menu */}
                        {showContextMenu && !message.isDeleted && createPortal(
                            <div
                                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity p-0 sm:p-4 animate-fade-in"
                                onClick={(e) => { e.stopPropagation(); setShowContextMenu(false); }}
                                style={{ zIndex: 9999 }}
                            >
                                <div
                                    className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-5 animate-slide-up sm:animate-fade-in shadow-2xl flex flex-col gap-4"
                                    onClick={e => e.stopPropagation()}
                                    onContextMenu={e => e.stopPropagation()}
                                >
                                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-700 rounded-full mx-auto mb-2 sm:hidden"></div>

                                    {/* Emojis Row */}
                                    <div className="flex justify-between items-center bg-gray-100 dark:bg-slate-800 rounded-full py-3 px-5 mb-2 shadow-inner">
                                        {QUICK_REACTIONS.map(emoji => {
                                            const hasReacted = message.reactions?.[emoji]?.includes(currentUserId);
                                            return (
                                                <button
                                                    key={emoji}
                                                    onClick={() => { handleReaction(emoji); setShowContextMenu(false); }}
                                                    className={`text-2xl hover:scale-125 transition-transform origin-bottom ${hasReacted ? 'bg-gray-200 dark:bg-slate-700 rounded-full p-0.5' : ''}`}
                                                >
                                                    {emoji}
                                                </button>
                                            );
                                        })}
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                                            onClick={() => setShowContextMenu(false)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <button onClick={handleCopy} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            {copied ? 'Copied to clipboard!' : 'Copy Text'}
                                        </button>
                                        {onReply && (
                                            <button onClick={() => { onReply(); setShowContextMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                </svg>
                                                Reply
                                            </button>
                                        )}
                                        {onForward && (
                                            <button onClick={() => { onForward(); setShowContextMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                                Forward Message
                                            </button>
                                        )}
                                        <button onClick={handleStar} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill={(message.starredBy && message.starredBy.includes(currentUserId)) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                            {(message.starredBy && message.starredBy.includes(currentUserId)) ? 'Unstar' : 'Star'}
                                        </button>
                                        {onPin && message.text && (
                                            <button onClick={() => { onPin(); setShowContextMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                Pin Message
                                            </button>
                                        )}
                                        {isOwn && onEdit && message.text && (
                                            <button onClick={() => { onEdit(); setShowContextMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                Edit Message
                                            </button>
                                        )}
                                        {isOwn && (
                                            <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors mt-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Unsend
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>

                    {/* Display existing reactions */}
                    {reactionEntries.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            {reactionEntries.map(([emoji, users]) => (
                                <button
                                    key={emoji}
                                    onClick={() => setShowReactionDetails(true)}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${users.includes(currentUserId)
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-500/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <span>{emoji}</span>
                                    <span className="font-medium">{users.length}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modals */}
                {showImageModal && message.imageUrl && (
                    <ImageModal
                        imageUrl={message.imageUrl}
                        onClose={() => setShowImageModal(false)}
                    />
                )}
                {showReactionDetails && message.reactions && (
                    <ReactionDetailsModal
                        reactions={message.reactions}
                        onClose={() => setShowReactionDetails(false)}
                    />
                )}

                <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes heartPop {
                    0% { transform: scale(0) rotate(-15deg); opacity: 0; }
                    50% { transform: scale(1.3) rotate(5deg); opacity: 1; }
                    70% { transform: scale(1) rotate(0deg); opacity: 1; }
                    100% { transform: scale(1) translateY(-20px); opacity: 0; }
                }
                .animate-heart-pop {
                    animation: heartPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>
            </div>
        </div >
    );
}
