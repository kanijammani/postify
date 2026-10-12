import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AiFillHome, AiOutlineHome, AiOutlineSearch, AiOutlineCompass, AiFillCompass, AiOutlineHeart, AiFillHeart, AiOutlineSetting, AiFillSetting } from 'react-icons/ai';
import { BiMoviePlay, BiSolidMoviePlay } from 'react-icons/bi';
import { CgProfile } from 'react-icons/cg';
import { BsPlusSquare, BsPlusSquareFill } from 'react-icons/bs';
import { FaRegPaperPlane } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import { io } from 'socket.io-client';

const ENDPOINT = "http://localhost:5001";

const Sidebar = ({ openPostModal }) => {
    const { pathname } = useLocation();
    const { user, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessageCount, setUnreadMessageCount] = useState(0);

    const isActive = (path) => pathname === path;

    // Fetch initial unread counts
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await api.get('/notifications');
                // General notifications (Likes, Comments, Follows)
                const unreadGen = data.filter(n => !n.isRead && n.type !== 'message').length;
                // Message notifications
                const unreadMsg = data.filter(n => !n.isRead && n.type === 'message').length;

                setUnreadCount(unreadGen);
                setUnreadMessageCount(unreadMsg);
            } catch (error) {
                console.error("Failed to fetch notifications for counter", error);
            }
        };

        if (user) {
            fetchNotifications();
        }
    }, [user, pathname]);

    // Socket for real-time notifications
    useEffect(() => {
        if (!user) return;

        const socket = io(ENDPOINT);
        socket.emit("setup", user);

        socket.on("notification_received", (newNotif) => {
            if (newNotif.type === 'message') {
                setUnreadMessageCount(prev => prev + 1);
            } else {
                setUnreadCount(prev => prev + 1);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    return (
        <div className="hidden md:flex flex-col w-60 h-screen border-r border-white/20 px-4 pt-8 fixed top-0 left-0 bg-black/40 backdrop-blur-md z-10 text-white">
            <Link to="/" className="mb-8 px-2">
                <h1 className="text-2xl font-serif">Postify</h1>
            </Link>

            <nav className="flex flex-col gap-2 flex-grow">
                <Link to="/" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    {isActive('/') ? <AiFillHome size={28} /> : <AiOutlineHome size={28} />}
                    <span className={`text-base ${isActive('/') ? 'font-bold' : ''}`}>Home</span>
                </Link>

                <Link to="/search" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    <AiOutlineSearch size={28} />
                    <span className="text-base">Search</span>
                </Link>

                <Link to="/explore" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    {isActive('/explore') ? <AiFillCompass size={28} /> : <AiOutlineCompass size={28} />}
                    <span className={`text-base ${isActive('/explore') ? 'font-bold' : ''}`}>Explore</span>
                </Link>

                <Link to="/reels" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    {isActive('/reels') ? <BiSolidMoviePlay size={28} /> : <BiMoviePlay size={28} />}
                    <span className={`text-base ${isActive('/reels') ? 'font-bold' : ''}`}>Reels</span>
                </Link>

                <Link to="/direct/inbox" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition relative">
                    <div className="relative">
                        <FaRegPaperPlane size={24} />
                        {unreadMessageCount > 0 && (
                            <div className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold border border-black scale-100 animate-pulse">
                                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                            </div>
                        )}
                    </div>
                    <span className={`text-base ${isActive('/direct/inbox') ? 'font-bold' : ''}`}>Messages</span>
                </Link>

                <Link to="/notifications" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition text-left relative">
                    <div className="relative">
                        {isActive('/notifications') ? <AiFillHeart size={28} /> : <AiOutlineHeart size={28} />}
                        {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold border border-black scale-100 animate-pulse">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                        )}
                    </div>
                    <span className={`text-base ${isActive('/notifications') ? 'font-bold' : ''}`}>Notifications</span>
                </Link>

                <button onClick={openPostModal} className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition text-left">
                    <BsPlusSquare size={28} />
                    <span className="text-base">Create</span>
                </button>

                <Link to={user?.username ? `/profile/${user.username}` : '#'} className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    {user?.profilePic ? (
                        <img src={user.profilePic} alt="profile" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                        <CgProfile size={28} />
                    )}
                    <span className={`text-base ${isActive(user?.username ? `/profile/${user.username}` : '') ? 'font-bold' : ''}`}>Profile</span>
                </Link>

                <Link to="/settings" className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition">
                    <div>
                        {isActive('/settings') ? <AiFillSetting size={28} /> : <AiOutlineSetting size={28} />}
                    </div>
                    <span className={`text-base ${isActive('/settings') ? 'font-bold' : ''}`}>Settings</span>
                </Link>
            </nav>

            <div className="mb-4">
                <button onClick={logout} className="flex items-center gap-4 p-3 hover:bg-white/10 rounded-lg transition w-full text-left">
                    <span className="text-base">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
