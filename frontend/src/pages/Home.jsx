import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import { AiOutlineUser } from 'react-icons/ai';
import { IoTrashOutline } from 'react-icons/io5';
import PostCard from '../components/PostCard';
import { toast } from 'react-toastify';

const Home = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [stories, setStories] = useState([]);
    const [viewingStoryGroup, setViewingStoryGroup] = useState(null);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const storyInputRef = React.useRef(null);

    const fetchPosts = async (signal) => {
        try {
            const { data } = await api.get('/posts', { signal });
            setPosts(Array.isArray(data) ? data : []);
        } catch (error) {
            if (error.name !== 'CanceledError') console.error(error);
        }
    };

    const fetchStories = async (signal) => {
        try {
            const { data } = await api.get('/stories', { signal });
            setStories(Array.isArray(data) ? data : []);
        } catch (error) {
            if (error.name !== 'CanceledError') console.error(error);
        }
    };

    const handleStoryUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            await api.post('/stories', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchStories();
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload story");
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchPosts(controller.signal);
        fetchStories(controller.signal);
        return () => controller.abort();
    }, []);

    const openStories = (group) => {
        setViewingStoryGroup(group);
        setCurrentStoryIndex(0);
    };

    const handleDeleteStory = async (storyId) => {
        if (!window.confirm("Delete this story?")) return;
        try {
            await api.delete(`/stories/${storyId}`);
            // Update local state
            const updatedStories = stories.map(group => {
                if (String(group.user._id) === String(user?._id)) {
                    return {
                        ...group,
                        stories: group.stories.filter(s => s._id !== storyId)
                    };
                }
                return group;
            }).filter(group => group.stories.length > 0);

            setStories(updatedStories);

            // Handle viewer state
            if (viewingStoryGroup && String(viewingStoryGroup.user._id) === String(user?._id)) {
                const updatedGroupStories = viewingStoryGroup.stories.filter(s => s._id !== storyId);
                if (updatedGroupStories.length === 0) {
                    setViewingStoryGroup(null);
                } else {
                    setViewingStoryGroup({ ...viewingStoryGroup, stories: updatedGroupStories });
                    if (currentStoryIndex >= updatedGroupStories.length) {
                        setCurrentStoryIndex(updatedGroupStories.length - 1);
                    }
                }
            }
            toast.success("Story moved to recently deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete story");
        }
    };

    return (
        <div className="flex bg-transparent min-h-screen justify-center py-4 md:py-8">
            <div className="w-full max-w-[470px] flex flex-col gap-4">
                {/* Stories Section */}
                <div className="flex gap-4 overflow-x-auto p-4 bg-black/40 backdrop-blur-md border border-white/20 md:rounded-lg no-scrollbar items-center">
                    {/* Add/My Story Circle */}
                    <div className="flex flex-col items-center gap-1 min-w-[64px]">
                        <div
                            className={`w-16 h-16 rounded-full p-[2px] cursor-pointer ${stories.find(group => String(group.user._id) === String(user?._id)) ? 'bg-gradient-to-tr from-yellow-400 to-purple-600' : 'border-2 border-gray-500 border-dashed'}`}
                            onClick={() => {
                                const myStory = stories.find(group => String(group.user._id) === String(user?._id));
                                if (myStory) openStories(myStory);
                                else storyInputRef.current.click();
                            }}
                        >
                            <div className="w-full h-full bg-black rounded-full p-[2px] flex items-center justify-center relative">
                                {user?.profilePic ? (
                                    <img src={user.profilePic} className="w-full h-full rounded-full object-cover" alt="your story" />
                                ) : (
                                    <div className="w-full h-full bg-white/10 rounded-full flex items-center justify-center">
                                        <AiOutlineUser size={30} className="text-gray-400" />
                                    </div>
                                )}
                                {isUploading ? (
                                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : !stories.find(group => String(group.user._id) === String(user?._id)) && (
                                    <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full border-2 border-black p-0.5 pointer-events-none">
                                        <span className="text-white text-[10px] leading-none">+</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className="text-xs truncate w-16 text-center text-white">Your story</span>
                        <input
                            type="file"
                            ref={storyInputRef}
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={handleStoryUpload}
                        />
                    </div>

                    {/* Following Stories */}
                    {stories.filter(group => String(group.user._id) !== String(user?._id)).map((group, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[64px] cursor-pointer" onClick={() => openStories(group)}>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                                <div className="w-16 h-16 bg-black rounded-full p-[2px]">
                                    <img src={group.user.profilePic} className="w-full h-full rounded-full object-cover" alt="story" />
                                </div>
                            </div>
                            <span className="text-xs truncate w-16 text-center text-white">{group.user.username}</span>
                        </div>
                    ))}
                </div>

                {/* Posts Feed */}
                <div className="flex flex-col gap-4">
                    {posts.map((post) => (
                        <PostCard key={post._id} post={post} refreshPosts={fetchPosts} />
                    ))}
                    {posts.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-gray-300">No posts yet. Follow someone or create a post!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Story Viewer Modal */}
            {viewingStoryGroup && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[100] cursor-pointer"
                    onClick={() => setViewingStoryGroup(null)}
                >
                    <div className="absolute top-6 right-6 flex flex-col gap-4 z-[110]">
                        <button
                            onClick={(e) => { e.stopPropagation(); setViewingStoryGroup(null); }}
                            className="text-white text-4xl hover:text-gray-300"
                        >
                            ×
                        </button>
                        {String(viewingStoryGroup.user._id) === String(user?._id) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteStory(viewingStoryGroup.stories[currentStoryIndex]._id); }}
                                className="text-red-500 bg-white/10 p-2 rounded-full hover:bg-white/20 transition flex items-center justify-center"
                                title="Delete Story"
                            >
                                <IoTrashOutline size={20} />
                            </button>
                        )}
                    </div>

                    <div
                        className="relative w-full max-w-md h-[90vh] md:h-[80vh] flex flex-col cursor-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Progress Bar */}
                        <div className="flex gap-1 px-2 mb-4">
                            {viewingStoryGroup.stories.map((_, idx) => (
                                <div key={idx} className="h-1 flex-grow bg-gray-600 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-white transition-all ease-linear ${idx < currentStoryIndex ? 'w-full' : idx === currentStoryIndex ? 'w-full' : 'w-0'}`}
                                        style={{ transitionDuration: idx === currentStoryIndex ? '5s' : '0s' }}
                                    ></div>
                                </div>
                            ))}
                        </div>

                        {/* Story Content Area */}
                        <div className="flex-grow flex items-center justify-center relative group">
                            {/* Tap Targets */}
                            <div
                                className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer"
                                onClick={() => currentStoryIndex > 0 && setCurrentStoryIndex(currentStoryIndex - 1)}
                            ></div>
                            <div
                                className="absolute right-0 top-0 w-2/3 h-full z-10 cursor-pointer"
                                onClick={() => {
                                    if (currentStoryIndex < viewingStoryGroup.stories.length - 1) {
                                        setCurrentStoryIndex(currentStoryIndex + 1);
                                    } else {
                                        setViewingStoryGroup(null);
                                    }
                                }}
                            ></div>

                            {viewingStoryGroup.stories[currentStoryIndex].type === 'video' ? (
                                <video
                                    src={viewingStoryGroup.stories[currentStoryIndex].imageUrl}
                                    autoPlay
                                    className="max-h-full max-w-full object-contain"
                                    onEnded={() => {
                                        if (currentStoryIndex < viewingStoryGroup.stories.length - 1) {
                                            setCurrentStoryIndex(currentStoryIndex + 1);
                                        } else {
                                            setViewingStoryGroup(null);
                                        }
                                    }}
                                />
                            ) : (
                                <img
                                    src={viewingStoryGroup.stories[currentStoryIndex].imageUrl}
                                    alt="story"
                                    className="max-h-full max-w-full object-contain"
                                />
                            )}

                            {/* Simple timer to advance image stories */}
                            {viewingStoryGroup.stories[currentStoryIndex].type !== 'video' && (
                                <StoryTimer
                                    key={currentStoryIndex} // Use key to reset timer on manual nav
                                    onComplete={() => {
                                        if (currentStoryIndex < viewingStoryGroup.stories.length - 1) {
                                            setCurrentStoryIndex(currentStoryIndex + 1);
                                        } else {
                                            setViewingStoryGroup(null);
                                        }
                                    }}
                                />
                            )}
                        </div>

                        <div className="p-4 flex items-center gap-3">
                            <img src={viewingStoryGroup.user.profilePic} className="w-8 h-8 rounded-full border border-white" />
                            <div className="flex flex-col">
                                <span className="text-white font-semibold text-sm">{viewingStoryGroup.user.username}</span>
                                <span className="text-gray-400 text-[10px]">
                                    {new Date(viewingStoryGroup.stories[currentStoryIndex].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StoryTimer = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 5000);
        return () => clearTimeout(timer);
    }, [onComplete]);
    return null;
};

export default Home;
