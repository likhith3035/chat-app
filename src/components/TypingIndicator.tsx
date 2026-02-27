import React from 'react';

export default function TypingIndicator() {
    return (
        <div className="flex items-center gap-1.5 px-4 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-[20px] rounded-bl-md shadow-sm border border-gray-200/50 dark:border-white/10 w-fit">
            <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-slate-400 rounded-full animate-bounce"></div>
        </div>
    );
}
