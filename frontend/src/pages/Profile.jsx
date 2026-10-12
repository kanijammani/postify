import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AiOutlineUser, AiOutlineInfoCircle, AiOutlinePlus, AiFillHeart, AiFillMessage } from 'react-icons/ai';
import { MdClose } from 'react-icons/md';
import { BsGrid3X3, BsBookmark } from 'react-icons/bs';
import { BiMoviePlay } from 'react-icons/bi';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { toast } from 'react-toastify';
import PostDetailModal from '../components/PostDetailModal';
import { IoLockClosedOutline } from 'react-icons/io5';

const Profile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, updateUser: updateAuthUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [savedPosts, setSavedPosts] = useState([]);
    const [stories, setStories] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [activeTab, setActiveTab] = useState('posts'); // posts, reels, saved
    const [showAbout, setShowAbout] = useState(false);
    const [isUploadingStory, setIsUploadingStory] = useState(false);
    const [viewingStories, setViewingStories] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);
    const [editForm, setEditForm] = useState({ username: '', bio: '', note: '' });
    const [editFile, setEditFile] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const storyInputRef = useRef(null);

    const fetchProfileData = async (signal) => {
        try {
            const { data: userData } = await api.get(`/users/${username}`, { signal });
            setProfile(userData);

            if (userData.isBlocked) {
                toast.error("This user has blocked you");
                navigate('/');
                return;
            }

            const followersList = Array.isArray(userData.followers) ? userData.followers.map(f => typeof f === 'object' ? f._id : f) : [];
            setIsFollowing(followersList.includes(currentUser?._id));
            setEditForm({
                username: userData.username,
                bio: userData.bio || '',
                note: userData.note || ''
            });

            if (!userData.isPrivateRestricted) {
                const { data: postsData } = await api.get(`/posts/user/${username}`, { signal });
                setPosts(Array.isArray(postsData) ? postsData : []);

                const { data: storiesData } = await api.get(`/stories/user/${userData._id}`, { signal });
                setStories(Array.isArray(storiesData) ? storiesData : []);
            } else {
                setPosts([]);
                setStories([]);
            }
        } catch (error) {
            if (error.name === 'CanceledError') return;
            if (error.response?.status === 403) {
                toast.error(error.response.data.message || "Access denied");
                navigate('/');
            } else {
                console.error(error);
                toast.error("Error loading profile");
            }
        }
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchSavedPosts = async (signal) => {
            if (currentUser?.username === username) {
                try {
                    const { data } = await api.get('/posts/saved', { signal });
                    setSavedPosts(Array.isArray(data) ? data : []);
                } catch (error) {
                    if (error.name !== 'CanceledError') {
                        console.error("Error fetching saved posts", error);
                    }
                }
            }
        };

        if (username) {
            setProfile(null); // Clear previous profile to show loading state
            setPosts([]);
            setStories([]);
            fetchProfileData(controller.signal);
            fetchSavedPosts(controller.signal);
        }

        return () => controller.abort();
    }, [username, currentUser?._id]); // Only refetch if username or logged in user ID changes

    const handleStoryUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploadingStory(true);
        try {
            const { data } = await api.post('/stories', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStories(prev => [...prev, data]);
            toast.success("Story added!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload story");
        } finally {
            setIsUploadingStory(false);
        }
    };

    const handleFollow = async () => {
        if (!profile?._id) return;
        try {
            await api.put(`/users/${profile._id}/follow`);
            fetchProfileData();
        } catch (error) {
            console.error(error);
            toast.error("Follow action failed");
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        const formData = new FormData();
        formData.append('username', editForm.username);
        formData.append('bio', editForm.bio);
        formData.append('note', editForm.note);
        if (editFile) {
            formData.append('profilePic', editFile);
        }

        try {
            const { data } = await api.put('/users/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setProfile(prev => ({ ...prev, ...data }));
            updateAuthUser(data);
            setShowEditModal(false);
            toast.success("Profile updated!");
        } catch (error) {
            console.error(error);
            toast.error("Update failed");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Move post to recently deleted?")) return;
        try {
            await api.delete(`/posts/${postId}`);
            setPosts(prev => prev.filter(p => p._id !== postId));
            setSavedPosts(prev => prev.filter(p => p._id !== postId));
            setSelectedPost(null);
            toast.success("Post deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete post");
        }
    };

    const handleDeleteStory = async (storyId) => {
        if (!window.confirm("Delete this story?")) return;
        try {
            await api.delete(`/stories/${storyId}`);
            const updatedStories = stories.filter(s => s._id !== storyId);
            setStories(updatedStories);
            if (updatedStories.length === 0) {
                setViewingStories(false);
            } else if (currentStoryIndex >= updatedStories.length) {
                setCurrentStoryIndex(updatedStories.length - 1);
            }
            toast.success("Story deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete story");
        }
    };

    // Auto-advance stories
    useEffect(() => {
        if (viewingStories && stories[currentStoryIndex]?.type !== 'video') {
            const timer = setTimeout(() => {
                if (currentStoryIndex < stories.length - 1) {
                    setCurrentStoryIndex(prev => prev + 1);
                } else {
                    setViewingStories(false);
                    setCurrentStoryIndex(0);
                }
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentStoryIndex, viewingStories, stories]);

    if (!profile) return <div className="p-20 text-center text-white">Loading Profile...</div>;

    const formattedDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

    return (
        <div className="flex min-h-screen bg-transparent justify-center">
            <div className="flex-grow p-4 md:p-8 w-full max-w-6xl">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-center md:items-start md:gap-24 mb-12">
                        <div className="relative group">
                            {/* Note Bubble */}
                            {(profile.note || (currentUser?._id === profile._id)) && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 w-full flex justify-center">
                                    <div
                                        onClick={() => currentUser?._id === profile._id && setShowEditModal(true)}
                                        className={`bg-white/20 backdrop-blur-lg px-4 py-2 rounded-2xl border border-white/30 text-xs text-white max-w-[150px] shadow-lg transition-all hover:scale-105 active:scale-95 ${currentUser?._id === profile._id ? 'cursor-pointer hover:bg-white/30' : ''}`}
                                    >
                                        <p className="line-clamp-2 italic text-center">
                                            {profile.note || (currentUser?._id === profile._id ? "Leave a note..." : "")}
                                        </p>
                                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/20 border-r border-b border-white/30 rotate-45 backdrop-blur-lg"></div>
                                    </div>
                                </div>
                            )}
                            <div
                                onClick={() => stories.length > 0 && setViewingStories(true)}
                                className={`w-20 h-20 md:w-36 md:h-36 rounded-full overflow-hidden mb-4 md:mb-0 border-2 cursor-pointer ${stories.length > 0 ? 'border-pink-500 p-1' : 'border-gray-300'}`}
                            >
                                {profile.profilePic ? (
                                    <img src={profile.profilePic} alt="profile" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-full">
                                        <AiOutlineUser size={50} className="text-gray-400" />
                                    </div>
                                )}
                                {isUploadingStory && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            {currentUser?._id === profile._id && (
                                <div
                                    onClick={() => storyInputRef.current?.click()}
                                    className="absolute bottom-4 right-0 md:bottom-2 md:right-2 bg-blue-500 rounded-full p-1 border-2 border-black cursor-pointer hover:bg-blue-600 transition"
                                >
                                    <AiOutlinePlus size={16} className="text-white" />
                                </div>
                            )}
                            <input
                                type="file"
                                ref={storyInputRef}
                                className="hidden"
                                accept="image/*,video/*"
                                onChange={handleStoryUpload}
                            />
                        </div>

                        <div className="flex flex-col gap-4 items-center md:items-start flex-grow">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl md:text-2xl font-light">{profile.username}</h2>
                                {currentUser?._id === profile._id ? (
                                    <>
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="bg-zinc-800 px-4 py-1.5 rounded-lg font-semibold text-sm border border-white/10 hover:bg-zinc-700 transition text-white"
                                        >
                                            Edit Profile
                                        </button>
                                        <button className="bg-zinc-800 px-4 py-1.5 rounded-lg font-semibold text-sm border border-white/10 hover:bg-zinc-700 transition text-white">View Archive</button>
                                    </>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleFollow}
                                            className={`${isFollowing ? 'bg-zinc-800 text-white border-white/10' : 'bg-blue-500 text-white'} px-6 py-1.5 rounded-lg font-semibold text-sm border transition`}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                        <button onClick={() => navigate('/direct/inbox')} className="bg-zinc-800 px-6 py-1.5 rounded-lg font-semibold text-sm border border-white/10 hover:bg-zinc-700 transition text-white">Message</button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-10 text-base">
                                <span><span className="font-semibold">{profile.isPrivateRestricted ? 0 : (posts?.length || 0)}</span> posts</span>
                                <span onClick={() => !profile.isPrivateRestricted && setShowFollowers(true)} className={`${profile.isPrivateRestricted ? 'cursor-default' : 'cursor-pointer hover:opacity-70'} transition`}><span className="font-semibold">{profile?.followers?.length || 0}</span> followers</span>
                                <span onClick={() => !profile.isPrivateRestricted && setShowFollowing(true)} className={`${profile.isPrivateRestricted ? 'cursor-default' : 'cursor-pointer hover:opacity-70'} transition`}><span className="font-semibold">{profile?.following?.length || 0}</span> following</span>
                            </div>

                            <div>
                                <div className="font-semibold">{profile.username}</div>
                                {!profile.isPrivateRestricted ? (
                                    <>
                                        <div className="whitespace-pre-wrap text-sm">{profile.bio}</div>
                                        <button onClick={() => setShowAbout(true)} className="text-xs font-semibold mt-2 flex items-center gap-1 text-gray-400 hover:text-white transition"><AiOutlineInfoCircle /> About this account</button>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Profile details hidden</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    {profile.isPrivateRestricted ? (
                        <div className="flex flex-col items-center justify-center py-20 border-t border-white/10 mt-10 text-center">
                            <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center mb-6">
                                <IoLockClosedOutline size={40} className="text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">This Account is Private</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">Follow this account to see their photos and videos.</p>
                        </div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div className="border-t border-white/20 flex justify-center gap-12 text-sm font-semibold tracking-widest text-gray-500 mb-4">
                                <div onClick={() => setActiveTab('posts')} className={`flex items-center gap-2 border-t py-4 cursor-pointer transition ${activeTab === 'posts' ? 'border-white text-white' : 'border-transparent hover:text-gray-300'}`}>
                                    <BsGrid3X3 size={12} /> POSTS
                                </div>
                                <div onClick={() => setActiveTab('reels')} className={`flex items-center gap-2 border-t py-4 cursor-pointer transition ${activeTab === 'reels' ? 'border-white text-white' : 'border-transparent hover:text-gray-300'}`}>
                                    <BiMoviePlay size={12} /> REELS
                                </div>
                                {currentUser?._id === profile._id && (
                                    <div onClick={() => setActiveTab('saved')} className={`flex items-center gap-2 border-t py-4 cursor-pointer transition ${activeTab === 'saved' ? 'border-white text-white' : 'border-transparent hover:text-gray-300'}`}>
                                        <BsBookmark size={12} /> SAVED
                                    </div>
                                )}
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-3 gap-1 md:gap-7">
                                {(activeTab === 'posts' ? posts : activeTab === 'reels' ? posts.filter(p => p.videoUrl) : savedPosts).map((post) => (
                                    <div key={post._id} onClick={() => setSelectedPost(post)} className="relative aspect-square group cursor-pointer bg-zinc-900 border border-white/5 overflow-hidden rounded-sm">
                                        {post.imageUrl ? (
                                            <img src={post.imageUrl} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" alt="post" />
                                        ) : (
                                            <video src={post.videoUrl} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center gap-6 text-white font-bold">
                                            <div className="flex items-center gap-2"><AiFillHeart size={20} /> {post?.likes?.length || 0}</div>
                                            <div className="flex items-center gap-2"><AiFillMessage size={20} /> {post?.comments?.length || 0}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {posts.length === 0 && (
                                <div className="text-center py-20">
                                    <BsGrid3X3 size={64} className="mx-auto text-zinc-800 mb-4" />
                                    <p className="text-xl text-zinc-600 font-light uppercase tracking-widest">No Posts Yet</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showAbout && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm" onClick={() => setShowAbout(false)}>
                    <div className="bg-zinc-900 border border-white/20 rounded-xl w-full max-w-sm p-6 text-center text-white" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-6">About This Account</h3>
                        <div className="flex flex-col gap-6 text-left">
                            <div className="flex items-center gap-4">
                                <BsGrid3X3 className="text-gray-400" />
                                <div>
                                    <span className="text-gray-500 text-xs block uppercase">Date Joined</span>
                                    <span className="font-medium">{formattedDate}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <AiOutlineUser className="text-gray-400" />
                                <div>
                                    <span className="text-gray-500 text-xs block uppercase">Username</span>
                                    <span className="font-medium">{profile.username}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setShowAbout(false)} className="mt-8 text-white font-bold border-t border-white/10 w-full pt-4 hover:text-gray-300 transition">Close</button>
                    </div>
                </div>
            )}

            {viewingStories && stories.length > 0 && (
                <div className="fixed inset-0 bg-black flex items-center justify-center z-[110]">
                    <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                        {currentUser?._id === profile._id && (
                            <button
                                onClick={() => handleDeleteStory(stories[currentStoryIndex]._id)}
                                className="text-red-500 bg-white/10 p-2 rounded-full hover:bg-white/20 transition"
                                title="Delete Story"
                            >
                                <MdClose size={24} />
                            </button>
                        )}
                        <button onClick={() => setViewingStories(false)} className="text-white text-4xl hover:text-gray-300 transition">×</button>
                    </div>
                    <div className="relative w-full max-w-md h-[90vh] flex flex-col bg-zinc-950 rounded-xl overflow-hidden shadow-2xl">
                        <div className="flex gap-1 px-4 mt-4 z-50">
                            {stories.map((_, idx) => (
                                <div key={idx} className="h-1 flex-grow bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-white transition-all ease-linear ${idx < currentStoryIndex ? 'w-full' : idx === currentStoryIndex ? 'w-full' : 'w-0'}`}
                                        style={{ transitionDuration: idx === currentStoryIndex ? '5s' : '0s' }}
                                    ></div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 flex items-center gap-3 z-50">
                            <img src={profile.profilePic || '/default-avatar.png'} className="w-9 h-9 rounded-full border border-white/20 object-cover shadow-sm" />
                            <div className="flex flex-col">
                                <span className="text-white font-semibold text-sm">{profile.username}</span>
                                <span className="text-gray-400 text-[10px]">
                                    {new Date(stories[currentStoryIndex].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                        <div className="flex-grow flex items-center justify-center relative">
                            {stories[currentStoryIndex].type === 'video' ? (
                                <video
                                    src={stories[currentStoryIndex].imageUrl}
                                    autoPlay
                                    className="max-h-full max-w-full object-contain"
                                    onEnded={() => {
                                        if (currentStoryIndex < stories.length - 1) setCurrentStoryIndex(prev => prev + 1);
                                        else setViewingStories(false);
                                    }}
                                />
                            ) : (
                                <img src={stories[currentStoryIndex].imageUrl} alt="story" className="max-h-full max-w-full object-contain" />
                            )}
                            {currentStoryIndex > 0 && (
                                <button onClick={() => setCurrentStoryIndex(prev => prev - 1)} className="absolute left-4 w-10 h-10 flex items-center justify-center text-white bg-black/20 backdrop-blur-md rounded-full hover:bg-black/40 transition">‹</button>
                            )}
                            {currentStoryIndex < stories.length - 1 && (
                                <button onClick={() => setCurrentStoryIndex(prev => prev + 1)} className="absolute right-4 w-10 h-10 flex items-center justify-center text-white bg-black/20 backdrop-blur-md rounded-full hover:bg-black/40 transition">›</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedPost && <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} onRefresh={fetchProfileData} onDelete={() => handleDeletePost(selectedPost._id)} />}

            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden text-white shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-bold text-lg">Edit Profile</h3>
                            <button onClick={() => setShowEditModal(false)} className="hover:text-gray-400 transition"><MdClose size={24} /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 flex flex-col gap-5">
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wider">Profile Picture</label>
                                <div className="flex items-center gap-4">
                                    <img src={editFile ? URL.createObjectURL(editFile) : (profile.profilePic || '/default-avatar.png')} className="w-16 h-16 rounded-full object-cover border border-white/10" alt="preview" />
                                    <input type="file" accept="image/*" onChange={(e) => setEditFile(e.target.files[0])} className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wider">Username</label>
                                <input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wider">Bio</label>
                                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wider">Note (Status)</label>
                                <input type="text" maxLength={60} placeholder="What's on your mind?" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                            </div>
                            <button type="submit" disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-2 transition disabled:opacity-50 shadow-lg shadow-blue-500/20">
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {(showFollowers || showFollowing) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => { setShowFollowers(false); setShowFollowing(false); }}>
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden text-white flex flex-col h-[60vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-bold text-lg">{showFollowers ? 'Followers' : 'Following'}</h3>
                            <button onClick={() => { setShowFollowers(false); setShowFollowing(false); }} className="hover:text-gray-400 transition"><MdClose size={24} /></button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 no-scrollbar">
                            {(showFollowers ? profile.followers : profile.following).map(u => (
                                <div key={u._id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition" onClick={() => { setShowFollowers(false); setShowFollowing(false); navigate(`/profile/${u.username}`); }}>
                                    <img src={u.profilePic || '/default-avatar.png'} alt="pic" className="w-11 h-11 rounded-full object-cover border border-white/10 shadow-sm" />
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">{u.username}</span>
                                        <span className="text-gray-500 text-xs">Recently active</span>
                                    </div>
                                </div>
                            ))}
                            {(showFollowers ? profile.followers : profile.following).length === 0 && (
                                <div className="text-center py-20 text-gray-500 text-sm italic">No users found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
