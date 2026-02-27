import { useState, useEffect } from 'react';
import { collectionGroup, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

interface StarredMessagesModalProps {
    onClose: () => void;
}

export default function StarredMessagesModal({ onClose }: StarredMessagesModalProps) {
    const { currentUser } = useAuth();
    const { users } = useChat();
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        const fetchStarred = async () => {
            try {
                const q = query(
                    collectionGroup(db, 'messages'),
                    where('starredBy', 'array-contains', currentUser.uid)
                );
                const snapshot = await getDocs(q);
                const msgs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ref: doc.ref,
                    ...doc.data()
                }));
                // Sort client side to avoid needing a composite index
                msgs.sort((a: any, b: any) => {
                    const timeA = a.timestamp?.toMillis() || 0;
                    const timeB = b.timestamp?.toMillis() || 0;
                    return timeB - timeA; // descending
                });
                setMessages(msgs);
            } catch (err) {
                console.error("Error fetching starred messages:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStarred();
    }, [currentUser]);

    const handleUnstar = async (msg: any) => {
        try {
            const newStarredBy = (msg.starredBy || []).filter((uid: string) => uid !== currentUser?.uid);
            await updateDoc(msg.ref, { starredBy: newStarredBy });
            setMessages(prev => prev.filter(m => m.id !== msg.id));
        } catch (err) {
            console.error("Error unstarring message:", err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Starred Messages
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            <p className="text-gray-500 dark:text-slate-400 font-medium">No starred messages yet.</p>
                            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Star important messages to find them here easily.</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const sender = users[msg.senderId];
                            const senderName = msg.senderId === currentUser?.uid ? 'You' : (sender?.name || 'Unknown User');
                            const time = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

                            return (
                                <div key={msg.id} className="bg-gray-50 dark:bg-slate-800/80 rounded-xl p-3 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                                                {senderName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{senderName}</span>
                                                <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">{time}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUnstar(msg)}
                                            className="text-yellow-500 hover:text-gray-400 dark:hover:text-slate-500 transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"
                                            title="Unstar Message"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </button>
                                    </div>
                                    {msg.text && <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{msg.text}</p>}
                                    {msg.imageUrl && (
                                        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5 rounded w-fit">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Image Attachment
                                        </div>
                                    )}
                                    {msg.audioUrl && (
                                        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5 rounded w-fit">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            </svg>
                                            Voice Message
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
