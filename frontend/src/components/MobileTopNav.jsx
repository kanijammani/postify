import React from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineHeart } from 'react-icons/ai';
import { FaRegPaperPlane } from 'react-icons/fa';

const MobileTopNav = () => {
    return (
        <div className="md:hidden fixed top-0 left-0 w-full h-14 bg-black/80 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-4 z-50">
            <Link to="/" className="flex items-center">
                <h1 className="text-xl font-serif font-bold text-white">Postify</h1>
            </Link>

            <div className="flex items-center gap-5">
                <Link to="/notifications" className="transition active:scale-95">
                    <AiOutlineHeart size={24} className="text-white" />
                </Link>
                <Link to="/direct/inbox" className="transition active:scale-95">
                    <FaRegPaperPlane size={22} className="text-white" />
                </Link>
            </div>
        </div>
    );
};

export default MobileTopNav;
