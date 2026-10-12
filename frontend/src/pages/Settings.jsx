import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { toast } from 'react-toastify';
import {
    IoTrashOutline, IoLockClosedOutline, IoChevronForward, IoSearchOutline,
    IoTimeOutline, IoEyeOutline, IoPersonRemoveOutline, IoImagesOutline,
    IoChatbubbleOutline, IoAtOutline, IoShieldCheckmarkOutline, IoChevronBack
} from 'react-icons/io5';
import { AiOutlineClockCircle, AiOutlineInfoCircle } from 'react-icons/ai';
import { FaUserFriends } from 'react-icons/fa';

const Settings = () => {
    const { logout, user: authUser, updateUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState(null);
    const [currentSection, setCurrentSection] = useState('main'); // main, activity, privacy, history

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const { data } = await api.get('/users/activity/logs');
                setLogs(data);
            } catch (error) {
                console.error("Failed to fetch logs", error);
            }
        };
        fetchLogs();
    }, []);

    const updatePrivacySetting = async (key, value) => {
        try {
            const { data } = await api.put('/users/settings', { [key]: value });
            setLogs(prev => ({ ...prev, [key]: value }));
            updateUser(data); // Sync with AuthContext for real-time app-wide updates
            toast.success("Setting updated");
        } catch (error) {
            toast.error("Failed to update setting");
        }
    };

    const handleDeactivate = async () => {
        if (!window.confirm('Are you sure you want to deactivate? Your profile will be hidden.')) return;
        try {
            setLoading(true);
            await api.put('/users/account/deactivate');
            logout();
            navigate('/login');
        } catch (error) { toast.error('Failed to deactivate'); }
        finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure? This is permanent.')) return;
        try {
            setLoading(true);
            await api.delete('/users/account/delete');
            logout();
            navigate('/login');
        } catch (error) { toast.error('Failed to delete'); }
        finally { setLoading(false); }
    };

    if (currentSection === 'activity') return (
        <SectionContainer title="Your Activity" onBack={() => setCurrentSection('main')}>
            <ActivityItem icon={<IoSearchOutline />} title="Recent Searches" subtitle="View your search history">
                <div className="flex flex-col gap-2 mt-4 px-2">
                    {logs?.searchHistory?.length > 0 ? logs.searchHistory.map((s, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm">"{s.query}"</span>
                            <span className="text-[10px] text-gray-500">{new Date(s.timestamp).toLocaleDateString()}</span>
                        </div>
                    )) : <p className="text-gray-500 text-sm">No recent searches</p>}
                </div>
            </ActivityItem>
            <ActivityItem icon={<IoEyeOutline />} title="Watched Reels" subtitle="History of videos you've viewed">
                <div className="grid grid-cols-4 gap-2 mt-4">
                    {logs?.reelsWatched?.length > 0 ? logs.reelsWatched.map((r, i) => (
                        <div key={i} className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden relative group">
                            <img src={r.reelId?.imageUrl || (r.reelId?.videoUrl ? "https://res.cloudinary.com/demo/video/upload/w_200,h_350,c_fill,so_0/dog.jpg" : "")} className="w-full h-full object-cover opacity-50" />
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition bg-black/40">View</div>
                        </div>
                    )) : <p className="text-gray-500 text-sm col-span-4">No watch history</p>}
                </div>
            </ActivityItem>
            <ActivityItem icon={<IoTimeOutline />} title="Time Management" subtitle="Your daily usage statistics">
                <div className="mt-4 p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center">
                    <p className="text-gray-400 text-sm mb-1">Time spent today</p>
                    <p className="text-4xl font-bold text-blue-400">{logs?.timeSpentToday || 0} <span className="text-lg">min</span></p>
                </div>
            </ActivityItem>
        </SectionContainer>
    );

    if (currentSection === 'history') return (
        <SectionContainer title="Account History" onBack={() => setCurrentSection('main')}>
            <ActivityItem icon={<AiOutlineInfoCircle />} title="Bio Changes" subtitle="History of your profile bios">
                <div className="flex flex-col gap-3 mt-4">
                    {logs?.bioHistory?.length > 0 ? logs.bioHistory.map((b, i) => (
                        <div key={i} className="bg-white/5 p-3 rounded-lg text-sm border border-white/5">
                            <p className="italic mb-1">"{b.text || 'Empty bio'}"</p>
                            <p className="text-[10px] text-gray-500">Changed on {new Date(b.timestamp).toLocaleDateString()}</p>
                        </div>
                    )) : <p className="text-gray-500 text-sm">No bio changes found</p>}
                </div>
            </ActivityItem>
            <ActivityItem icon={<IoImagesOutline />} title="Profile Photo History" subtitle="Previous profile pictures">
                <div className="grid grid-cols-3 gap-3 mt-4">
                    {logs?.profilePicHistory?.length > 0 ? logs.profilePicHistory.map((p, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <img src={p.url} className="w-full aspect-square rounded-full object-cover border border-white/10" />
                            <span className="text-[10px] text-gray-500">{new Date(p.timestamp).toLocaleDateString()}</span>
                        </div>
                    )) : <p className="text-gray-500 text-sm col-span-3">No photo history</p>}
                </div>
            </ActivityItem>
        </SectionContainer>
    );

    if (currentSection === 'privacy') return (
        <SectionContainer title="Privacy & Security" onBack={() => setCurrentSection('main')}>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                        <p className="font-semibold">Private Account</p>
                        <p className="text-xs text-gray-400">Only people you approve can see your content</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={logs?.isPrivate} onChange={(e) => updatePrivacySetting('isPrivate', e.target.checked)} />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className="p-4 bg-white/5 rounded-xl flex flex-col gap-4">
                    <p className="font-semibold text-sm text-gray-400 uppercase tracking-widest">Interactions</p>
                    <InteractionSetting title="Tags" icon={<IoAtOutline />} subtitle="Who can tag you?" value={logs?.tagsPolicy} onChange={(v) => updatePrivacySetting('tagsPolicy', v)} />
                    <InteractionSetting title="Mentions" icon={<IoChatbubbleOutline />} subtitle="Who can mention you?" value={logs?.mentionsPolicy} onChange={(v) => updatePrivacySetting('mentionsPolicy', v)} />
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                    <p className="font-semibold mb-4">Connections</p>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-sm py-2 group cursor-pointer" onClick={() => setCurrentSection('blocked')}>
                            <div className="flex items-center gap-3">
                                <IoPersonRemoveOutline className="text-red-400" />
                                <span>Blocked Accounts</span>
                            </div>
                            <span className="text-gray-500 flex items-center gap-1">{logs?.blockedUsers?.length || 0} <IoChevronForward /></span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-2">
                            <div className="flex items-center gap-3">
                                <FaUserFriends className="text-green-400" />
                                <span>Close Friends</span>
                            </div>
                            <span className="text-gray-500 flex items-center gap-1">0 <IoChevronForward /></span>
                        </div>
                    </div>
                </div>
            </div>
        </SectionContainer>
    );

    const handleUnblock = async (userId) => {
        try {
            const { data } = await api.put(`/users/block/${userId}`);
            setLogs(prev => ({
                ...prev,
                blockedUsers: prev.blockedUsers.filter(u => u._id !== userId)
            }));
            // Update AuthContext so Home/Profile also see the unblock real-time
            if (authUser) {
                updateUser({
                    ...authUser,
                    blockedUsers: authUser.blockedUsers.filter(id => id !== userId)
                });
            }
            toast.success("User unblocked");
        } catch (error) {
            toast.error("Failed to unblock user");
        }
    };

    if (currentSection === 'blocked') return (
        <SectionContainer title="Blocked Accounts" onBack={() => setCurrentSection('privacy')}>
            <div className="flex flex-col gap-4">
                {logs?.blockedUsers?.length > 0 ? logs.blockedUsers.map(u => (
                    <div key={u._id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <img src={u.profilePic} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                            <span className="font-semibold text-sm">{u.username}</span>
                        </div>
                        <button onClick={() => handleUnblock(u._id)} className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg text-xs font-bold transition">Unblock</button>
                    </div>
                )) : <p className="text-center py-20 text-gray-500 italic text-sm">No blocked accounts</p>}
            </div>
        </SectionContainer>
    );

    return (
        <div className="max-w-xl mx-auto pt-10 px-4 text-white pb-20">
            <h1 className="text-3xl font-bold mb-8 tracking-tight">Settings</h1>

            <div className="grid grid-cols-1 gap-4">
                <MenuButton icon={<IoShieldCheckmarkOutline className="text-blue-400" />} title="Privacy & Security" subtitle="Private account, blocked, tagging" onClick={() => setCurrentSection('privacy')} />
                <MenuButton icon={<IoTimeOutline className="text-purple-400" />} title="Your Activity" subtitle="Search history, watched reels, time spent" onClick={() => setCurrentSection('activity')} />
                <MenuButton icon={<AiOutlineClockCircle className="text-green-400" />} title="Account History" subtitle="Previous bios and profile photos" onClick={() => setCurrentSection('history')} />
                <MenuButton icon={<IoImagesOutline className="text-pink-400" />} title="Recently Deleted" subtitle="Restore your deleted posts and stories" onClick={() => navigate('/settings/recently-deleted')} />

                <div className="mt-8">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 px-2">Danger Zone</h2>
                    <div className="flex flex-col gap-2">
                        <MenuButton icon={<IoLockClosedOutline className="text-yellow-500" />} title="Deactivate Account" destructive={false} onClick={handleDeactivate} />
                        <MenuButton icon={<IoTrashOutline className="text-red-500" />} title="Delete Account" destructive={true} onClick={handleDelete} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const SectionContainer = ({ title, children, onBack }) => (
    <div className="max-w-xl mx-auto pt-10 px-4 text-white pb-20 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition"><IoChevronBack size={24} /></button>
            <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {children}
    </div>
);

const MenuButton = ({ icon, title, subtitle, onClick, destructive }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-between p-5 rounded-2xl transition-all border border-white/5 ${destructive ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-zinc-900 hover:bg-zinc-800'}`}
    >
        <div className="flex items-center gap-4">
            <div className="text-2xl">{icon}</div>
            <div className="text-left">
                <p className={`font-semibold ${destructive ? 'text-red-400' : ''}`}>{title}</p>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
        </div>
        <IoChevronForward size={20} className="text-gray-600" />
    </button>
);

const ActivityItem = ({ icon, title, subtitle, children }) => (
    <div className="mb-8 last:mb-0">
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-zinc-800 rounded-xl text-xl">{icon}</div>
            <div>
                <p className="font-bold">{title}</p>
                <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
        </div>
        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 shadow-inner">
            {children}
        </div>
    </div>
);

const InteractionSetting = ({ title, icon, subtitle, value, onChange }) => (
    <div className="flex flex-col gap-2 border-b border-white/5 pb-4 last:border-0 last:pb-0">
        <div className="flex items-center gap-2">
            <div className="text-blue-400">{icon}</div>
            <p className="font-semibold text-sm">{title}</p>
        </div>
        <p className="text-[10px] text-gray-500 mb-2">{subtitle}</p>
        <div className="flex gap-2">
            {['everyone', 'following', 'none'].map(v => (
                <button
                    key={v}
                    onClick={() => onChange(v)}
                    className={`flex-grow py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${value === v ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700 text-gray-500'}`}
                >
                    {v}
                </button>
            ))}
        </div>
    </div>
);

export default Settings;
