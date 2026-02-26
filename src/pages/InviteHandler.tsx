import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, CHATS_COL } from '../firebase';

export default function InviteHandler() {
    const { uid } = useParams<{ uid: string }>(); // The ID of the user who sent the invite
    const navigate = useNavigate();
    const { currentUser, loading: authLoading } = useAuth();
    const { conversations } = useChat();

    const [status, setStatus] = useState('Verifying invite link...');
    const [error, setError] = useState('');

    useEffect(() => {
        // Wait for auth to resolve
        if (authLoading) return;

        // If no UID is provided, this is an invalid link
        if (!uid) {
            setError('Invalid invite link.');
            return;
        }

        // If the user isn't logged in, save the invite and redirect to login
        if (!currentUser) {
            setStatus('Redirecting to login...');
            localStorage.setItem('pending_invite_uid', uid);
            navigate('/', { replace: true });
            return;
        }

        // You can't invite yourself
        if (currentUser.uid === uid) {
            setError("You can't use your own invite link.");
            setTimeout(() => navigate('/chat', { replace: true }), 2000);
            return;
        }

        // Check if the user trying to be invited actually exists
        // (Note: users context might take a moment to load, we assume optimistic success or fallback)
        async function handleInviteFlow() {
            try {
                setStatus('Looking for existing chat...');

                // 1. Check if a direct chat ALREADY exists with this user
                const existingChat = conversations.find(chat =>
                    chat.type === 'direct' &&
                    chat.participants.includes(uid as string) &&
                    chat.participants.includes(currentUser!.uid)
                );

                if (existingChat) {
                    setStatus('Opening chat...');
                    navigate('/chat', { state: { chatId: existingChat.id }, replace: true });
                    return;
                }

                // 2. If it doesn't exist, CREATE a new direct chat
                setStatus('Creating new chat connection...');
                const chatData = {
                    type: 'direct',
                    participants: [currentUser!.uid, uid],
                    lastMessage: 'Chat started',
                    lastMessageTime: serverTimestamp(),
                };

                const docRef = await addDoc(collection(db, CHATS_COL), chatData);

                setStatus('Opening chat...');
                navigate('/chat', { state: { chatId: docRef.id }, replace: true });

            } catch (err: any) {
                console.error("Error handling invite link:", err);
                setError('Failed to process invite link.');
            }
        }

        handleInviteFlow();

    }, [uid, currentUser, authLoading, navigate, conversations]);

    return (
        <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-8 text-center border border-gray-100 dark:border-white/5">
                <div className="flex justify-center mb-6">
                    {/* Chat Bubble Icon */}
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">
                    Chat Invite
                </h2>

                {error ? (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                        {error}
                        <button
                            onClick={() => navigate('/')}
                            className="mt-4 w-full block bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 py-2 rounded-lg font-medium transition"
                        >
                            Go Home
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center mt-4">
                        {/* Spinner */}
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600 dark:text-slate-400 font-medium">{status}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
