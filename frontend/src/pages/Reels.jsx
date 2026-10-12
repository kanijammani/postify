import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineHeart, AiFillHeart, AiOutlineMessage, AiOutlineShareAlt } from 'react-icons/ai';
import { IoTrashOutline } from 'react-icons/io5';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

const ReelItem = ({ reel }) => {
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(reel.likes.includes(user?._id));
    const [likeCount, setLikeCount] = useState(reel.likes.length);
    const videoRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    if (videoRef.current) videoRef.current.play();
                    // Log watch history
                    api.post(`/users/reels/watch/${reel._id}`).catch(() => { });
                } else {
                    if (videoRef.current) videoRef.current.pause();
                }
            },
            { threshold: 0.8 }
        );

        if (videoRef.current) observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, [reel._id]);

    const handleLike = async () => {
        try {
            const { data } = await api.put(`/posts/${reel._id}/like`);
            setIsLiked(!isLiked);
            setLikeCount(data.length);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="h-full w-full relative snap-start flex items-center justify-center bg-black/40 backdrop-blur-sm border-b border-white/10 overflow-hidden">
            {reel.videoUrl ? (
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    className="h-full w-full object-cover"
                    loop
                    playsInline
                    muted={false} // Allow sound for intentional watch
                />
            ) : (
                <img src={reel.imageUrl} className="h-full w-full object-cover" alt="reel" />
            )}

            {/* Overlay Controls */}
            <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                <div className="flex items-center gap-3 mb-4">
                    <img src={reel.userId.profilePic} className="w-10 h-10 rounded-full border-2 border-white/50 shadow-lg object-cover" alt="avatar" />
                    <span className="font-bold text-shadow">{reel.userId.username}</span>
                    <button className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1 rounded-full text-xs font-bold hover:bg-white/20 transition">Follow</button>
                </div>
                <p className="text-sm text-gray-200 line-clamp-2 max-w-[80%]">{reel.caption}</p>
            </div>

            {/* Side Actions */}
            <div className="absolute bottom-24 right-4 flex flex-col gap-6 items-center">
                <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                    <div className={`p-3 rounded-full bg-white/5 backdrop-blur-md transition group-active:scale-90 ${isLiked ? 'text-red-500' : 'text-white'}`}>
                        {isLiked ? <AiFillHeart size={28} /> : <AiOutlineHeart size={28} />}
                    </div>
                    <span className="text-[10px] font-bold text-shadow">{likeCount}</span>
                </button>

                <button className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-white/5 backdrop-blur-md transition text-white">
                        <AiOutlineMessage size={28} />
                    </div>
                    <span className="text-[10px] font-bold text-shadow">{reel.comments.length}</span>
                </button>

                <button className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-white/5 backdrop-blur-md transition text-white">
                        <AiOutlineShareAlt size={28} />
                    </div>
                </button>

                {reel.userId._id === user?._id && (
                    <button onClick={async () => {
                        if (window.confirm("Move this reel to recently deleted?")) {
                            try {
                                await api.delete(`/posts/${reel._id}`);
                                window.location.reload(); // Refresh to remove the reel
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }} className="flex flex-col items-center gap-1 group mt-2">
                        <div className="p-3 rounded-full bg-red-500/20 backdrop-blur-md transition text-red-500 hover:bg-red-500/40">
                            <IoTrashOutline size={28} />
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
};

const Reels = () => {
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReels = async () => {
            try {
                const { data } = await api.get('/posts/explore');
                // For a more "reels" feel, filter for videos specifically
                setReels(data.filter(p => p.videoUrl || p.imageUrl));
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchReels();
    }, []);

    return (
        <div className="flex bg-zinc-950 min-h-[calc(100vh-112px)] md:min-h-screen text-white justify-center overflow-hidden">
            <div className="w-full max-w-md h-[calc(100vh-112px)] md:h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar flex-grow">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                    </div>
                ) : reels.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-10">
                        <AiOutlineShareAlt size={60} className="text-zinc-700 mb-4" />
                        <h2 className="text-xl font-bold mb-2">No reels yet</h2>
                        <p className="text-zinc-500 text-sm">Be the first to share a reel with the world!</p>
                    </div>
                ) : (
                    reels.map((reel) => <ReelItem key={reel._id} reel={reel} />)
                )}
            </div>
        </div>
    );
};

export default Reels;
