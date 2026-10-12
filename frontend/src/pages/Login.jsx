import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth'; // We'll create this hook helper
import { BsEye, BsEyeSlash } from 'react-icons/bs';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();



    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success) navigate('/');
    };

    return (
        <div className="h-screen flex items-center justify-center bg-transparent">
            <div className="w-full max-w-xs sm:max-w-sm bg-black/30 backdrop-blur-md border border-white/20 p-8 rounded shadow-lg text-white">
                <h1 className="text-4xl font-serif text-center mb-8">Postify</h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                        type="email"
                        placeholder="Email"
                        className="border border-white/20 p-2 rounded text-xs bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:border-white/50"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded font-semibold text-sm mt-2 disabled:opacity-50 transition"
                        disabled={!email || !password}
                    >
                        Log In
                    </button>
                </form>

                <div className="flex items-center my-4">
                    <div className="h-px bg-white/20 flex-1"></div>
                    <span className="px-4 text-xs text-gray-300 font-semibold">OR</span>
                    <div className="h-px bg-white/20 flex-1"></div>
                </div>

                <div className="text-center">
                    <p className="text-xs text-blue-400 font-semibold cursor-pointer">Log in with Facebook</p>
                    <p className="text-xs text-blue-400 mt-3 cursor-pointer">Forgot password?</p>
                </div>

            </div>

            <div className="absolute bottom-4 w-full max-w-xs sm:max-w-sm">
                <div className="bg-black/30 backdrop-blur-md border border-white/20 p-4 text-center rounded text-white">
                    <span className="text-sm">Don't have an account? <Link to="/signup" className="text-blue-500 font-semibold">Sign up</Link></span>
                </div>
            </div>
        </div>
    );
};

export default Login;
