import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { db, USERS_COL } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ProfilePanelProps {
    onClose: () => void;
}

export default function ProfilePanel({ onClose }: ProfilePanelProps) {
    const { currentUser } = useAuth();
    const { users } = useChat();

    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const myData = currentUser ? users[currentUser.uid] : null;

    const [avatar, setAvatar] = useState(myData?.avatarUrl || '');
    const [name, setName] = useState(myData?.name || '');
    const [age, setAge] = useState('');
    const [mobile, setMobile] = useState('');
    const [gender, setGender] = useState('prefer_not_to_say');

    // Load full profile data from Firestore on mount
    useEffect(() => {
        if (!currentUser) return;

        const loadProfile = async () => {
            try {
                const userDocRef = doc(db, USERS_COL, currentUser.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setName(data.name || '');
                    setAge(data.age || '');
                    setMobile(data.mobile || '');
                    setGender(data.gender || 'prefer_not_to_say');
                    setAvatar(data.avatarUrl || '');
                }
            } catch (err) {
                console.error('Error loading profile:', err);
            }
        };

        loadProfile();
    }, [currentUser]);

    const compressAvatarToDataURL = (file: File, maxWidth = 400, maxHeight = 400, quality = 0.8): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) ctx.drawImage(img, 0, 0, width, height);

                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = error => reject(error);
                img.src = event?.target?.result as string;
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setErrorMsg('Image is too large! Please select an image under 5MB.');
                return;
            }
            if (!file.type.startsWith('image/')) {
                setErrorMsg('Invalid file type. Please select an image (PNG, JPG).');
                return;
            }

            setErrorMsg('Compressing image...');
            setSaving(true);

            try {
                const compressedDataUrl = await compressAvatarToDataURL(file, 400, 400, 0.8);
                if (compressedDataUrl.length > 500 * 1024) {
                    setErrorMsg('Compressed image is still too large. Please select a simpler image.');
                    return;
                }
                setAvatar(compressedDataUrl);
                setErrorMsg('');
            } catch (err) {
                console.error('Compression error:', err);
                setErrorMsg('Error compressing image.');
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim().length < 3) {
            setErrorMsg('Display Name must be at least 3 characters.');
            return;
        }

        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const profileData = {
                name,
                email: currentUser?.email,
                age: age || null,
                mobile: mobile || null,
                gender: gender || null,
                avatarUrl: avatar,
            };

            if (currentUser) {
                const userDocRef = doc(db, USERS_COL, currentUser.uid);
                await setDoc(userDocRef, profileData, { merge: true });
                setSuccessMsg('Profile saved successfully!');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (error: any) {
            console.error('Error saving profile:', error);
            setErrorMsg(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm flex items-center flex-shrink-0">
                <button onClick={onClose} title="Back to Chat" className="p-1 rounded-full text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h3 className="text-xl font-semibold text-gray-800">Edit Profile</h3>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-grow overflow-y-auto p-6">
                <form onSubmit={handleSave} className="max-w-md mx-auto space-y-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center">
                        <label htmlFor="profile-avatar-input" className="cursor-pointer">
                            <img
                                className="w-28 h-28 rounded-full object-cover border-4 border-gray-200 hover:border-blue-400 transition-all"
                                src={avatar || `https://ui-avatars.com/api/?name=${name || 'User'}&background=random`}
                                alt="Avatar"
                            />
                        </label>
                        <p className="text-sm text-gray-500 mt-2">Click to change photo</p>
                        <input
                            type="file"
                            id="profile-avatar-input"
                            className="hidden"
                            accept="image/png, image/jpeg"
                            onChange={handleAvatarChange}
                        />
                    </div>

                    {/* Display Name */}
                    <div>
                        <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">Display Name</label>
                        <input
                            type="text"
                            id="profile-name"
                            className="mt-1 block w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Email (read-only) */}
                    <div>
                        <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            id="profile-email"
                            className="mt-1 block w-full px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg shadow-sm text-gray-500 cursor-not-allowed"
                            readOnly
                            value={currentUser?.email || ''}
                        />
                    </div>

                    {/* Age & Mobile in row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="profile-age" className="block text-sm font-medium text-gray-700">Age</label>
                            <input
                                type="number"
                                id="profile-age"
                                className="mt-1 block w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                min="13"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="profile-mobile" className="block text-sm font-medium text-gray-700">Mobile</label>
                            <input
                                type="tel"
                                id="profile-mobile"
                                className="mt-1 block w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Gender */}
                    <div>
                        <label htmlFor="profile-gender" className="block text-sm font-medium text-gray-700">Gender</label>
                        <select
                            id="profile-gender"
                            className="mt-1 block w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                        >
                            <option value="prefer_not_to_say">Prefer not to say</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Error / Success Messages */}
                    {errorMsg && <p className="text-sm text-center text-red-500">{errorMsg}</p>}
                    {successMsg && <p className="text-sm text-center text-green-500">{successMsg}</p>}

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}
