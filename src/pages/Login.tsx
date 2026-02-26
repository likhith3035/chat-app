import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from 'firebase/auth';
import './Login.css';

type FormType = 'login' | 'signup' | 'forgot';

export default function Login() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [activeForm, setActiveForm] = useState<FormType>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        if (currentUser) {
            const pendingInvite = localStorage.getItem('pending_invite_uid');
            if (pendingInvite) {
                localStorage.removeItem('pending_invite_uid');
                navigate(`/invite/${pendingInvite}`);
            } else {
                navigate('/profile');
            }
        }
    }, [currentUser, navigate]);

    const clearMessages = () => {
        setErrorMsg('');
        setSuccessMsg('');
    };

    const switchForm = (form: FormType) => {
        setActiveForm(form);
        clearMessages();
        setEmail('');
        setPassword('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            setErrorMsg(error.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            setErrorMsg(error.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        clearMessages();
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg("Reset link sent! Check your email.");
        } catch (error: any) {
            setErrorMsg(error.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        clearMessages();
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        try {
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            if (error.code !== 'auth/popup-closed-by-user') {
                setErrorMsg(error.message.replace('Firebase: ', ''));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="card">
                <input
                    value=""
                    className="blind-check"
                    type="checkbox"
                    id="blind-input"
                    hidden
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                />

                {activeForm !== 'forgot' && (
                    <label
                        htmlFor="blind-input"
                        className="blind_input"
                        style={{ bottom: activeForm === 'login' ? '266px' : '160px' }}
                    >
                        <span className="hide">Hide</span>
                        <span className="show">Show</span>
                    </label>
                )}

                {/* Login Form */}
                <div id="login-container" className={`form-container ${activeForm !== 'login' ? 'hidden' : ''}`}>
                    <form onSubmit={handleLogin} className="form">
                        <div className="title">Sign In</div>

                        <label className="label_input" htmlFor="login-email-input">Email</label>
                        <input
                            spellCheck="false"
                            className="input"
                            type="email"
                            id="login-email-input"
                            required
                            value={activeForm === 'login' ? email : ''}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <div className="frg_pss">
                            <label className="label_input" htmlFor="login-password-input">Password</label>
                            <a href="#" onClick={(e) => { e.preventDefault(); switchForm('forgot'); }}>Forgot password?</a>
                        </div>
                        <input
                            spellCheck="false"
                            className="input"
                            type={showPassword ? 'text' : 'password'}
                            id="login-password-input"
                            required
                            value={activeForm === 'login' ? password : ''}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' } as any}
                        />

                        <p className="form-message error">{errorMsg}</p>

                        <button className="submit" type="submit" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>

                        <div className="divider"><span>or</span></div>

                        <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                <path fill="none" d="M0 0h48v48H0z" />
                            </svg>
                            <span>Sign in with Google</span>
                        </button>

                        <p className="form-footer">
                            Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchForm('signup'); }}>Sign Up</a>
                        </p>
                    </form>
                </div>

                {/* Signup Form */}
                <div id="signup-container" className={`form-container ${activeForm !== 'signup' ? 'hidden' : ''}`}>
                    <form onSubmit={handleSignup} className="form">
                        <div className="title">Create Account</div>

                        <label className="label_input" htmlFor="signup-email-input">Email</label>
                        <input
                            spellCheck="false"
                            className="input"
                            type="email"
                            id="signup-email-input"
                            required
                            value={activeForm === 'signup' ? email : ''}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <label className="label_input" htmlFor="signup-password-input">Password</label>
                        <input
                            spellCheck="false"
                            className="input"
                            type={showPassword ? 'text' : 'password'}
                            id="signup-password-input"
                            required
                            value={activeForm === 'signup' ? password : ''}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' } as any}
                        />

                        <p className="form-message error">{errorMsg}</p>

                        <button className="submit" type="submit" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>

                        <p className="form-footer">
                            Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchForm('login'); }}>Sign In</a>
                        </p>
                    </form>
                </div>

                {/* Forgot Password Form */}
                <div id="forgot-container" className={`form-container ${activeForm !== 'forgot' ? 'hidden' : ''}`}>
                    <form onSubmit={handleForgot} className="form">
                        <div className="title">Reset Password</div>

                        <p style={{ textAlign: "center", fontSize: "0.9rem", color: "#374151", marginBottom: "1rem" }}>
                            Enter your email to receive a reset link.
                        </p>

                        <label className="label_input" htmlFor="forgot-email-input">Email</label>
                        <input
                            spellCheck="false"
                            className="input"
                            type="email"
                            id="forgot-email-input"
                            required
                            value={activeForm === 'forgot' ? email : ''}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        {errorMsg && <p className="form-message error">{errorMsg}</p>}
                        {successMsg && <p className="form-message success">{successMsg}</p>}

                        <button className="submit" type="submit" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <p className="form-footer">
                            <a href="#" onClick={(e) => { e.preventDefault(); switchForm('login'); }}>Back to Sign In</a>
                        </p>
                    </form>
                </div>

                {/* Avatar placed after forms for CSS sibling selectors to work */}
                <label htmlFor="blind-input" className="avatar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 64 64" id="monkey">
                        <ellipse cx="53.7" cy="33" rx="8.3" ry="8.2" fill="#89664c"></ellipse>
                        <ellipse cx="53.7" cy="33" rx="5.4" ry="5.4" fill="#ffc5d3"></ellipse>
                        <ellipse cx="10.2" cy="33" rx="8.2" ry="8.2" fill="#89664c"></ellipse>
                        <ellipse cx="10.2" cy="33" rx="5.4" ry="5.4" fill="#ffc5d3"></ellipse>
                        <g fill="#89664c">
                            <path d="m43.4 10.8c1.1-.6 1.9-.9 1.9-.9-3.2-1.1-6-1.8-8.5-2.1 1.3-1 2.1-1.3 2.1-1.3-20.4-2.9-30.1 9-30.1 19.5h46.4c-.7-7.4-4.8-12.4-11.8-15.2"></path>
                            <path d="m55.3 27.6c0-9.7-10.4-17.6-23.3-17.6s-23.3 7.9-23.3 17.6c0 2.3.6 4.4 1.6 6.4-1 2-1.6 4.2-1.6 6.4 0 9.7 10.4 17.6 23.3 17.6s23.3-7.9 23.3-17.6c0-2.3-.6-4.4-1.6-6.4 1-2 1.6-4.2 1.6-6.4"></path>
                        </g>
                        <path d="m52 28.2c0-16.9-20-6.1-20-6.1s-20-10.8-20 6.1c0 4.7 2.9 9 7.5 11.7-1.3 1.7-2.1 3.6-2.1 5.7 0 6.1 6.6 11 14.7 11s14.7-4.9 14.7-11c0-2.1-.8-4-2.1-5.7 4.4-2.7 7.3-7 7.3-11.7" fill="#e0ac7e"></path>
                        <g fill="#3b302a" className="monkey-eye-nose">
                            <path d="m35.1 38.7c0 1.1-.4 2.1-1 2.1-.6 0-1-.9-1-2.1 0-1.1.4-2.1 1-2.1.6.1 1 1 1 2.1"></path>
                            <path d="m30.9 38.7c0 1.1-.4 2.1-1 2.1-.6 0-1-.9-1-2.1 0-1.1.4-2.1 1-2.1.5.1 1 1 1 2.1"></path>
                            <ellipse cx="40.7" cy="31.7" rx="3.5" ry="4.5" className="monkey-eye-r"></ellipse>
                            <ellipse cx="23.3" cy="31.7" rx="3.5" ry="4.5" className="monkey-eye-l"></ellipse>
                        </g>
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 64 64" id="monkey-hands">
                        <path fill="#89664C" d="M9.4,32.5L2.1,61.9H14c-1.6-7.7,4-21,4-21L9.4,32.5z"></path>
                        <path fill="#FFD6BB" d="M15.8,24.8c0,0,4.9-4.5,9.5-3.9c2.3,0.3-7.1,7.6-7.1,7.6s9.7-8.2,11.7-5.6c1.8,2.3-8.9,9.8-8.9,9.8 s10-8.1,9.6-4.6c-0.3,3.8-7.9,12.8-12.5,13.8C11.5,43.2,6.3,39,9.8,24.4C11.6,17,13.3,25.2,15.8,24.8"></path>
                        <path fill="#89664C" d="M54.8,32.5l7.3,29.4H50.2c1.6-7.7-4-21-4-21L54.8,32.5z"></path>
                        <path fill="#FFD6BB" d="M48.4,24.8c0,0-4.9-4.5-9.5-3.9c-2.3,0.3,7.1,7.6,7.1,7.6s-9.7-8.2-11.7-5.6c-1.8,2.3,8.9,9.8,8.9,9.8 s-10-8.1-9.7-4.6c0.4,3.8,8,12.8,12.6,13.8c6.6,1.3,11.8-2.9,8.3-17.5C52.6,17,50.9,25.2,48.4,24.8"></path>
                    </svg>
                </label>
            </div>
        </div>
    );
}
