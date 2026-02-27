import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, USERS_COL } from '../../firebase';

interface ProfileModalProps {
    onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
    const { currentUser } = useAuth();
    const { users } = useChat();
    const userData = currentUser ? users[currentUser.uid] : null;

    const [statusText, setStatusText] = useState(userData?.customStatus || '');
    const [wallpaper, setWallpaper] = useState(userData?.chatWallpaper || '');
    const [isSaving, setIsSaving] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);

    const inviteLink = currentUser ? `${window.location.origin}/invite/${currentUser.uid}` : '';

    const WALLPAPERS = [
        { id: 'default', name: 'Default', value: '' },
        { id: 'doodle', name: 'Doodle Pattern', value: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' },
        { id: 'stars', name: 'Night Stars', value: 'url("https://www.transparenttextures.com/patterns/stardust.png")' },
        { id: 'blue', name: 'Soft Blue', value: '#e0f2fe' },
        { id: 'green', name: 'Soft Green', value: '#dcfce7' },
    ];

    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, USERS_COL, currentUser.uid), {
                customStatus: statusText.trim(),
                chatWallpaper: wallpaper
            });
            onClose();
        } catch (error) {
            console.error('Error saving status:', error);
            alert('Failed to save status.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!userData) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Edit Profile</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center">
                    <img
                        src={userData.avatarUrl || `https://ui-avatars.com/api/?name=${userData.name}&background=random`}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover shadow-md mb-4 border-4 border-white dark:border-slate-800"
                    />
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{userData.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">{userData.email}</p>

                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Custom Status
                        </label>
                        <input
                            type="text"
                            value={statusText}
                            onChange={(e) => setStatusText(e.target.value)}
                            placeholder="e.g. At work 💻, In a meeting..."
                            maxLength={50}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-slate-800/50 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 transition-all"
                        />
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-2 text-right">
                            {statusText.length}/50
                        </p>

                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 mt-4">
                            Chat Wallpaper
                        </label>
                        <select
                            value={wallpaper}
                            onChange={(e) => setWallpaper(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-slate-800/50 dark:text-slate-100 transition-all text-sm mb-2"
                        >
                            {WALLPAPERS.map(wp => (
                                <option key={wp.id} value={wp.value}>{wp.name}</option>
                            ))}
                        </select>

                        {/* Chat Invite Link Section */}
                        <div className="mt-6 border-t border-gray-100 dark:border-white/5 pt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                Your Chat Invite Link
                            </label>
                            <div className="flex bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <input
                                    type="text"
                                    readOnly
                                    value={inviteLink}
                                    className="flex-grow bg-transparent px-3 py-2 text-sm text-gray-600 dark:text-slate-400 outline-none truncate"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(inviteLink);
                                        setCopiedInvite(true);
                                        setTimeout(() => setCopiedInvite(false), 2000);
                                    }}
                                    className="px-4 py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors border-l border-gray-200 dark:border-slate-700"
                                >
                                    {copiedInvite ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                                Share this link to let anyone start a direct chat with you instantly!
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-lg shadow-sm transition-colors flex items-center justify-center min-w-[100px]"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            'Save'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
