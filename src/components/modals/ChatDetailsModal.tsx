import { useState } from 'react';
import { CHAT_THEMES } from '../../utils/themes';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

interface ChatDetailsModalProps {
    onClose: () => void;
    chatId: string;
    chatData: any;
    messages?: any[];
    onSelectTheme: (themeId: string) => void;
    onUpdateNickname: (uid: string, nickname: string) => void;
}

export default function ChatDetailsModal({ onClose, chatData, messages = [], onSelectTheme, onUpdateNickname }: ChatDetailsModalProps) {
    const { currentUser } = useAuth();
    const { users } = useChat();
    const [activeTab, setActiveTab] = useState<'theme' | 'members' | 'media' | 'links'>('theme');

    // State for nickname editing
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [nicknameInput, setNicknameInput] = useState('');

    const handleSaveNickname = (uid: string) => {
        onUpdateNickname(uid, nicknameInput.trim());
        setEditingUid(null);
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Details</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex border-b border-gray-100 dark:border-slate-800 overflow-x-auto custom-scrollbar-light dark:custom-scrollbar-dark shrink-0">
                    <button
                        className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-semibold transition-colors ${activeTab === 'theme' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                        onClick={() => setActiveTab('theme')}
                    >
                        Theme
                    </button>
                    <button
                        className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-semibold transition-colors ${activeTab === 'members' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                        onClick={() => setActiveTab('members')}
                    >
                        Members
                    </button>
                    <button
                        className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-semibold transition-colors ${activeTab === 'media' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                        onClick={() => setActiveTab('media')}
                    >
                        Media
                    </button>
                    <button
                        className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-semibold transition-colors ${activeTab === 'links' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                        onClick={() => setActiveTab('links')}
                    >
                        Links
                    </button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar-light dark:custom-scrollbar-dark flex-grow">
                    {activeTab === 'theme' && (
                        <div className="grid grid-cols-2 gap-4">
                            {CHAT_THEMES.map((theme) => {
                                const isSelected = (chatData?.theme || 'instagram') === theme.id;

                                return (
                                    <div
                                        key={theme.id}
                                        onClick={() => {
                                            onSelectTheme(theme.id);
                                        }}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer border-2 transition-all hover:scale-105 active:scale-95 ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-full mb-3 shadow-md bg-gradient-to-tr ${theme.previewColor}`}>
                                            {isSelected && (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-gray-800 dark:text-slate-200 text-center">{theme.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500 dark:text-slate-400 pb-2 border-b border-gray-100 dark:border-slate-800">Assign custom nicknames that only appear in this chat.</p>
                            {chatData?.participants?.map((uid: string) => {
                                const user = users[uid];
                                if (!user) return null;

                                const isMe = uid === currentUser?.uid;
                                const originalName = user.name || 'User';
                                const currentNickname = chatData?.nicknames?.[uid] || '';
                                const isEditing = editingUid === uid;

                                return (
                                    <div key={uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${originalName}`} alt="avatar" className="w-10 h-10 rounded-full flex-shrink-0" />
                                            <div className="truncate">
                                                {isEditing ? (
                                                    <div className="flex gap-2 items-center">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={nicknameInput}
                                                            onChange={(e) => setNicknameInput(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname(uid)}
                                                            className="text-sm border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 w-[120px]"
                                                            placeholder="Nickname..."
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                                                            {currentNickname || originalName} {isMe && <span className="text-xs font-normal text-gray-500 ml-1">(You)</span>}
                                                        </p>
                                                        {currentNickname && <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">Real Name: {originalName}</p>}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            {isEditing ? (
                                                <button onClick={() => handleSaveNickname(uid)} className="text-xs font-medium text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-3 py-1.5 rounded-md">Save</button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingUid(uid);
                                                        setNicknameInput(currentNickname || originalName);
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="grid grid-cols-3 gap-2">
                            {messages.filter(m => m.imageUrl && !m.isDeleted).length === 0 ? (
                                <div className="col-span-3 text-center py-8 text-sm text-gray-500 dark:text-slate-400">
                                    No media shared yet
                                </div>
                            ) : (
                                messages.filter(m => m.imageUrl && !m.isDeleted).map((msg, i) => (
                                    <a key={i} href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block aspect-square w-full rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800 hover:opacity-90 transition-opacity">
                                        <img src={msg.imageUrl} alt="Shared media" className="w-full h-full object-cover" />
                                    </a>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'links' && (
                        <div className="space-y-4">
                            {messages.reduce((acc: any[], msg) => {
                                if (msg.isDeleted || !msg.text) return acc;
                                const urlRegex = /(https?:\/\/[^\s]+)/g;
                                const matches = msg.text.match(urlRegex);
                                if (matches) {
                                    matches.forEach((url: string) => {
                                        acc.push({ url, senderId: msg.senderId });
                                    });
                                }
                                return acc;
                            }, []).length === 0 ? (
                                <div className="text-center py-8 text-sm text-gray-500 dark:text-slate-400">
                                    No links shared yet
                                </div>
                            ) : (
                                messages.reduce((acc: any[], msg) => {
                                    if (msg.isDeleted || !msg.text) return acc;
                                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                                    const matches = msg.text.match(urlRegex);
                                    if (matches) {
                                        matches.forEach((url: string) => {
                                            acc.push({ url, senderId: msg.senderId });
                                        });
                                    }
                                    return acc;
                                }, []).map((linkObj: any, i: number) => {
                                    const user = users[linkObj.senderId];
                                    return (
                                        <a key={i} href={linkObj.url} target="_blank" rel="noopener noreferrer" className="flex flex-col p-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate group-hover:underline">{linkObj.url}</span>
                                            <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">Shared by {user?.name || 'User'}</span>
                                        </a>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
