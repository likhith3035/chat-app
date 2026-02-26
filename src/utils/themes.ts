export const CHAT_THEMES = [
    {
        id: 'instagram',
        name: 'Instagram (Default)',
        gradient: 'bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-pink-500 text-white border-transparent',
        previewColor: 'from-violet-500 to-pink-500'
    },
    {
        id: 'ocean',
        name: 'Ocean Blue',
        gradient: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-transparent',
        previewColor: 'from-cyan-500 to-blue-500'
    },
    {
        id: 'midnight',
        name: 'Midnight',
        gradient: 'bg-gradient-to-r from-gray-700 to-gray-900 text-white border-transparent',
        previewColor: 'from-gray-700 to-gray-900'
    },
    {
        id: 'sunset',
        name: 'Sunset',
        gradient: 'bg-gradient-to-r from-orange-400 to-rose-400 text-white border-transparent',
        previewColor: 'from-orange-400 to-rose-400'
    },
    {
        id: 'forest',
        name: 'Forest',
        gradient: 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-white border-transparent',
        previewColor: 'from-emerald-400 to-cyan-400'
    },
    {
        id: 'neon',
        name: 'Cyberpunk',
        gradient: 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-transparent',
        previewColor: 'from-fuchsia-600 to-purple-600'
    }
];

export const getThemeGradient = (themeId?: string) => {
    if (!themeId) return CHAT_THEMES[0].gradient;
    const theme = CHAT_THEMES.find(t => t.id === themeId);
    return theme ? theme.gradient : CHAT_THEMES[0].gradient;
};
