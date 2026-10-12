import React, { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import { AiOutlineSearch } from 'react-icons/ai';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { toast } from 'react-toastify';

const ShareModal = ({ post, onClose }) => {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const { data } = await api.get('/chat');
                setChats(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchChats();
    }, []);

    const handleSearch = async (e) => {
        setSearch(e.target.value);
        if (e.target.value.trim().length > 0) {
            setLoading(true);
            try {
                const { data } = await api.get(`/users/search?q=${e.target.value}`);
                setSearchResults(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleSend = async (targetUserOrChat, isChat = true) => {
        setSending(true);
        try {
            let conversationId;

            if (isChat) {
                conversationId = targetUserOrChat._id;
            } else {
                // It's a user, so access/create chat first
                const { data } = await api.post('/chat/conversation', { userId: targetUserOrChat._id });
                conversationId = data._id;
            }

            await api.post('/chat/message', {
                conversationId,
                type: 'post',
                sharedPostId: post._id,
                content: `Shared post by @${post.userId.username}`
            });

            toast.success('Sent!');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to send');
        } finally {
            setSending(false);
        }
    };

    const getOtherUser = (participants) => {
        return participants[0]._id === user._id ? participants[1] : participants[0];
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-white/20 rounded-xl w-full max-w-sm h-[60vh] flex flex-col text-white" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Share</h3>
                    <button onClick={onClose}><MdClose size={24} /></button>
                </div>

                <div className="p-3 border-b border-white/10">
                    <div className="flex items-center bg-zinc-800 rounded-lg px-3 py-1.5 gap-2">
                        <AiOutlineSearch className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search"
                            className="bg-transparent text-sm flex-grow outline-none text-white placeholder-gray-500"
                            value={search}
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-2">
                    {search ? (
                        <>
                            <div className="text-xs text-gray-400 p-2">Search Results</div>
                            {loading ? <div className="p-4 text-center text-sm text-gray-500">Searching...</div> :
                                searchResults.map(u => (
                                    <div key={u._id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <img src={u.profilePic} alt="pic" className="w-10 h-10 rounded-full object-cover" />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{u.username}</span>
                                                <span className="text-gray-400 text-xs">{u.fullname}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleSend(u, false)}
                                            disabled={sending}
                                            className="bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded disabled:opacity-50"
                                        >
                                            Send
                                        </button>
                                    </div>
                                ))
                            }
                        </>
                    ) : (
                        <>
                            <div className="text-xs text-gray-400 p-2">Suggested</div>
                            {chats.map(chat => {
                                const otherUser = getOtherUser(chat.participants);
                                return (
                                    <div key={chat._id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <img src={otherUser.profilePic} alt="pic" className="w-10 h-10 rounded-full object-cover" />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{otherUser.username}</span>
                                                <span className="text-green-500 text-xs">Active now</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleSend(chat, true)}
                                            disabled={sending}
                                            className="bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded disabled:opacity-50"
                                        >
                                            Send
                                        </button>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
