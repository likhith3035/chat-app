
interface InfoModalProps {
    onClose: () => void;
}

export default function InfoModal({ onClose }: InfoModalProps) {
    return (
        <div className="fixed inset-0 bg-gray-600/75 dark:bg-black/60 flex items-center justify-center z-40 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-white/10 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Welcome to L Chat!</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 dark:text-slate-500 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar-light dark:custom-scrollbar-dark">
                    <p className="text-gray-600 dark:text-slate-400 mb-6">Here's a quick guide to all the features and how to use the app.</p>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-3 border-b border-gray-200 dark:border-white/5 pb-2">Getting Started</h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300">
                            <li><strong>Sign Up & Login:</strong> You can create a new account or log in with an existing one.</li>
                            <li><strong>Complete Your Profile:</strong> The first time you log in, you'll be asked to complete your profile with a display name and avatar.</li>
                        </ul>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-3 border-b border-gray-200 dark:border-white/5 pb-2">Starting a Conversation</h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300">
                            <li><strong>1-on-1 Chats:</strong> Click the <strong>"+"</strong> icon in the "Chats" header. Select a single user and click "Start Chat".</li>
                            <li><strong>Group Chats:</strong> Click the <strong>"+"</strong> icon, select <strong>two or more</strong> users, give your group a name, and click "Start Chat".</li>
                            <li><strong>Public Rooms:</strong> Click the "grid" icon (Create Public Room). After creating it, you'll get a shareable link.</li>
                        </ul>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 mb-3 border-b border-gray-200 dark:border-white/5 pb-2">Admin Features</h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-slate-300">
                            <li>If your account is an admin, you will see an <strong>"Admin"</strong> button in your profile header.</li>
                        </ul>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-slate-800/50 text-right">
                    <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
}
