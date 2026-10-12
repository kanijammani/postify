import { useEffect, useRef } from 'react';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

const TimeTracker = () => {
    const { user } = useAuth();
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!user) return;

        const syncTime = async () => {
            const currentTime = Date.now();
            const elapsedMinutes = Math.floor((currentTime - startTimeRef.current) / 60000);

            if (elapsedMinutes > 0) {
                try {
                    // Fix: Explicitly get token to avoid interceptor issues
                    const userInfo = JSON.parse(sessionStorage.getItem('userInfo')) || JSON.parse(localStorage.getItem('userInfo'));
                    const token = userInfo?.token;

                    if (!token) return; // Cannot sync if no token

                    await api.put('/users/settings',
                        { timeSpentToday: elapsedMinutes },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    startTimeRef.current = currentTime; // Reset start time after sync
                } catch (error) {
                    console.error("Time sync failed", error);
                }
            }
        };

        // Sync every 5 minutes
        const interval = setInterval(syncTime, 5 * 60000);

        // Sync on page visibility change or close
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                syncTime();
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', syncTime);

        return () => {
            clearInterval(interval);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', syncTime);
            syncTime(); // Final sync on unmount
        };
    }, [user]);

    return null; // Invisible component
};

export default TimeTracker;
