import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { BsEye, BsEyeSlash } from 'react-icons/bs';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register, user } = useAuth();
    const navigate = useNavigate();



    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            // We can use a toast or simple alert if toast isn't available in scope, 
            // but since useAuth likely uses toast, we can assume it's set up in App.
            // For now, let's use the error handling from useAuth or just return.
            // Ideally import toast or show error.
            alert("Passwords do not match");
            return;
        }

        const success = await register(username, email, password);
        if (success) navigate('/');
    };

    return (
        <div className="h-screen flex items-center justify-center bg-transparent">
            <div className="w-full max-w-xs sm:max-w-sm bg-black/30 backdrop-blur-md border border-white/20 p-8 rounded shadow-lg text-white">
                <h1 className="text-4xl font-serif text-center mb-4">Postify</h1>
                <p className="text-center text-gray-300 font-semibold mb-6">Sign up to see photos and videos from your friends.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                        type="email"
                        placeholder="Email"
                        className="border border-white/20 p-2 rounded text-xs bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:border-white/50"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Username"
                        className="border border-white/20 p-2 rounded text-xs bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:border-white/50"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className="border border-white/20 p-2 rounded text-xs bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:border-white/50 w-full pr-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            {showPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            className="border border-white/20 p-2 rounded text-xs bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:border-white/50 w-full pr-10"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            {showConfirmPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 text-center my-2">
                        People who use our service may have uploaded your contact information to Postify. <span className="font-semibold text-white">Learn More</span>
                    </p>
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded font-semibold text-sm disabled:opacity-50 transition"
                        disabled={!email || !password || !username || !confirmPassword}
                    >
                        Sign Up
                    </button>
                </form>

            </div>

            <div className="absolute bottom-4 w-full max-w-xs sm:max-w-sm">
                <div className="bg-black/30 backdrop-blur-md border border-white/20 p-4 text-center rounded text-white">
                    <span className="text-sm">Have an account? <Link to="/login" className="text-blue-500 font-semibold">Log in</Link></span>
                </div>
            </div>
        </div>
    );
};

export default Signup;
