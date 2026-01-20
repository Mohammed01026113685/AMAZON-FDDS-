
import React, { useState, useEffect } from 'react';
import { createNewUser, fetchRegisteredUsers, ADMIN_EMAIL } from '../services/firebase';
import { useSettings } from '../contexts/SettingsContext';

interface UserManagementProps {
    onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => {
    const { t, dir } = useSettings();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [usersList, setUsersList] = useState<any[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);

    const loadUsers = async () => {
        setIsLoadingList(true);
        const users = await fetchRegisteredUsers();
        setUsersList(users);
        setIsLoadingList(false);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            await createNewUser(email, password);
            setMessage({ type: 'success', text: t('userCreated') });
            setEmail('');
            setPassword('');
            loadUsers(); // Refresh list
        } catch (error: any) {
            setMessage({ type: 'error', text: `❌ ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-overlay animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#191E26] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col md:flex-row max-h-[80vh]" onClick={e => e.stopPropagation()}>
                
                {/* Form Section */}
                <div className={`w-full md:w-1/2 p-6 flex flex-col border-b md:border-b-0 ${dir === 'rtl' ? 'md:border-l' : 'md:border-r'} border-gray-200 dark:border-gray-700 overflow-y-auto`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-[#232F3E] dark:text-white">
                            <i className="fa-solid fa-user-plus text-[#FF9900]"></i>
                            {t('addUser')}
                        </h3>
                        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-lg text-sm font-bold mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" dir={dir}>
                        <div>
                            <label className="block text-sm font-bold text-[#232F3E] dark:text-gray-300 mb-1">{t('email')}</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900] outline-none transition-all bg-white dark:bg-gray-700 dark:text-white"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#232F3E] dark:text-gray-300 mb-1">{t('password')}</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900] outline-none transition-all bg-white dark:bg-gray-700 dark:text-white"
                                placeholder="********"
                                required
                                minLength={6}
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-[#FF9900] hover:bg-[#E77600] text-[#232F3E] font-bold py-3 rounded-lg shadow-md transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                                {loading ? t('creating') : t('createAccount')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* List Section */}
                <div className="w-full md:w-1/2 bg-gray-50 dark:bg-[#111315] p-6 flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-[#232F3E] dark:text-white text-sm uppercase tracking-wider">
                            {t('registeredUsers')}
                        </h3>
                        <span className="bg-[#232F3E] dark:bg-gray-700 text-white text-xs px-2 py-1 rounded-full font-bold">
                            {usersList.length}
                        </span>
                        <button onClick={onClose} className="hidden md:block text-gray-400 hover:text-[#232F3E] dark:hover:text-white">
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {isLoadingList ? (
                            <div className="text-center py-10 text-gray-400">
                                <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i>
                                <p>{t('loadingList')}</p>
                            </div>
                        ) : usersList.length > 0 ? (
                            usersList.map((user, idx) => (
                                <div key={idx} className="bg-white dark:bg-[#191E26] p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between group hover:border-[#FF9900] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${user.email === ADMIN_EMAIL ? 'bg-[#FF9900]' : 'bg-[#37475A]'}`}>
                                            {user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-[#0F1111] dark:text-white">
                                                {user.email} 
                                                {user.email === ADMIN_EMAIL && <span className="mx-2 text-[10px] bg-[#FFD814] text-[#232F3E] px-1 rounded">SUPER ADMIN</span>}
                                            </div>
                                            <div className="text-[10px] text-gray-400">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US') : 'Legacy Account'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-gray-300 dark:text-gray-600 text-xs">
                                        <i className="fa-solid fa-user-shield"></i>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                {t('noUsers')}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 text-[10px] text-gray-400 text-center bg-white dark:bg-[#191E26] p-2 rounded border border-gray-200 dark:border-gray-700">
                        <i className="fa-solid fa-info-circle ml-1"></i>
                        {t('legacyUsersNote')}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default UserManagement;
