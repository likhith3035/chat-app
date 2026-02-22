import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, USERS_COL } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function Profile() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [saving, setSaving] = useState(false);

    const [avatar, setAvatar] = useState('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIiBjbGFzcz0idy02IGgtNiB0ZXh0LWdyYXktNDAwIj4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xOC42ODYgMjEuMjA4YzEuMzA5IDAgMi4zNzMtMS4wMDkgMi4zNzMtMi4yNTVWMjEuMDljMCAuMDA0LS4wMDIuMDA4LS4wMDMuMDEtLjAxNy4xMS0uMDI3LjIyLS4wNDQuMzI4LS4wMDQuMDMtLjAwNi4wNTktLjAwOS4wODctLjA1My4yMTMtLjExLjQyLS4xNzYuNjItLjAyNi4wOC0uMDUuMTU4LS4wNzguMjM0LS4wNzIuMTk0LS4xNTIuMzgtLjI0LjU1NmwtLjA5My4xODFjLS4wNTYuMTEyLS4xMTQuMjItLjE3NS4zMjVsLS4wNC4wNmMtLjE4Ni4zMTItLjM4Ny42MDUtLjYxLjg3NmwtLjAyOC4wMzRjLS4yMy4yOC0uNDc1LjUyMy0uNzQ2Ljc0NEwyMCAyMGMtLjY3Ni42Ni0xLjA0My4yOTUtMi4zMDUgMS4zMDVsLS43OTcuNjI3Yy0uODYyLjY3OC0xLjgwOC45ODUtMi44MTguOTg1aC0zLjE2Yy0xLjAxIDAtMS45NTUtLjMwNy0yLjgxNy0uOTg1bC0uNzk4LS42MjdjLS44NjEtMS4wMS0xLjYyOC0xLjMwNS0yLjMwNC0xLjMwNWwtLjI1LjI1Yy0uMjc0LjI3NC0uNTU4LjUzNi0uODg4Ljc1NGwtLjAyOC4wMzNjLS4yMjMuMi0uNDIzLjU2NC0uNjEuODc2bC0uMDQuMDZjLS4wNi4xMDQtLjExOS4yMTMtLjE3NS4zMjdsLS4wOTQuMTgyYy0uMDg3LjE3NS0uMTY4LjM2MS0uMjQuNTU1LS4wMjguMDc2LS4wNTMuMTU1LS4wNzguMjMzLS4wNjguMi0uMTI0LjQxNy0uMTc2LjYyMS0uMDA0LjAzLS4wMDYuMDYtLjAwOS4wOS0uMDE3LjEwOC0uMDI3LjIxNy0uMDQ0LjMyOC0uMDAyLjAwMi0uMDAzLjAwNi0uMDAzLjAxIDAgMS4zNTkgMS4wNjUgMi40NTkgMi4zNzMgMi40NTlWMjEuMjA4ek04LjAyMiA5Ljc0N2EzLjM3NSAzLjM3NSAwIDExNi43NSAwIDMuMzc1IDMuMzc1IDAgMDEtNi43NSAwem05LjU2MyAxLjEyOGE1LjYyNSA1LjYyNSAwIDExLTExLjI1IDAgNS42MjUgNS42MjUgMCAwMTExLjI1IDB6IiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIC8+Cjwvc3ZnPgo=');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [mobile, setMobile] = useState('');
    const [gender, setGender] = useState('prefer_not_to_say');

    useEffect(() => {
        if (!currentUser) return;

        const checkUserProfile = async () => {
            try {
                const userDocRef = doc(db, USERS_COL, currentUser.uid);
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists() && docSnap.data().name) {
                    navigate('/chat');
                } else {
                    setLoading(false);
                }
            } catch (error: any) {
                console.error("Error checking user profile:", error);
                setErrorMsg("Error: Cannot connect to database.");
                setLoading(false);
            }
        };

        checkUserProfile();
    }, [currentUser, navigate]);

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
                setErrorMsg("Image is too large! Please select an image under 5MB.");
                return;
            }
            if (!file.type.startsWith("image/")) {
                setErrorMsg("Invalid file type. Please select an image (PNG, JPG).");
                return;
            }

            setErrorMsg("Compressing image...");
            setSaving(true);

            try {
                const compressedDataUrl = await compressAvatarToDataURL(file, 400, 400, 0.8);
                if (compressedDataUrl.length > 500 * 1024) {
                    setErrorMsg("Compressed image is still too large. Please select a simpler image.");
                    return;
                }
                setAvatar(compressedDataUrl);
                setErrorMsg('');
            } catch (err) {
                console.error("Compression error:", err);
                setErrorMsg("Error compressing image.");
            } finally {
                setSaving(false);
            }
        }
    };

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim().length < 3) {
            setErrorMsg("Display Name must be at least 3 characters.");
            return;
        }

        setSaving(true);
        setErrorMsg('');

        try {
            const profileData = {
                name,
                email: currentUser?.email,
                age: age || null,
                mobile: mobile || null,
                gender: gender || null,
                avatarUrl: avatar
            };

            if (currentUser) {
                const userDocRef = doc(db, USERS_COL, currentUser.uid);
                await setDoc(userDocRef, profileData, { merge: true });
                navigate('/chat');
            }
        } catch (error: any) {
            console.error("Error saving profile:", error);
            setErrorMsg(`Error: ${error.message}`);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-50">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600 text-lg">Loading Profile...</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 flex items-center justify-center min-h-[100dvh] p-4">
            <div className="w-full max-w-4xl">
                <form onSubmit={handleProfileSave}>
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">

                        {/* Left Panel */}
                        <div className="w-full md:w-1/3 bg-gray-50 p-8 sm:p-12 flex flex-col items-center justify-center space-y-6">

                            <div className="flex flex-col items-center text-center">
                                <label htmlFor="avatar-input" className="cursor-pointer">
                                    <img
                                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 hover:border-blue-400 transition-all"
                                        src={avatar}
                                        alt="Avatar Preview"
                                    />
                                </label>
                                <p className="text-sm text-gray-500 mt-2">Click to upload a photo</p>
                                <input
                                    type="file"
                                    id="avatar-input"
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                    onChange={handleAvatarChange}
                                />
                            </div>

                            <div className="w-full">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Display Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="w-full">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    className="mt-1 block w-full px-4 py-3 bg-gray-200 border border-gray-300 rounded-lg shadow-sm text-gray-500 cursor-not-allowed"
                                    readOnly
                                    value={currentUser?.email || ''}
                                />
                            </div>

                        </div>

                        {/* Right Panel */}
                        <div className="w-full md:w-2/3 p-8 sm:p-12 flex flex-col justify-center space-y-6">
                            <div className="text-center md:text-left">
                                <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Profile</h1>
                                <p className="text-gray-500 mb-8">Just a few more details to get started.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                                    <input
                                        type="number"
                                        id="age"
                                        className="mt-1 block w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        min="13"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">Mobile</label>
                                    <input
                                        type="tel"
                                        id="mobile"
                                        className="mt-1 block w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                                <select
                                    id="gender"
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

                            {errorMsg && <p className="text-sm text-center text-red-500">{errorMsg}</p>}

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save & Continue'}
                            </button>

                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
