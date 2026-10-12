import React, { useState, useEffect } from 'react';
import api from '../services/api';
import PostDetailModal from '../components/PostDetailModal';

const Explore = () => {
    const [posts, setPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const fetchExplore = async () => {
            try {
                const { data } = await api.get('/posts/explore', { signal: controller.signal });
                setPosts(Array.isArray(data) ? data : []);
            } catch (error) {
                if (error.name !== 'CanceledError') console.error(error);
            }
        };
        fetchExplore();
        return () => controller.abort();
    }, []);

    return (
        <div className="flex bg-transparent min-h-screen p-4 justify-center">
            <div className="w-full max-w-4xl grid grid-cols-3 gap-1 md:gap-6">
                {posts.map((post) => (
                    <div key={post._id} onClick={() => setSelectedPost(post)} className="relative aspect-square group cursor-pointer bg-gray-200">
                        {post.imageUrl ? (
                            <img src={post.imageUrl} className="w-full h-full object-cover" alt="explore item" />
                        ) : (
                            <div className="w-full h-full relative">
                                <video src={post.videoUrl} className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2 text-white">▶</div>
                            </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white text-lg font-bold">
                            <span>❤️ {post.likes.length}</span>
                            <span>💬 {post.comments.length}</span>
                        </div>
                    </div>
                ))}
            </div>

            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}
        </div>
    );
};

export default Explore;
