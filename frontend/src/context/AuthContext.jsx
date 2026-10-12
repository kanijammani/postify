/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const userInfo = sessionStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    });

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            setUser(data);
            sessionStorage.setItem('userInfo', JSON.stringify(data));
            toast.success('Login successful');
            return true;
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Login failed');
            return false;
        }
    };

    const register = async (username, email, password) => {
        try {
            const { data } = await api.post('/auth/register', { username, email, password });
            setUser(data);
            sessionStorage.setItem('userInfo', JSON.stringify(data));
            toast.success('Registration successful');
            return true;
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Registration failed');
            return false;
        }
    };

    const logout = () => {
        sessionStorage.removeItem('userInfo');
        setUser(null);
        toast.info('Logged out');
    };

    const updateUser = (data) => {
        const newUser = { ...user, ...data };
        setUser(newUser);
        sessionStorage.setItem('userInfo', JSON.stringify(newUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
