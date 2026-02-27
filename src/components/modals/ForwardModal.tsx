import { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { db, CHATS_COL } from '../../firebase';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

interface ForwardModalProps {
    messageToForward: any;
    onClose: () => void;
}

export default function ForwardModal({ messageToForward, onClose }: ForwardModalProps) {
    const { currentUser } = useAuth();
    const { conversations, users } = useChat();
    const [searchQuery, setSearchQuery] = useState('');
    const [isForwarding, setIsForwarding] = useState(false);

    const handleForward = async (targetChatId: string) => {
        if (!currentUser) return;
        setIsForwarding(true);
        try {
            await addDoc(collection(db, CHATS_COL, targetChatId, 'messages'), {
                text: messageToForward.text || '',
                imageUrl: messageToForward.imageUrl || null,
                audioUrl: messageToForward.audioUrl || null,
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
                readBy: [currentUser.uid],
                isForwarded: true // an indicator we might want
            });
            await updateDoc(doc(db, CHATS_COL, targetChatId), {
                lastMessage: 'Forwarded message',
                lastMessageTime: serverTimestamp()
            });
        } catch (error) {
            console.error('Error forwarding message:', error);
            alert('Failed to forward message.');
        } finally {
            setIsForwarding(false);
            onClose();
        }
    };

    const filteredChats = conversations.filter(chat => {
        if (chat.type === 'group') {
            return chat.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
        } else {
            const otherParticipantId = chat.participants.find(p => p !== currentUser?.uid);
            const otherUser = otherParticipantId ? users[otherParticipantId] : null;
            return otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || otherUser?.email?.toLowerCase().includes(searchQuery.toLowerCase());
        }
    });

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Forward Message
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 dark:border-white/5">
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-slate-800/50 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all text-sm"
                    />
                </div>

                <div className="flex-1 overflow-y-auto w-full custom-scrollbar-light dark:custom-scrollbar-dark p-2 space-y-1">
                    {filteredChats.length === 0 ? (
                        <p className="text-gray-500 dark:text-slate-500 p-4 text-center text-sm">No chats found.</p>
                    ) : (
                        filteredChats.map(chat => {
                            let name = chat.type === 'group' ? chat.groupName : "Unknown Chat";
                            let avatarUrl = chat.type === 'group' ? chat.groupAvatar : "";
                            if (chat.type !== 'group') {
                                const otherUserId = chat.participants.find((p: string) => p !== currentUser?.uid);
                                if (otherUserId && users[otherUserId]) {
                                    name = users[otherUserId].name;
                                    avatarUrl = users[otherUserId].avatarUrl;
                                }
                            }
                            return (
                                <div key={chat.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <img src={avatarUrl || `https://ui-avatars.com/api/?name=${name}&background=random`} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                        <span className="font-medium text-gray-800 dark:text-slate-200 truncate">{name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleForward(chat.id)}
                                        disabled={isForwarding}
                                        className="px-4 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/60 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        Send
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
