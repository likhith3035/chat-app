import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, CHATS_COL } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface NewRoomModalProps {
    onClose: () => void;
    onRoomCreated: (shareableLink: string) => void;
}

export default function NewRoomModal({ onClose, onRoomCreated }: NewRoomModalProps) {
    const { currentUser } = useAuth();

    const [roomName, setRoomName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateRoom = async () => {
        if (!roomName.trim() || !currentUser) {
            setErrorMsg("Room Name cannot be empty.");
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            const roomData = {
                type: 'group',
                groupName: roomName,
                public: true,
                participants: [currentUser.uid],
                lastUpdated: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, CHATS_COL), roomData);

            const shareableLink = `${window.location.origin}/chat?join=${docRef.id}`;
            onRoomCreated(shareableLink);
            onClose();

        } catch (error: any) {
            console.error("Error creating room:", error);
            setErrorMsg(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600/75 dark:bg-black/60 flex items-center justify-center z-40 p-4">
            <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-white/10 rounded-xl shadow-2xl w-full max-w-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-slate-100">Create Public Room</h2>
                <input
                    type="text"
                    placeholder="Room Name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-2 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                />
                {errorMsg && <p className="text-xs text-red-500 mb-4">{errorMsg}</p>}

                <div className="flex justify-end space-x-3 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateRoom}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Room & Get Link'}
                    </button>
                </div>
            </div>
        </div>
    );
}
