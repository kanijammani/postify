import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { AiOutlineHeart, AiFillHeart, AiOutlineMessage } from 'react-icons/ai';
import { BsBookmark, BsBookmarkFill, BsThreeDots, BsThreeDotsVertical, BsEmojiSmile } from 'react-icons/bs';
import EmojiPicker from 'emoji-picker-react';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { FaRegPaperPlane } from 'react-icons/fa';


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

const PostDetailModal = ({ post: initialPost, onClose, onRefresh, onDelete }) => {
    const { user, updateUser } = useAuth();
    const [post, setPost] = useState(initialPost);
    const [commentText, setCommentText] = useState('');
    const [openCommentMenuId, setOpenCommentMenuId] = useState(null);
    const [showPostOptions, setShowPostOptions] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isLiked, setIsLiked] = useState(initialPost?.likes?.includes(user?._id) || false);
    const isSaved = user?.savedPosts?.includes(post?._id);

    const handleLike = async () => {
        try {
            const { data } = await api.put(`/posts/${post._id}/like`);
            setIsLiked(!isLiked);
            setPost({ ...post, likes: data });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            const { data } = await api.post(`/posts/${post._id}/comment`, { text: commentText });
            setPost({ ...post, comments: [...post.comments, data] });
            setCommentText('');
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        try {
            const { data } = await api.put(`/posts/${post._id}/save`);
            updateUser({ savedPosts: data.savedPosts });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white z-50"><MdClose size={30} /></button>

            <div className="bg-black border border-white/20 w-full max-w-5xl h-[90vh] flex flex-col md:flex-row rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Media Section */}
                <div className="flex-grow bg-black flex items-center justify-center overflow-hidden h-1/2 md:h-full">
                    {post.imageUrl ? (
                        <img src={post.imageUrl} alt="post" className="max-h-full max-w-full object-contain" />
                    ) : (
                        <video src={post.videoUrl} controls className="max-h-full max-w-full object-contain" />
                    )}
                </div>

                {/* Info Section */}
                <div className="w-full md:w-[400px] flex flex-col bg-black text-white h-1/2 md:h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-white/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={post?.userId?.profilePic || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                            <Link to={`/profile/${post?.userId?.username}`} className="font-semibold text-sm hover:opacity-70">{post?.userId?.username}</Link>
                        </div>
                        <div className="relative">
                            <button onClick={() => setShowPostOptions(!showPostOptions)}><BsThreeDots /></button>
                            {showPostOptions && (
                                <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-800 border border-white/10 rounded shadow-xl z-20 overflow-hidden">
                                    {user?._id === post?.userId?._id && onDelete && (
                                        <button onClick={onDelete} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-red-500">
                                            Delete Post
                                        </button>
                                    )}
                                    <button onClick={() => alert("Link copied")} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-white">
                                        Copy Link
                                    </button>
                                    <button onClick={() => setShowPostOptions(false)} className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-gray-400">
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comments section */}
                    <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
                        {/* Caption */}
                        <div className="flex gap-3">
                            <img src={post?.userId?.profilePic || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                            <div className="text-sm">
                                <span className="font-semibold mr-2">{post?.userId?.username}</span>
                                <span>{processText(post?.caption)}</span>
                                <div className="text-gray-400 text-xs mt-1">{post?.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}</div>
                            </div>
                        </div>

                        {/* Real Comments */}
                        {post?.comments?.map((comment, i) => (
                            <div key={i} className="flex gap-3">
                                <img src={comment?.userId?.profilePic || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                                <div className="text-sm">
                                    <span className="font-semibold mr-2">{comment?.userId?.username}</span>
                                    <span>{processText(comment?.text)}</span>
                                    <div className="text-gray-400 text-xs mt-1">{comment?.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}</div>
                                </div>

                                <div className="ml-auto relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setOpenCommentMenuId(openCommentMenuId === i ? null : i); }}
                                        className="text-gray-500 hover:text-white p-1"
                                    >
                                        <BsThreeDotsVertical size={14} />
                                    </button>

                                    {openCommentMenuId === i && (
                                        <div className="absolute top-5 right-0 bg-zinc-800 border border-white/10 rounded shadow-xl z-10 w-24 overflow-hidden">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(comment.text);
                                                    setOpenCommentMenuId(null);
                                                    // Assuming we can't import toast easily here without context, let's try assuming window.alert or passing toast
                                                    // But PostDetailModal is a component, so we can likely use a simple alert or just rely on the UI closing.
                                                    // Wait, we imported toast? No we didn't in PostDetailModal.
                                                    // Let's rely on visual feedback of menu closing + maybe simple alert if strictly needed, but text 'Copied' is better.
                                                    // Actually, let's just make sure it copies.
                                                    alert("Copied to clipboard");
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white border-b border-white/5"
                                            >
                                                Copy
                                            </button>
                                            {(user?._id === comment?.userId?._id || user?._id === post?.userId?._id) && (
                                                <button onClick={() => {
                                                    if (window.confirm("Delete this comment?")) {
                                                        api.delete(`/posts/${post._id}/comment/${comment._id}`)
                                                            .then(() => {
                                                                setPost({ ...post, comments: post.comments.filter(c => c._id !== comment._id) });
                                                                setOpenCommentMenuId(null);
                                                                if (onRefresh) onRefresh();
                                                            })
                                                            .catch(console.error);
                                                    }
                                                }} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-red-400">
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-white/20">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-4">
                                <button onClick={handleLike}>
                                    {isLiked ? <AiFillHeart size={24} className="text-red-500" /> : <AiOutlineHeart size={24} />}
                                </button>
                                <button><AiOutlineMessage size={24} /></button>
                                <button><FaRegPaperPlane size={22} className="-rotate-12 mt-[-2px]" /></button>
                                {/* Removed Delete Button Here */}
                            </div>
                            <button onClick={handleSave}>
                                {isSaved ? <BsBookmarkFill size={22} /> : <BsBookmark size={22} />}
                            </button>
                        </div>
                        <div className="font-semibold text-sm">{post?.likes?.length || 0} likes</div>
                    </div>

                    {/* Add Comment */}
                    <form onSubmit={handleComment} className="p-4 border-t border-white/20 flex items-center relative gap-2">
                        {showEmojiPicker && (
                            <div className="absolute bottom-16 left-4 z-50">
                                <EmojiPicker
                                    theme="dark"
                                    onEmojiClick={(emojiObject) => setCommentText(prev => prev + emojiObject.emoji)}
                                />
                            </div>
                        )}
                        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-400 hover:text-white">
                            <BsEmojiSmile size={24} />
                        </button>
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            className="flex-grow bg-transparent text-sm outline-none placeholder-gray-500"
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                        />
                        <button type="submit" className="text-blue-500 font-semibold disabled:opacity-50" disabled={!commentText.trim()}>Post</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PostDetailModal;
