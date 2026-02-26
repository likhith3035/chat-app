/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, rtdb, USERS_COL, CHATS_COL, APPEALS_COL, ADMIN_EMAILS } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth as firebaseAuth } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, setDoc, getDocs, limit, writeBatch } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';

export default function Admin() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [globalMessage, setGlobalMessage] = useState({ text: '', type: '' });

    // Stats
    const [totalUsers, setTotalUsers] = useState(0);
    const [onlineUsersCount, setOnlineUsersCount] = useState(0);
    const [totalChats, setTotalChats] = useState(0);

    // Data
    const [users, setUsers] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    const [appeals, setAppeals] = useState<any[]>([]);

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Sorting
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Modals
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const [banModalOpen, setBanModalOpen] = useState(false);
    const [banningUser, setBanningUser] = useState<any>(null);

    const [deleteChatModalOpen, setDeleteChatModalOpen] = useState(false);
    const [deletingChat, setDeletingChat] = useState<any>(null);

    const [removePhotoModalOpen, setRemovePhotoModalOpen] = useState(false);
    const [removingPhotoUser, setRemovingPhotoUser] = useState<any>(null);

    const [inspectModalOpen, setInspectModalOpen] = useState(false);
    const [inspectingChat, setInspectingChat] = useState<any>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);

    useEffect(() => {
        if (!currentUser) return;

        if (!ADMIN_EMAILS.includes(currentUser.email || '')) {
            setAccessDenied(true);
            setLoading(false);
            return;
        }

        setLoading(false);

        const unsubUsers = onSnapshot(collection(db, USERS_COL), (snapshot) => {
            setTotalUsers(snapshot.size);
            const usersData: any[] = [];
            snapshot.forEach(doc => usersData.push({ uid: doc.id, ...doc.data() }));
            setUsers(usersData);
        });

        const unsubStatus = onValue(ref(rtdb, '/status'), (snapshot) => {
            const data = snapshot.val() || {};
            const count = Object.values(data).filter((s: any) => s.isOnline || s.state === 'online').length;
            setOnlineUsersCount(count);
        });

        const unsubChats = onSnapshot(collection(db, CHATS_COL), (snapshot) => {
            setTotalChats(snapshot.size);
            const chatsData: any[] = [];
            snapshot.forEach(doc => chatsData.push({ id: doc.id, ...doc.data() }));
            setChats(chatsData);
        });

        const qAppeals = query(collection(db, APPEALS_COL), orderBy("timestamp", "desc"));
        const unsubAppeals = onSnapshot(qAppeals, (snapshot) => {
            const appealsData: any[] = [];
            snapshot.forEach(doc => appealsData.push({ id: doc.id, ...doc.data() }));
            setAppeals(appealsData);
        });

        return () => {
            unsubUsers();
            unsubStatus();
            unsubChats();
            unsubAppeals();
        };
    }, [currentUser]);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setGlobalMessage({ text, type });
        setTimeout(() => setGlobalMessage({ text: '', type: '' }), 5000);
    };

    const handleLogout = async () => {
        await firebaseAuth.signOut();
        navigate('/');
    };

    const handleResetPassword = async (email: string) => {
        if (!email) return;
        try {
            await sendPasswordResetEmail(firebaseAuth, email);
            showMessage(`Password reset email sent to ${email}.`, 'success');
        } catch (error: any) {
            showMessage(error.message, 'error');
        }
    };

    // Bulk Actions
    const handleClearResolvedAppeals = async () => {
        if (!window.confirm("Are you sure you want to delete all resolved appeals?")) return;
        try {
            const batch = writeBatch(db);
            const resolvedAppeals = appeals.filter(a => a.status === 'resolved');
            resolvedAppeals.forEach(a => {
                batch.delete(doc(db, APPEALS_COL, a.id));
            });
            await batch.commit();
            showMessage(`Cleared ${resolvedAppeals.length} resolved appeals.`, 'success');
        } catch (err: any) {
            showMessage(err.message, 'error');
        }
    };

    const handleExportCSV = () => {
        const headers = ["User ID,Name,Email,Mobile,Status\n"];
        const rows = filteredAndSortedUsers.map(u =>
            `"${u.uid}","${(u.name || '').replace(/"/g, '""')}","${u.email}","${u.mobile || ''}","${u.isBanned ? 'Banned' : 'Active'}"\n`
        );
        const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "users_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showMessage("Exported users to CSV.", "success");
    };

    const handleInspectChat = async (chatId: string, chatName: string) => {
        setInspectingChat({ id: chatId, name: chatName });
        setInspectModalOpen(true);
        setChatMessages([]);
        try {
            const q = query(collection(db, CHATS_COL, chatId, "messages"), orderBy("timestamp", "desc"), limit(50));
            const snapshot = await getDocs(q);
            const msgs: any[] = [];
            snapshot.forEach(d => msgs.push({ id: d.id, ...d.data() }));
            setChatMessages(msgs.reverse());
        } catch (err: any) {
            showMessage(err.message, 'error');
        }
    };

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Derived states
    const filteredAndSortedUsers = users.filter(u => {
        const matchesSearch = (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || u.uid.includes(searchTerm));
        const matchesStatus = statusFilter === 'All' ? true : statusFilter === 'Active' ? !u.isBanned : u.isBanned;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        let valA = a[sortColumn] || '';
        let valB = b[sortColumn] || '';
        if (sortColumn === 'status') {
            valA = a.isBanned ? 'Banned' : 'Active';
            valB = b.isBanned ? 'Banned' : 'Active';
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    // Check state loading
    if (loading) {
        return (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-50">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600 text-lg">Loading Admin Panel...</p>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-center p-4 bg-gray-100">
                <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
                <p className="text-lg text-gray-700">You do not have permission to view this page.</p>
                <button onClick={() => navigate('/')} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Login</button>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen">
            <nav className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center py-3 sm:py-0 sm:h-16 gap-3 sm:gap-0">
                        <div className="flex items-center justify-between w-full sm:w-auto">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">L Chat Admin</h1>
                            <button onClick={() => navigate('/chat')} className="ml-4 sm:ml-6 px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-md hover:bg-blue-700">
                                &larr; <span className="hidden sm:inline">Back</span><span className="hidden md:inline"> to Dashboard</span><span className="sm:hidden">Back</span>
                            </button>
                        </div>
                        <div className="flex items-center w-full sm:w-auto justify-end">
                            <p className="hidden sm:block text-gray-600 mr-4 truncate flex-1 md:max-w-none text-sm md:text-base text-right">Logged in as <span className="font-medium">{currentUser?.email}</span></p>
                            <button onClick={handleLogout} className="px-3 py-2 bg-red-500 text-white text-xs sm:text-sm rounded-md hover:bg-red-600">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {globalMessage.text && (
                    <div className={`mb-4 p-4 rounded-md text-sm ${globalMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {globalMessage.text}
                    </div>
                )}

                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Dashboard Stats</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white shadow-xl rounded-lg p-6 flex items-center">
                        <div className="bg-blue-500 p-3 rounded-full text-white">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 uppercase">Total Users</p>
                            <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
                        </div>
                    </div>
                    <div className="bg-white shadow-xl rounded-lg p-6 flex items-center">
                        <div className="bg-green-500 p-3 rounded-full text-white">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.07 0a5 5 0 010 7.07m-3.535-3.535a1 1 0 111.414 1.414 1 1 0 01-1.414-1.414z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 uppercase">Online Users</p>
                            <p className="text-3xl font-bold text-gray-900">{onlineUsersCount}</p>
                        </div>
                    </div>
                    <div className="bg-white shadow-xl rounded-lg p-6 flex items-center">
                        <div className="bg-purple-500 p-3 rounded-full text-white">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 uppercase">Total Chats</p>
                            <p className="text-3xl font-bold text-gray-900">{totalChats}</p>
                        </div>
                    </div>
                </div>

                {/* Ban Appeals */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-900">Ban Appeals</h2>
                    <button onClick={handleClearResolvedAppeals} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">Clear Resolved</button>
                </div>
                <div className="bg-white shadow-xl rounded-lg overflow-x-auto mb-8">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {appeals.map(appeal => (
                                <tr key={appeal.id} className={`hover:bg-gray-50 ${appeal.status === 'resolved' ? 'bg-gray-100 opacity-60' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{appeal.userEmail || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs whitespace-pre-wrap">{appeal.message}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appeal.timestamp ? new Date(appeal.timestamp.seconds * 1000).toLocaleString() : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {appeal.status === 'resolved' ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Resolved</span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                                        {appeal.status === 'pending' && (
                                            <>
                                                <button className="text-green-600 hover:text-green-900" onClick={async () => {
                                                    try {
                                                        await updateDoc(doc(db, USERS_COL, appeal.userId), { isBanned: false });
                                                        await updateDoc(doc(db, APPEALS_COL, appeal.id), { status: 'resolved' });
                                                        showMessage('User has been unbanned and appeal is resolved.', 'success');
                                                    } catch (err: any) { showMessage(err.message, 'error') }
                                                }}>Unban & Resolve</button>
                                                <button className="text-gray-600 hover:text-gray-900" onClick={async () => {
                                                    try { await updateDoc(doc(db, APPEALS_COL, appeal.id), { status: 'resolved' }); showMessage('Appeal marked resolved', 'success') }
                                                    catch (err: any) { showMessage(err.message, 'error') }
                                                }}>Mark Resolved</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Users */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 md:gap-0">
                    <h2 className="text-2xl font-semibold text-gray-900">User Management</h2>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <input type="text" placeholder="Search users..." className="flex-1 md:flex-none px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        <select className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Banned">Banned</option>
                        </select>
                        <button onClick={handleExportCSV} className="w-full sm:w-auto px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium">Export CSV</button>
                    </div>
                </div>
                <div className="bg-white shadow-xl rounded-lg overflow-x-auto mb-8">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">User {sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                <th onClick={() => handleSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">Status {sortColumn === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => handleSort('uid')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">User ID {sortColumn === 'uid' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAndSortedUsers.map(u => (
                                <tr key={u.uid} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full object-cover" src={u.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=random'} alt="avatar" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{u.name || 'N/A'}</div>
                                                <div className="text-sm text-gray-500">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{u.mobile || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {u.isBanned ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Banned</span>
                                            : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 truncate max-w-[100px]">{u.uid}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                                        <button className="text-blue-600 hover:text-blue-900" onClick={() => { setEditingUser(u); setEditModalOpen(true); }}>Edit</button>
                                        <button className="text-yellow-600 hover:text-yellow-900" onClick={() => handleResetPassword(u.email)}>Reset Pass</button>
                                        <button className="text-orange-600 hover:text-orange-900" onClick={() => { setRemovingPhotoUser(u); setRemovePhotoModalOpen(true); }}>Remove Photo</button>
                                        <button className={u.isBanned ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}
                                            onClick={() => { setBanningUser(u); setBanModalOpen(true); }}>
                                            {u.isBanned ? 'Unban' : 'Ban'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Chats */}
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Chat Room Management</h2>
                <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chat Name / Participants</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Message</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chat ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {chats.map(room => {
                                let chatName = 'N/A';
                                let chatType = 'N/A';

                                if (room.type === 'group') {
                                    chatName = room.groupName || 'Group Chat';
                                    chatType = room.public ? 'Public Room' : 'Group Chat';
                                } else if (room.type === 'one_on_one') {
                                    const partnerId = room.participants.find((uid: string) => uid !== (currentUser?.uid || ''));
                                    const partner = users.find(u => u.uid === partnerId);
                                    chatName = partner ? `Chat with ${partner.name}` : '1-on-1 Chat';
                                    chatType = '1-on-1';
                                }

                                return (
                                    <tr key={room.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{chatName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{chatType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-[200px]">{room.lastMessage || '...'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 truncate max-w-[100px]">{room.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                                            <button className="text-blue-600 hover:text-blue-900" onClick={() => handleInspectChat(room.id, chatName)}>Inspect</button>
                                            <button className="text-red-600 hover:text-red-900" onClick={() => { setDeletingChat({ id: room.id, name: chatName }); setDeleteChatModalOpen(true); }}>Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* --- MODALS --- */}
            {editModalOpen && editingUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-30 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                        <h3 className="text-xl font-medium text-gray-900 mb-4">Edit Profile: {editingUser.name || editingUser.email}</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                await setDoc(doc(db, USERS_COL, editingUser.uid), {
                                    name: editingUser.name,
                                    age: editingUser.age || null,
                                    mobile: editingUser.mobile || null,
                                    gender: editingUser.gender || null
                                }, { merge: true });
                                showMessage('User profile updated successfully.', 'success');
                                setEditModalOpen(false);
                            } catch (err: any) { alert(err.message) }
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Display Name</label>
                                <input type="text" className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm"
                                    value={editingUser.name || ''} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email (Read-only)</label>
                                <input type="email" className="mt-1 block w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
                                    readOnly value={editingUser.email} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Age</label>
                                    <input type="number" className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
                                        value={editingUser.age || ''} onChange={e => setEditingUser({ ...editingUser, age: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                                    <input type="tel" className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
                                        value={editingUser.mobile || ''} onChange={e => setEditingUser({ ...editingUser, mobile: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Gender</label>
                                <select className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
                                    value={editingUser.gender || 'prefer_not_to_say'} onChange={e => setEditingUser({ ...editingUser, gender: e.target.value })}>
                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {banModalOpen && banningUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-30 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-medium text-gray-900">{banningUser.isBanned ? 'Confirm Unban' : 'Confirm Ban'}</h3>
                        <p className="text-gray-600 mt-2">Do you really want to {banningUser.isBanned ? 'unban' : 'ban'} <span className="font-bold">{banningUser.name || banningUser.uid}</span>?</p>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button type="button" onClick={() => setBanModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md">Cancel</button>
                            <button type="button" onClick={async () => {
                                try {
                                    await updateDoc(doc(db, USERS_COL, banningUser.uid), { isBanned: !banningUser.isBanned });
                                    showMessage(!banningUser.isBanned ? 'User banned successfully' : 'User unbanned successfully', 'success');
                                    setBanModalOpen(false);
                                } catch (err: any) { showMessage(err.message, 'error') }
                            }} className={`px-4 py-2 text-white rounded-md ${banningUser.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {banningUser.isBanned ? 'Confirm Unban' : 'Confirm Ban'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteChatModalOpen && deletingChat && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-30 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-medium text-gray-900">Are you sure?</h3>
                        <p className="text-gray-600 mt-2">Do you really want to delete the chat <span className="font-bold">{deletingChat.name}</span>?</p>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button type="button" onClick={() => setDeleteChatModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
                            <button type="button" onClick={async () => {
                                try {
                                    await deleteDoc(doc(db, CHATS_COL, deletingChat.id));
                                    showMessage('Chat deleted successfully', 'success');
                                    setDeleteChatModalOpen(false);
                                } catch (err: any) { showMessage(err.message, 'error') }
                            }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete Chat</button>
                        </div>
                    </div>
                </div>
            )}

            {removePhotoModalOpen && removingPhotoUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-30 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-medium text-gray-900">Are you sure?</h3>
                        <p className="text-gray-600 mt-2">Do you really want to remove the profile photo for <span className="font-bold">{removingPhotoUser.name}</span>?</p>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button type="button" onClick={() => setRemovePhotoModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md">Cancel</button>
                            <button type="button" onClick={async () => {
                                try {
                                    await updateDoc(doc(db, USERS_COL, removingPhotoUser.uid), { avatarUrl: null });
                                    showMessage('User profile photo removed.', 'success');
                                    setRemovePhotoModalOpen(false);
                                } catch (err: any) { showMessage(err.message, 'error') }
                            }} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">Remove Photo</button>
                        </div>
                    </div>
                </div>
            )}

            {inspectModalOpen && inspectingChat && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-30 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-medium text-gray-900">Inspect Chat: {inspectingChat.name}</h3>
                            <button onClick={() => setInspectModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-md border border-gray-200 space-y-3">
                            {chatMessages.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No recent messages found.</p>
                            ) : (
                                chatMessages.map(msg => (
                                    <div key={msg.id} className="bg-white p-3 rounded shadow-sm border border-gray-100 flex flex-col">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span className="font-semibold text-gray-700">{msg.senderName || msg.senderId}</span>
                                            <span>{msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : ''}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{msg.text || (msg.imageUrl ? '[Image Message]' : '')}</p>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button type="button" onClick={() => setInspectModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
