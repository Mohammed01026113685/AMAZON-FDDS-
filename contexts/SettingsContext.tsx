
import React, { createContext, useContext, useState, useEffect } from 'react';
import translations, { Language } from '../utils/translations';
import { fetchGlobalSettings } from '../services/firebase';

type Theme = 'light' | 'dark';

interface SettingsContextType {
    language: Language;
    theme: Theme;
    toggleTheme: () => void;
    t: (key: keyof typeof translations['ar']) => string;
    dir: 'rtl' | 'ltr';
    appTitle: string;
    setAppTitle: (title: string) => void;
    dailyGoal: number;
    setDailyGoal: (goal: number) => void;
    autoSortByFailed: boolean;
    setAutoSortByFailed: (val: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Force Language to Arabic
    const language: Language = 'ar';
    const dir = 'rtl';
    const [appTitle, setAppTitle] = useState('amazonFDDS');
    const [dailyGoal, setDailyGoal] = useState<number>(100);
    const [autoSortByFailed, setAutoSortByFailed] = useState<boolean>(false);

    const [theme, setTheme] = useState<Theme>(() => {
        return (localStorage.getItem('app_theme') as Theme) || 'light';
    });

    // Effect for Language (Force RTL)
    useEffect(() => {
        document.documentElement.lang = 'ar';
        document.dir = 'rtl';
    }, []);

    // Load Settings
    useEffect(() => {
        fetchGlobalSettings().then(settings => {
            if(settings?.appTitle) setAppTitle(settings.appTitle);
            if(settings?.dailyGoal) setDailyGoal(settings.dailyGoal);
            if(settings?.autoSortByFailed !== undefined) setAutoSortByFailed(settings.autoSortByFailed);
        });
    }, []);

    // Effect for Theme
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('app_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const t = (key: keyof typeof translations['ar']) => {
        return translations['ar'][key] || key;
    };

    return (
        <SettingsContext.Provider value={{
            language,
            theme,
            toggleTheme,
            t,
            dir,
            appTitle,
            setAppTitle,
            dailyGoal,
            setDailyGoal,
            autoSortByFailed,
            setAutoSortByFailed
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};
