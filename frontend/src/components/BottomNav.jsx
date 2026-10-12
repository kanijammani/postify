import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AiFillHome, AiOutlineHome, AiOutlineSearch, AiOutlineCompass, AiFillCompass } from 'react-icons/ai';
import { BiMoviePlay, BiSolidMoviePlay } from 'react-icons/bi';
import { CgProfile } from 'react-icons/cg';
import { BsPlusSquare, BsPlusSquareFill } from 'react-icons/bs';
import useAuth from '../hooks/useAuth';

const BottomNav = ({ openPostModal }) => {
    const { pathname } = useLocation();
    const { user } = useAuth();

    const isActive = (path) => pathname === path;

    return (
        <div className="md:hidden fixed bottom-0 left-0 w-full h-14 bg-black/80 backdrop-blur-lg border-t border-white/10 flex items-center justify-around z-50 px-2">
            <Link to="/" className="p-2 transition active:scale-90">
                {isActive('/') ? <AiFillHome size={26} className="text-white" /> : <AiOutlineHome size={26} className="text-white" />}
            </Link>

            <Link to="/search" className="p-2 transition active:scale-90">
                <AiOutlineSearch size={26} className="text-white" />
            </Link>

            <button onClick={openPostModal} className="p-2 transition active:scale-90">
                <BsPlusSquare size={26} className="text-white" />
            </button>

            <Link to="/reels" className="p-2 transition active:scale-90">
                {isActive('/reels') ? <BiSolidMoviePlay size={26} className="text-white" /> : <BiMoviePlay size={26} className="text-white" />}
            </Link>

            <Link to={user?.username ? `/profile/${user.username}` : '#'} className="p-2 transition active:scale-90">
                {user?.profilePic ? (
                    <img src={user.profilePic} alt="profile" className={`w-7 h-7 rounded-full object-cover border ${isActive(`/profile/${user.username}`) ? 'border-white' : 'border-transparent'}`} />
                ) : (
                    <CgProfile size={26} className="text-white" />
                )}
            </Link>
        </div>
    );
};

export default BottomNav;
