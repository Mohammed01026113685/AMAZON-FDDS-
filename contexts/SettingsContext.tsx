import React, { createContext, useContext, useState, useEffect } from 'react';
import translations, { Language } from '../utils/translations';
import { fetchAppTitle } from '../services/firebase';

type Theme = 'light' | 'dark';

interface SettingsContextType {
    language: Language;
    theme: Theme;
    toggleTheme: () => void;
    t: (key: keyof typeof translations['ar']) => string;
    dir: 'rtl' | 'ltr';
    appTitle: string;
    setAppTitle: (title: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Force Language to Arabic
    const language: Language = 'ar';
    const dir = 'rtl';
    
    // Initialize appTitle with default Arabic name
    const [appTitle, setAppTitle] = useState<string>('AMAZON QENA ');
    
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('app_theme') as Theme;
        // Check system preference as fallback
        if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return savedTheme || 'light';
    });

    // Effect for Language (Force RTL)
    useEffect(() => {
        document.documentElement.lang = 'ar';
        document.dir = 'rtl';
        document.documentElement.setAttribute('data-lang', 'ar');
    }, []);

    // Load App Title from Firebase on mount
    useEffect(() => {
        const loadAppTitle = async () => {
            try {
                const title = await fetchAppTitle();
                if (title && title.trim()) {
                    setAppTitle(title);
                }
            } catch (error) {
                console.error('Failed to fetch app title:', error);
                // Keep default Arabic title
            }
        };
        
        loadAppTitle();
    }, []);

    // Save appTitle to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('appTitle', appTitle);
    }, [appTitle]);

    // Effect for Theme
    useEffect(() => {
        const htmlElement = document.documentElement;
        
        if (theme === 'dark') {
            htmlElement.classList.add('dark');
            htmlElement.setAttribute('data-theme', 'dark');
        } else {
            htmlElement.classList.remove('dark');
            htmlElement.setAttribute('data-theme', 'light');
        }
        
        localStorage.setItem('app_theme', theme);
        
        // Also set theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#191E26' : '#ffffff');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // Enhanced translation function with fallback and parameter support
    const t = (key: keyof typeof translations['ar'], params?: Record<string, string | number>): string => {
        const translation = translations['ar'][key] || key;
        
        if (params) {
            return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
                return result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
            }, translation);
        }
        
        return translation;
    };

    // Expose method to update app title with validation
    const updateAppTitle = (title: string) => {
        if (title.trim().length > 0) {
            setAppTitle(title);
        }
    };

    return (
        <SettingsContext.Provider value={{
            language,
            theme,
            toggleTheme,
            t,
            dir,
            appTitle,
            setAppTitle: updateAppTitle
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