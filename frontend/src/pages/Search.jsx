import React, { useState, useEffect } from 'react';
import { BiSearch, BiTime } from 'react-icons/bi';
import { MdClose, MdDelete } from 'react-icons/md';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Search = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data } = await api.get('/users/search/history');
            setHistory(data);
        } catch (error) {
            console.error("Failed to fetch history", error);
        }
    };

    const addToHistory = async (searchQuery, userId) => {
        try {
            const payload = {};
            if (userId) payload.userId = userId;
            if (searchQuery) payload.query = searchQuery;

            // Optimistic Update (Optional, but safer to just await API)
            await api.post('/users/search/history', payload);
            fetchHistory(); // Refresh list to get sorted deduplicated data
        } catch (error) {
            console.error("Failed to add history", error);
        }
    };

    const handleDeleteHistory = async (id, e) => {
        e.stopPropagation();
        try {
            await api.delete(`/users/search/history/${id}`);
            setHistory(prev => prev.filter(item => item._id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleClearAllHistory = async () => {
        try {
            await api.delete('/users/search/history/all');
            setHistory([]);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim()) {
                setLoading(true);
                try {
                    const { data } = await api.get(`/users/search?q=${query}`);
                    setResults(data);
                    // Refresh history after a successful search execution (optional, might want to delay)
                    // But since we are debouncing, maybe we just fetch history when query becomes empty
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                fetchHistory(); // Refresh history when clearing search
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <div className="flex bg-transparent min-h-screen p-8 justify-center">
            <div className="w-full max-w-xl text-white">
                <h1 className="text-2xl font-semibold mb-6">Search</h1>

                <div className="relative mb-8">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BiSearch className="text-gray-400 text-xl" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-lg focus:outline-none focus:bg-white/20 border border-white/20 focus:border-white/50 text-white placeholder-gray-400 transition-colors"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                        >
                            <MdClose size={20} />
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    {loading && <div className="text-gray-500 text-center">Searching...</div>}

                    {/* Show History when no query */}
                    {!query && history.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-4 px-2">
                                <span className="text-gray-400 font-semibold text-sm">Recent</span>
                                <button
                                    onClick={handleClearAllHistory}
                                    className="text-blue-500 text-xs font-semibold hover:text-blue-400"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {history.map((item) => {
                                    if (item.user) {
                                        // Render User Profile in History
                                        return (
                                            <Link
                                                to={`/profile/${item.user.username}`}
                                                key={item._id}
                                                onClick={() => addToHistory(null, item.user._id)} // Refresh timestamp
                                                className="flex items-center justify-between p-3 hover:bg-white/10 rounded-lg transition group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={item.user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                                        alt={item.user.username}
                                                        className="w-10 h-10 rounded-full object-cover border border-white/20"
                                                    />
                                                    <div>
                                                        <div className="font-semibold text-sm text-white">{item.user.username}</div>
                                                        <div className="text-gray-400 text-xs text-left">Visited</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleDeleteHistory(item._id, e);
                                                    }}
                                                    className="text-gray-500 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition"
                                                >
                                                    <MdClose size={20} />
                                                </button>
                                            </Link>
                                        );
                                    } else {
                                        // Render Search Query in History
                                        return (
                                            <div
                                                key={item._id}
                                                onClick={() => setQuery(item.query)}
                                                className="flex items-center justify-between p-3 hover:bg-white/10 rounded-lg transition cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white/5 rounded-full text-gray-400">
                                                        <BiSearch size={20} />
                                                    </div>
                                                    <span className="text-white">{item.query}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeleteHistory(item._id, e)}
                                                    className="text-gray-500 hover:text-white p-2 opacity-0 group-hover:opacity-100 transition"
                                                >
                                                    <MdClose size={20} />
                                                </button>
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    )}

                    {!loading && results.length === 0 && query && (
                        <div className="text-gray-500 text-center">No users found.</div>
                    )}

                    {results.map((user) => (
                        <Link
                            to={`/profile/${user.username}`}
                            key={user._id}
                            onClick={() => addToHistory(null, user._id)}
                            className="flex items-center justify-between p-3 hover:bg-white/10 rounded-lg transition border border-transparent hover:border-white/10"
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                    alt={user.username}
                                    className="w-12 h-12 rounded-full object-cover border border-white/20"
                                />
                                <div>
                                    <div className="font-semibold text-sm text-white">{user.username}</div>
                                    <div className="text-gray-400 text-sm">{user.bio || 'No bio available'}</div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Search;
