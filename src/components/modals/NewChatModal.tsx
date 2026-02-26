import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { db, CHATS_COL, USERS_COL } from '../../firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';

interface UserInfo {
    uid: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    isBanned?: boolean;
}

interface NewChatModalProps {
    onClose: () => void;
    onChatCreated: (chatId: string) => void;
}

export default function NewChatModal({ onClose, onChatCreated }: NewChatModalProps) {
    const { currentUser } = useAuth();
    const { users: contextUsers } = useChat();

    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
    const [fetchingUsers, setFetchingUsers] = useState(true);

    // Fetch ALL users from Firestore on mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersRef = collection(db, USERS_COL);
                const snapshot = await getDocs(usersRef);
                const fetched: UserInfo[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    fetched.push({
                        uid: doc.id,
                        name: data.name || data.displayName || '',
                        email: data.email || '',
                        avatarUrl: data.avatarUrl || data.photoURL || '',
                        isBanned: data.isBanned || false,
                    });
                });
                setAllUsers(fetched);
            } catch (err) {
                console.error('Error fetching users:', err);
                // Fallback to context users
                setAllUsers(Object.values(contextUsers).map(u => ({
                    ...u,
                    email: (u as any).email || '',
                })));
            } finally {
                setFetchingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    // Filter: exclude self, banned, and apply search
    const filteredUsers = allUsers.filter(u => {
        if (u.uid === currentUser?.uid || u.isBanned) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (u.name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
        );
    });

    const toggleUserSelection = (uid: string) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(uid)) {
            newSet.delete(uid);
        } else {
            newSet.add(uid);
        }
        setSelectedUsers(newSet);
    };

    const isGroup = selectedUsers.size > 1;

    const handleCreateChat = async () => {
        if (selectedUsers.size === 0 || !currentUser) return;

        setLoading(true);
        try {
            const participants = [currentUser.uid, ...Array.from(selectedUsers)];

            const chatData: any = {
                participants,
                type: isGroup ? 'group' : 'one_on_one',
                lastUpdated: serverTimestamp(),
            };

            if (isGroup) {
                chatData.groupName = groupName || 'New Group';
            }

            const docRef = await addDoc(collection(db, CHATS_COL), chatData);
            onChatCreated(docRef.id);
            onClose();
        } catch (error) {
            console.error("Error creating chat:", error);
            alert("Failed to create chat");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600/75 dark:bg-black/60 flex items-center justify-center z-40 p-4">
            <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-slate-100">New Chat</h2>

                {/* Search input */}
                <div className="relative mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-800 text-sm placeholder-gray-400 dark:placeholder-slate-500"
                        autoFocus
                    />
                </div>

                {/* Selected users chips */}
                {selectedUsers.size > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {Array.from(selectedUsers).map(uid => {
                            const u = allUsers.find(x => x.uid === uid);
                            return (
                                <span key={uid} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                    {u?.name || 'User'}
                                    <button onClick={() => toggleUserSelection(uid)} className="hover:text-red-500">×</button>
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* User list */}
                <div className="max-h-60 overflow-y-auto mb-4 border border-gray-200 dark:border-white/10 rounded-lg shadow-inner dark:bg-slate-900 custom-scrollbar-light dark:custom-scrollbar-dark">
                    {fetchingUsers ? (
                        <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                            {searchQuery ? `No users found for "${searchQuery}"` : 'No users available'}
                        </div>
                    ) : (
                        filteredUsers.map(user => (
                            <div
                                key={user.uid}
                                onClick={() => toggleUserSelection(user.uid)}
                                className={`flex items-center p-3 cursor-pointer border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${selectedUsers.has(user.uid) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                                <img
                                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=random`}
                                    alt="Avatar"
                                />
                                <div className="ml-3 flex-grow min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{user.name || 'Unknown'}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                    {selectedUsers.has(user.uid) ? (
                                        <div className="bg-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-white">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-500"></div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {isGroup && (
                    <input
                        type="text"
                        placeholder="Group Name (optional)"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-2 text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder-gray-400 dark:placeholder-slate-500"
                    />
                )}

                <p className={`text-xs text-gray-500 dark:text-slate-400 mb-4 ${!isGroup ? 'hidden' : ''}`}>
                    Selecting multiple users creates a group chat.
                </p>

                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateChat}
                        disabled={selectedUsers.size === 0 || loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Starting...' : 'Start Chat'}
                    </button>
                </div>
            </div>
        </div>
    );
}
