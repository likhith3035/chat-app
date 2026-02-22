import { useState, useEffect } from 'react';

interface LockScreenProps {
    onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState<'enter' | 'confirm'>('enter');

    const storedPin = localStorage.getItem('chatapp_lock_pin');
    const hasPin = !!storedPin;

    useEffect(() => {
        if (!hasPin) {
            setIsSettingPin(true);
        }
    }, [hasPin]);

    const handleDigitPress = (digit: string) => {
        if (isSettingPin) {
            if (step === 'enter') {
                const next = pin + digit;
                setPin(next);
                setError('');
                if (next.length === 4) {
                    setStep('confirm');
                    setPin('');
                    setConfirmPin(next);
                }
            } else {
                const next = pin + digit;
                setPin(next);
                setError('');
                if (next.length === 4) {
                    if (next === confirmPin) {
                        localStorage.setItem('chatapp_lock_pin', next);
                        onUnlock();
                    } else {
                        setError('PINs do not match. Try again.');
                        setPin('');
                        setStep('enter');
                        setConfirmPin('');
                    }
                }
            }
        } else {
            const next = pin + digit;
            setPin(next);
            setError('');
            if (next.length === 4) {
                if (next === storedPin) {
                    onUnlock();
                } else {
                    setError('Incorrect PIN');
                    setPin('');
                }
            }
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const getTitle = () => {
        if (isSettingPin) {
            return step === 'enter' ? 'Set a 4-digit PIN' : 'Confirm your PIN';
        }
        return 'Enter PIN to Unlock';
    };

    return (
        <div className="w-full h-[100dvh] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex flex-col items-center justify-center">
            {/* Lock Icon */}
            <div className="mb-6">
                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
            </div>

            <h2 className="text-white text-xl font-semibold mb-2">{getTitle()}</h2>
            <p className="text-blue-200 text-sm mb-8">
                {isSettingPin ? 'This PIN will protect your chats' : 'Your chats are protected'}
            </p>

            {/* PIN Dots */}
            <div className="flex gap-4 mb-8">
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length
                                ? 'bg-white scale-110'
                                : 'bg-white/30 border-2 border-white/40'
                            }`}
                    />
                ))}
            </div>

            {/* Error */}
            {error && (
                <p className="text-red-300 text-sm mb-4 animate-pulse">{error}</p>
            )}

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
                    if (key === '') return <div key="empty" />;
                    if (key === 'del') {
                        return (
                            <button
                                key="del"
                                onClick={handleDelete}
                                className="w-16 h-16 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
                                </svg>
                            </button>
                        );
                    }
                    return (
                        <button
                            key={key}
                            onClick={() => handleDigitPress(key)}
                            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm text-white text-2xl font-medium hover:bg-white/20 active:scale-95 transition-all"
                        >
                            {key}
                        </button>
                    );
                })}
            </div>

            {/* Remove PIN option */}
            {hasPin && !isSettingPin && (
                <button
                    onClick={() => {
                        localStorage.removeItem('chatapp_lock_pin');
                        onUnlock();
                    }}
                    className="mt-8 text-blue-200 text-xs hover:text-white transition-colors underline"
                >
                    Remove PIN Lock
                </button>
            )}
        </div>
    );
}
