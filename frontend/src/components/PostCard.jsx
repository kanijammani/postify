import React, { useState } from 'react';
import PostDetailModal from './PostDetailModal';
import { AiOutlineHeart, AiFillHeart, AiOutlineMessage, AiOutlineShareAlt } from 'react-icons/ai';
import { BsBookmark, BsBookmarkFill, BsThreeDots } from 'react-icons/bs';
import { FaRegPaperPlane } from 'react-icons/fa';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import ShareModal from './ShareModal';

// Utility to format date (e.g. "2d", "1h")
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}d`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m`;
};

// Helper to format text with @mentions
const processText = (text) => {
    if (!text) return '';
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
        if (part.match(/^@\w+$/)) {
            const username = part.substring(1);
            return (
                <Link key={index} to={`/profile/${username}`} className="text-blue-500 hover:text-blue-400 font-medium">
                    {part}
                </Link>
            );
        }
        return part;
    });
};

const PostCard = ({ post, refreshPosts }) => {
    const { user, updateUser } = useAuth();
    const [commentText, setCommentText] = useState('');
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const isLiked = post.likes.includes(user?._id);
    const isSaved = user?.savedPosts?.includes(post._id);

    const handleLike = async () => {
        try {
            await api.put(`/posts/${post._id}/like`);
            refreshPosts();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        try {
            const { data } = await api.put(`/posts/${post._id}/save`);
            updateUser({ savedPosts: data.savedPosts });
            toast.success(isSaved ? 'Post Unsaved' : 'Post Saved');
        } catch (error) {
            console.error(error);
        }
    }

    const handleComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            await api.post(`/posts/${post._id}/comment`, { text: commentText });
            setCommentText('');
            refreshPosts();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm("Move post to recently deleted?")) return;
        try {
            await api.delete(`/posts/${post._id}`);
            toast.success("Post moved to recently deleted");
            if (refreshPosts) refreshPosts();
            setShowDetailModal(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete post");
        }
    };

    return (
        <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-lg mb-4 text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-3">
                <Link to={post?.userId?.username ? `/profile/${post.userId.username}` : '#'} className="flex items-center gap-2">
                    <img src={post?.userId?.profilePic || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-semibold text-sm">{post?.userId?.username || 'Unknown'}</span>
                    <span className="text-gray-300 text-xs">• {post?.createdAt ? formatDate(post.createdAt) : ''}</span>
                </Link>
                {user?._id === post?.userId?._id && (
                    <button onClick={handleDeletePost} className="text-gray-500 hover:text-red-500 transition" title="Delete Post">
                        <BsThreeDots />
                    </button>
                )}
            </div>

            {/* Media */}
            <div className="w-full aspect-square bg-black flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => setShowDetailModal(true)}>
                {post.imageUrl && <img src={post.imageUrl} alt="post" className="w-full h-full object-cover" />}
                {post.videoUrl && (
                    <video src={post.videoUrl} controls className="w-full h-full object-contain" />
                )}
            </div>

            {/* Actions */}
            <div className="p-3">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4">
                        <button onClick={handleLike}>
                            {isLiked ? <AiFillHeart size={24} className="text-red-500" /> : <AiOutlineHeart size={24} />}
                        </button>
                        <button onClick={() => setShowDetailModal(true)}>
                            <AiOutlineMessage size={24} />
                        </button>
                        <button onClick={() => setShowShareModal(true)}>
                            <FaRegPaperPlane size={22} />
                        </button>
                    </div>
                    <button onClick={handleSave}>
                        {isSaved ? <BsBookmarkFill size={22} className="text-white" /> : <BsBookmark size={22} />}
                    </button>
                </div>

                <div className="font-semibold text-sm mb-1">{post?.likes?.length || 0} likes</div>

                <div className="text-sm mb-1">
                    <span className="font-semibold mr-2">{post?.userId?.username}</span>
                    <span>{processText(post?.caption)}</span>
                </div>

                {post?.comments?.length > 0 && (
                    <div className="text-gray-300 text-sm cursor-pointer mb-1">View all {post.comments.length} comments</div>
                )}

                {post?.comments?.slice(-2).map((comment, i) => (
                    <div key={i} className="text-sm">
                        <span className="font-semibold mr-2">{comment?.userId?.username}</span>
                        <span>{processText(comment?.text)}</span>
                    </div>
                ))}

                <form onSubmit={handleComment} className="mt-2 flex items-center border-t border-white/20 pt-2">
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-grow text-sm outline-none bg-transparent text-white placeholder-gray-400"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                    />
                    <button type="submit" className="text-blue-500 text-sm font-semibold ml-2 disabled:opacity-50" disabled={!commentText.trim()}>Post</button>
                </form>
            </div>

            {showDetailModal && (
                <PostDetailModal
                    post={post}
                    onClose={() => setShowDetailModal(false)}
                    onRefresh={refreshPosts}
                    onDelete={handleDeletePost}
                />
            )}
            {showShareModal && (
                <ShareModal
                    post={post}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    );
};

export default PostCard;
