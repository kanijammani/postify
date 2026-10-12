import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { io } from 'socket.io-client';
import { BiImageAdd, BiMicrophone, BiSend } from 'react-icons/bi';
import { BsEye, BsLock, BsThreeDotsVertical, BsPinAngleFill, BsVolumeMuteFill, BsEmojiSmile } from 'react-icons/bs';
import EmojiPicker from 'emoji-picker-react';
import { IoClose } from 'react-icons/io5';
import { toast } from 'react-toastify';

const ENDPOINT = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api').replace('/api', '');
var socket, selectedChatCompare;

const Chat = () => {
    const { user, updateUser } = useAuth();
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [file, setFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isOneTime, setIsOneTime] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // New Message Modal State
    const [showModal, setShowModal] = useState(false);
    const [showChatOptions, setShowChatOptions] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [followingUsers, setFollowingUsers] = useState([]);

    const [socketConnected, setSocketConnected] = useState(false);

    // Helper to get the other user in a conversation
    const getOtherUser = (participants) => {
        return participants.find(p => p._id !== user._id) || {};
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Initialize Socket
    useEffect(() => {
        socket = io(ENDPOINT);
        socket.emit("setup", user);
        socket.on("connected", () => setSocketConnected(true));
        socket.on("message_received", (newMessageReceived) => {
            // Check if deleted message
            if (newMessageReceived.isDeletedForEveryone) {
                setMessages(prev => prev.map(m => m._id === newMessageReceived._id ? newMessageReceived : m));
                return;
            }

            // Update sidebar chats list
            setChats(prevChats => {
                // Check if chat exists in list
                const chatExists = prevChats.find(c => c._id === newMessageReceived.conversationId._id);

                let updatedChats;
                if (chatExists) {
                    updatedChats = prevChats.map(chat =>
                        chat._id === newMessageReceived.conversationId._id
                            ? { ...chat, lastMessage: newMessageReceived, updatedAt: new Date().toISOString() }
                            : chat
                    );
                } else {
                    // If chat doesn't exist (new chat started by someone else), we might need to fetch it or just ignore until refresh.
                    // Ideally we should fetch the conversation details, but for now let's hope it's rare or handled by fetchChats.
                    // Only fetch if we really need to.
                    // For simplicity, we won't add it if it's missing to avoid complexity with missing populated fields.
                    updatedChats = [...prevChats];
                }

                // Sort by last updated (mocking the sort)
                return updatedChats.sort((a, b) => {
                    const dateA = new Date(a.updatedAt || 0);
                    const dateB = new Date(b.updatedAt || 0);
                    return dateB - dateA;
                });
            });

            if (
                !selectedChatCompare ||
                selectedChatCompare._id !== newMessageReceived.conversationId._id
            ) {
                // Notification could be added here
            } else {
                setMessages((prev) => [...prev, newMessageReceived]);
                scrollToBottom();
            }
        });

        socket.on("message_updated", (updatedMessage) => {
            setMessages(prev => prev.map(m => m._id === updatedMessage._id ? updatedMessage : m));
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // Fetch Chats
    const fetchChats = async () => {
        try {
            const { data } = await api.get('/chat');
            setChats(data);
        } catch (error) {
            console.error("Failed to fetch chats", error);
            toast.error("Failed to load chats");
        }
    };

    useEffect(() => {
        fetchChats();
    }, [user]);

    // Fetch Messages when chat selected
    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedChat) return;
            try {
                const { data } = await api.get(`/chat/${selectedChat._id}`);
                setMessages(data);
                scrollToBottom();
                socket.emit("join_chat", selectedChat._id);
                selectedChatCompare = selectedChat;
            } catch (error) {
                toast.error("Failed to load messages");
            }
        };

        fetchMessages();
    }, [selectedChat]);

    // Scroll to bottom on new message
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if ((!newMessage.trim() && !file) || !selectedChat) return;

        const formData = new FormData();
        formData.append('conversationId', selectedChat._id);
        if (newMessage) formData.append('content', newMessage);
        if (file) {
            formData.append('file', file);
            if (file.type.startsWith('image/')) formData.append('type', 'image');
            else if (file.type.startsWith('video/')) formData.append('type', 'video');
            else if (file.type.startsWith('audio/')) formData.append('type', 'audio');
        }
        if (isOneTime) formData.append('isOneTimeView', true);

        try {
            setNewMessage("");
            setFile(null);
            setIsOneTime(false);

            const { data } = await api.post('/chat/message', formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            socket.emit("new message", data);
            setMessages([...messages, data]);

            // Update last message in chat list
            setChats(prevChats => {
                const updatedChats = prevChats.map(c =>
                    c._id === selectedChat._id
                        ? { ...c, lastMessage: data, updatedAt: new Date().toISOString() }
                        : c
                );
                return updatedChats.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
            });
        } catch (error) {
            toast.error("Failed to send message");
            console.error(error);
        }
    };

    // Modal - Fetch Following
    useEffect(() => {
        if (showModal) {
            const fetchFollowing = async () => {
                try {
                    const { data } = await api.get(`/users/${user.username}`);
                    setFollowingUsers(data.following || []);
                } catch (error) {
                    console.error("Failed to fetch following", error);
                }
            }
            fetchFollowing();
        }
    }, [showModal, user.username]);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            const { data } = await api.get(`/users/search?q=${query}`);
            setSearchResults(data);
        } catch (error) {
            console.error(error);
        }
    };

    const startNewChat = async (targetUserId) => {
        try {
            const { data } = await api.post('/chat/conversation', { userId: targetUserId });
            if (!chats.find(c => c._id === data._id)) {
                setChats([data, ...chats]);
            }
            setSelectedChat(data);
            setShowModal(false);
            setSearchQuery("");
            setSearchResults([]);
        } catch (error) {
            toast.error("Failed to start conversation");
        }
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
        }
    };

    // Basic View Once Handler (just updates UI state strictly for this session if needed, or calls API)
    const handleViewOneTime = async (msgId) => {
        try {
            await api.put(`/chat/message/${msgId}/view`);
            // Refresh messages to show it as viewed/expired
            const { data } = await api.get(`/chat/${selectedChat._id}`);
            setMessages(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteMessage = async (msgId, type) => {
        if (!window.confirm(`Delete for ${type === 'me' ? 'me' : 'everyone'}?`)) return;
        try {
            const { data } = await api.put(`/chat/message/${msgId}/delete`, { type });
            setOpenMenuId(null);
            // Update local state
            if (type === 'me') {
                setMessages(prev => prev.filter(m => m._id !== msgId));
            } else {
                setMessages(prev => prev.map(m => m._id === msgId ? data : m));
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to delete message");
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.info("Copied to clipboard");
        setOpenMenuId(null);
    };

    const handleChatAction = async (action) => {
        if (!selectedChat) return;
        try {
            if (action === 'delete') {
                if (!window.confirm("Delete this conversation?")) return;
                await api.put(`/chat/conversation/${selectedChat._id}/delete`);
                setChats(prev => prev.filter(c => c._id !== selectedChat._id));
                setSelectedChat(null);
                toast.success("Conversation deleted");
            } else if (action === 'mute') {
                const { data } = await api.put(`/chat/conversation/${selectedChat._id}/mute`);
                setSelectedChat(data); // update current view
                setChats(prev => prev.map(c => c._id === data._id ? data : c));
            } else if (action === 'pin') {
                const { data } = await api.put(`/chat/conversation/${selectedChat._id}/pin`);
                setChats(prev => {
                    const updated = prev.map(c => c._id === data._id ? data : c);
                    // Sort pinned first, then by date
                    return updated.sort((a, b) => {
                        const aPinned = a.pinnedBy?.includes(user._id) ? 1 : 0;
                        const bPinned = b.pinnedBy?.includes(user._id) ? 1 : 0;
                        return bPinned - aPinned || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
                    });
                });
                setSelectedChat(data);
            } else if (action === 'block') {
                const otherUser = getOtherUser(selectedChat.participants);
                const { data } = await api.put(`/users/block/${otherUser._id}`);
                updateUser({ blockedUsers: data.blockedUsers });
                toast.success(data.message);
            }
            setShowChatOptions(false);
        } catch (error) {
            console.error(error);
            toast.error("Action failed");
        }
    };

    return (
        <div className="flex h-[calc(100vh-112px)] md:h-screen bg-transparent relative">
            {/* Sidebar List */}
            <div className={`w-full md:w-1/3 border-r border-white/20 bg-black/40 backdrop-blur-md text-white ${selectedChat ? 'hidden md:block' : 'block'}`}>
                <div className="p-4 border-b border-white/20 flex justify-between items-center">
                    <h2 className="font-bold text-xl">{user.username}</h2>
                    <button onClick={() => setShowModal(true)} className="text-blue-400 font-semibold mt-2 hover:text-blue-300">New Message</button>
                </div>
                <div className="overflow-y-auto h-full pb-20">
                    {chats.map(chat => {
                        const otherUser = getOtherUser(chat.participants);
                        const isLastSenderMe = chat.lastMessage?.sender?._id === user._id || chat.lastMessage?.sender === user._id;
                        const isPinned = chat.pinnedBy?.includes(user._id);
                        const isMuted = chat.mutedBy?.includes(user._id);

                        return (
                            <div
                                key={chat._id}
                                onClick={() => setSelectedChat(chat)}
                                className={`flex items-center gap-3 p-4 hover:bg-white/10 cursor-pointer transition ${selectedChat?._id === chat._id ? 'bg-white/10' : ''}`}
                            >
                                <div className="relative">
                                    <img src={otherUser.profilePic || "/default-avatar.png"} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                                    {isPinned && <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5"><BsPinAngleFill size={10} /></div>}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-center">
                                        <div className="font-semibold truncate">{otherUser.username}</div>
                                        {isMuted && <BsVolumeMuteFill size={12} className="text-gray-400" />}
                                    </div>
                                    <div className="text-gray-300 text-sm truncate">
                                        {chat.lastMessage ? (
                                            isLastSenderMe ? `You: ${chat.lastMessage.content || 'Sent attachment'}` : (chat.lastMessage.content || 'Sent attachment')
                                        ) : 'New chat'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {chats.length === 0 && (
                        <div className="p-6 text-center text-gray-500">
                            <p>No messages yet.</p>
                            <button onClick={() => setShowModal(true)} className="mt-2 text-blue-500 font-semibold">Start a chat</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className={`w-full md:w-2/3 flex flex-col bg-black/20 backdrop-blur-sm text-white ${!selectedChat ? 'hidden md:flex' : 'flex'} relative`}>
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/20 flex items-center justify-between bg-black/40">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedChat(null)} className="md:hidden text-gray-300">Back</button>
                                <img src={getOtherUser(selectedChat.participants).profilePic || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover" />
                                <span className="font-bold">{getOtherUser(selectedChat.participants).username}</span>
                            </div>
                            <div className="relative">
                                <button onClick={() => setShowChatOptions(!showChatOptions)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full"><BsThreeDotsVertical size={20} /></button>
                                {showChatOptions && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-white/10 rounded shadow-xl z-20 overflow-hidden">
                                        <button onClick={() => handleChatAction('pin')} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm flex items-center gap-3">
                                            <BsPinAngleFill /> {selectedChat.pinnedBy?.includes(user._id) ? 'Unpin' : 'Pin'} Chat
                                        </button>
                                        <button onClick={() => handleChatAction('mute')} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm flex items-center gap-3">
                                            <BsVolumeMuteFill /> {selectedChat.mutedBy?.includes(user._id) ? 'Unmute' : 'Mute'} Messages
                                        </button>
                                        <button onClick={() => handleChatAction('block')} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-red-400 border-t border-white/5">
                                            {user.blockedUsers?.includes(getOtherUser(selectedChat.participants)._id) ? 'Unblock' : 'Block'} User
                                        </button>
                                        <button onClick={() => handleChatAction('delete')} className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-red-400">
                                            Delete Chat
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-grow overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender._id === user._id;
                                const isRead = msg.viewedBy?.includes(user._id);

                                return (
                                    <div key={idx} className={`flex items-center gap-2 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 relative ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>
                                            {msg.isOneTimeView && !isMe ? (
                                                <div onClick={() => !isRead && handleViewOneTime(msg._id)} className="cursor-pointer flex items-center gap-2">
                                                    {isRead ? <span className="text-gray-300 italic">Viewed</span> : <><BsEye /> Tap to view</>}
                                                </div>
                                            ) : (
                                                <>
                                                    {msg.mediaUrl && (
                                                        msg.type === 'video' ?
                                                            <video src={msg.mediaUrl} controls className="max-w-full rounded mb-2" /> :
                                                            <img src={msg.mediaUrl} className="max-w-full rounded mb-2" />
                                                    )}
                                                    {msg.content && <p className={msg.isDeletedForEveryone ? "italic text-gray-300 text-sm" : ""}>{msg.content}</p>}
                                                </>
                                            )}
                                            <span className="text-[10px] opacity-70 block text-right mt-1">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {/* 3 Dots Menu Trigger */}
                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === msg._id ? null : msg._id); }}
                                                className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <BsThreeDotsVertical size={16} />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openMenuId === msg._id && (
                                                <div className={`absolute top-0 ${isMe ? 'right-full mr-1' : 'left-full ml-1'} w-32 bg-zinc-800 border border-white/10 rounded shadow-xl z-20 overflow-hidden`}>
                                                    {msg.content && !msg.isOneTimeView && (
                                                        <button
                                                            onClick={() => handleCopy(msg.content)}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 text-white border-b border-white/5"
                                                        >
                                                            Copy
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg._id, 'me')}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 text-white"
                                                    >
                                                        Delete for me
                                                    </button>
                                                    {isMe && !msg.isDeletedForEveryone && (
                                                        <button
                                                            onClick={() => handleDeleteMessage(msg._id, 'everyone')}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 text-red-400"
                                                        >
                                                            Delete for all
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-white/20 bg-black/40 flex items-center gap-3">
                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <button onClick={() => fileInputRef.current.click()} className="text-blue-400">
                                <BiImageAdd size={24} />
                            </button>

                            {file && <span className="text-xs text-green-400 whitespace-nowrap">{file.name}</span>}

                            <div className="relative">
                                {showEmojiPicker && (
                                    <div className="absolute bottom-12 left-0 z-50">
                                        <EmojiPicker
                                            theme="dark"
                                            onEmojiClick={(emojiObject) => setNewMessage(prev => prev + emojiObject.emoji)}
                                        />
                                    </div>
                                )}
                                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-400 hover:text-white pt-1">
                                    <BsEmojiSmile size={24} />
                                </button>
                            </div>

                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage(e)}
                                placeholder="Message..."
                                className="flex-grow bg-transparent border border-white/20 rounded-full px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            />

                            {/* One Time Toggle */}
                            <button onClick={() => setIsOneTime(!isOneTime)} className={`${isOneTime ? 'text-green-400' : 'text-gray-400'}`}>
                                <BsLock size={20} title="View Once" />
                            </button>

                            {newMessage.trim() || file ? (
                                <button onClick={sendMessage} className="text-blue-500 font-semibold">Send</button>
                            ) : (
                                <button className="text-gray-500 cursor-not-allowed">Send</button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h2 className="text-2xl font-light mb-2">Your Messages</h2>
                            <p className="text-gray-500">Send private photos and messages to a friend or group.</p>
                            <button onClick={() => setShowModal(true)} className="bg-blue-500 text-white px-4 py-1.5 rounded mt-4 hover:bg-blue-600 transition">Send Message</button>
                        </div>
                    </div>
                )}
            </div>

            {/* New Message Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-zinc-900 w-full max-w-sm rounded-xl border border-white/20 overflow-hidden flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <span className="font-bold text-center flex-grow">New Message</span>
                            <button onClick={() => setShowModal(false)}><IoClose size={24} /></button>
                        </div>
                        <div className="p-3 border-b border-white/10">
                            <div className="flex items-center bg-zinc-800 rounded-lg px-3 py-1.5 gap-2">
                                <span className="text-gray-400">To:</span>
                                <input
                                    autoFocus
                                    className="bg-transparent outline-none flex-grow text-sm text-white placeholder-gray-500"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto p-2 flex-grow">
                            {searchQuery ? (
                                searchResults.length > 0 ? searchResults.map(u => (
                                    <div key={u._id} onClick={() => startNewChat(u._id)} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer">
                                        <img src={u.profilePic || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{u.username}</span>
                                            <span className="text-xs text-gray-400">{u.fullname}</span>
                                        </div>
                                    </div>
                                )) : <p className="p-4 text-center text-gray-500 text-sm">No user found.</p>
                            ) : (
                                followingUsers.length > 0 ? (
                                    <>
                                        <p className="px-3 py-2 text-xs font-semibold text-gray-400">Suggested</p>
                                        {followingUsers.map(u => (
                                            <div key={u._id} onClick={() => startNewChat(u._id)} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer">
                                                <img src={u.profilePic || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover" />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm">{u.username}</span>
                                                    <span className="text-xs text-gray-400">Following</span>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : <p className="p-4 text-center text-gray-500 text-sm">No followers found. Search for users.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
