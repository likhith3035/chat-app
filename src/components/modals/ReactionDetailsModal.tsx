import { useChat } from '../../context/ChatContext';

interface ReactionDetailsModalProps {
    reactions: Record<string, string[]>;
    onClose: () => void;
}

export default function ReactionDetailsModal({ reactions, onClose }: ReactionDetailsModalProps) {
    const { users } = useChat();

    // Flatten reactions into a single array for easier rendering
    const allReactions = Object.entries(reactions).flatMap(([emoji, uids]) =>
        uids.map(uid => ({ emoji, uid }))
    );

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-xs flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Reactions</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar-light dark:custom-scrollbar-dark">
                    {allReactions.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-slate-400 py-4">No reactions yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {allReactions.map((reaction, index) => {
                                const userData = users[reaction.uid];
                                const name = userData?.name || 'Unknown User';
                                const avatar = userData?.avatarUrl || `https://ui-avatars.com/api/?name=${name}&background=random`;

                                return (
                                    <li key={index} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />
                                            <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{name}</span>
                                        </div>
                                        <span className="text-xl">{reaction.emoji}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
