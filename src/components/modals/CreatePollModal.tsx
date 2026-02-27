import { useState } from 'react';
import { db, CHATS_COL } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

interface CreatePollModalProps {
    chatId: string;
    onClose: () => void;
}

export default function CreatePollModal({ chatId, onClose }: CreatePollModalProps) {
    const { currentUser } = useAuth();
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddOption = () => {
        if (options.length < 10) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = [...options];
            newOptions.splice(index, 1);
            setOptions(newOptions);
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !question.trim()) return;

        const validOptions = options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
            alert("Please provide at least 2 options.");
            return;
        }

        setIsSubmitting(true);
        try {
            const messagesRef = collection(db, CHATS_COL, chatId, 'messages');
            await addDoc(messagesRef, {
                senderId: currentUser.uid,
                type: 'poll',
                text: '', // Use text field as an empty fallback or a simple 'created a poll'
                pollData: {
                    question: question.trim(),
                    options: validOptions.map((opt, i) => ({ id: `opt_${i}`, text: opt.trim(), votes: [] })),
                    votedBy: []
                },
                timestamp: serverTimestamp(),
            });
            onClose();
        } catch (error) {
            console.error("Error creating poll:", error);
            alert("Failed to create poll");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Create Poll</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question</label>
                        <input
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder="Ask a question..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-shadow"
                            required
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between items-center">
                            Options
                        </label>
                        {options.map((opt, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={e => handleOptionChange(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="flex-grow px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white transition-shadow text-sm"
                                    required={index < 2} // First two are required
                                />
                                {options.length > 2 && (
                                    <button type="button" onClick={() => handleRemoveOption(index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {options.length < 10 && (
                        <button type="button" onClick={handleAddOption} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Option
                        </button>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || !question.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Poll'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
