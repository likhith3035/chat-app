import React, { useState, useRef, useEffect } from 'react';

const EMOJI_CATEGORIES: Record<string, string[]> = {
    'Smileys': ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🤩', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤔', '🤫', '🤭', '🤐', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
    'Gestures': ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '🫶', '❤️', '🔥', '💯', '⭐', '🎉', '🎊', '✨'],
    'People': ['👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '🧑‍🦱', '👨‍🦱', '👩‍🦳', '🧑‍🦳', '👨‍🦳', '👩‍🦲', '🧑‍🦲', '👨‍🦲', '🧔', '👵', '🧓', '👴', '👮', '🧑‍✈️', '👩‍🍳', '🧑‍🎓'],
    'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'],
    'Food': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🎂', '🍩', '🍪', '☕'],
    'Objects': ['💻', '📱', '⌨️', '🖥️', '💡', '🔑', '🔒', '💰', '💎', '🎮', '🎯', '🎲', '🧩', '🎵', '🎶', '🎤', '🎧', '📸', '🎬', '📚', '✏️', '📝', '💌', '📩'],
};

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const [activeCategory, setActiveCategory] = useState('Smileys');
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={pickerRef}
            className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 z-50 overflow-hidden"
            style={{ animation: 'fadeInUp 0.15s ease-out' }}
        >
            {/* Category Tabs */}
            <div className="flex border-b border-gray-100 px-1 py-1 gap-1 overflow-x-auto">
                {Object.keys(EMOJI_CATEGORIES).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-2 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap ${activeCategory === cat
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Emoji Grid */}
            <div className="p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {EMOJI_CATEGORIES[activeCategory].map((emoji, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            onSelect(emoji);
                            onClose();
                        }}
                        className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
