
interface ShareLinkModalProps {
    link: string;
    onClose: () => void;
}

export default function ShareLinkModal({ link, onClose }: ShareLinkModalProps) {

    const handleCopy = () => {
        navigator.clipboard.writeText(link);
        alert('Link copied to clipboard!');
    };

    const whatsappUrl = `https://api.whatsapp.com/send?text=Join%20my%20public%20chat%20room%20on%20L%20Chat!%20${encodeURIComponent(link)}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=Join%20my%20public%20chat%20room%20on%20L%20Chat!`;

    return (
        <div className="fixed inset-0 bg-gray-600/75 dark:bg-black/60 flex items-center justify-center z-40 p-4">
            <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-white/10 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-slate-100">Share Room Link</h2>
                <input
                    type="text"
                    value={link}
                    className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 mb-4 text-sm"
                    readOnly
                />
                <div className="flex flex-col space-y-3">
                    <button onClick={handleCopy} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                        Copy Link
                    </button>
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold block">
                        Share on WhatsApp
                    </a>
                    <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="w-full py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors font-semibold block">
                        Share on Telegram
                    </a>
                </div>
                <button onClick={onClose} className="mt-4 w-full py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    Close
                </button>
            </div>
        </div>
    );
}
