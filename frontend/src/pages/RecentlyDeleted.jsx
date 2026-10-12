import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { IoChevronBack, IoTrashOutline, IoRefreshOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const RecentlyDeleted = () => {
    const [posts, setPosts] = useState([]);
    const [reels, setReels] = useState([]);
    const [stories, setStories] = useState([]);
    const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'reels', or 'stories'
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchDeleted = async () => {
        try {
            setLoading(true);
            const [{ data: postsData }, { data: storiesData }] = await Promise.all([
                api.get('/posts/history/deleted'),
                api.get('/stories/history/deleted')
            ]);

            // Distinguish between posts (images) and reels (videos)
            setPosts(postsData.filter(p => !p.videoUrl));
            setReels(postsData.filter(p => p.videoUrl));
            setStories(storiesData);
        } catch (error) {
            toast.error('Failed to fetch deleted history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeleted();
    }, []);

    const handleRestore = async (id, type) => {
        if (!window.confirm(`Restore this ${type}?`)) return;
        try {
            if (type === 'post' || type === 'reel') {
                await api.put(`/posts/${id}/restore`);
                if (type === 'post') setPosts(posts.filter(p => p._id !== id));
                else setReels(reels.filter(r => r._id !== id));
            } else {
                await api.put(`/stories/${id}/restore`);
                setStories(stories.filter(s => s._id !== id));
            }
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} restored`);
        } catch (error) {
            toast.error(`Failed to restore ${type}`);
        }
    };

    const handlePermanentDelete = async (id, type) => {
        if (!window.confirm(`Permanently delete this ${type}? This cannot be undone.`)) return;
        try {
            if (type === 'post' || type === 'reel') {
                await api.delete(`/posts/${id}/permanent`);
                if (type === 'post') setPosts(posts.filter(p => p._id !== id));
                else setReels(reels.filter(r => r._id !== id));
            } else {
                await api.delete(`/stories/${id}/permanent`);
                setStories(stories.filter(s => s._id !== id));
            }
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted`);
        } catch (error) {
            toast.error(`Failed to delete ${type}`);
        }
    };

    const displayItems = activeTab === 'posts' ? posts : activeTab === 'reels' ? reels : stories;

    return (
        <div className="max-w-4xl mx-auto pt-10 px-4 text-white">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/settings')} className="p-2 hover:bg-white/10 rounded-full transition">
                    <IoChevronBack size={24} />
                </button>
                <h1 className="text-2xl font-bold">Recently Deleted</h1>
            </div>

            <div className="flex gap-4 md:gap-8 mb-6 border-b border-white/10 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`pb-4 px-4 font-semibold whitespace-nowrap transition ${activeTab === 'posts' ? 'border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Posts ({posts.length})
                </button>
                <button
                    onClick={() => setActiveTab('reels')}
                    className={`pb-4 px-4 font-semibold whitespace-nowrap transition ${activeTab === 'reels' ? 'border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Reels ({reels.length})
                </button>
                <button
                    onClick={() => setActiveTab('stories')}
                    className={`pb-4 px-4 font-semibold whitespace-nowrap transition ${activeTab === 'stories' ? 'border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Stories ({stories.length})
                </button>
            </div>

            <p className="text-gray-400 mb-8 pb-4">
                Only you can see these items. They will be permanently deleted after 30 days.
            </p>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
            ) : displayItems.length === 0 ? (
                <div className="text-center py-20">
                    <IoTrashOutline size={64} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-xl text-gray-500 uppercase tracking-widest font-light">No deleted {activeTab} to show</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                    {displayItems.map((item) => (
                        <div key={item._id} className="relative group aspect-[3/4] md:aspect-square bg-gray-900 rounded-sm overflow-hidden border border-white/5">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : item.videoUrl ? (
                                <video src={item.videoUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <span className="text-xs text-gray-500 p-2 text-center">{item.caption || 'No caption'}</span>
                                </div>
                            )}

                            {/* Info overlay */}
                            <div className="absolute top-2 left-2 text-[10px] bg-black/50 px-2 py-0.5 rounded text-gray-300">
                                Deleted {new Date(item.deletedAt).toLocaleDateString()}
                            </div>

                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-3">
                                <button
                                    onClick={() => handleRestore(item._id, activeTab === 'posts' ? 'post' : activeTab === 'reels' ? 'reel' : 'story')}
                                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-semibold text-sm hover:bg-gray-200 transition active:scale-95"
                                >
                                    <IoRefreshOutline size={18} />
                                    Restore
                                </button>
                                <button
                                    onClick={() => handlePermanentDelete(item._id, activeTab === 'posts' ? 'post' : activeTab === 'reels' ? 'reel' : 'story')}
                                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full font-semibold text-sm hover:bg-red-700 transition active:scale-95"
                                >
                                    <IoTrashOutline size={18} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecentlyDeleted;
