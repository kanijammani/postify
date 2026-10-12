import React, { useEffect, useState } from 'react';
import api from '../services/api';
import moment from 'moment';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n =>
                n._id === id ? { ...n, isRead: true } : n
            ));
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen bg-black justify-center p-8 text-white">
                <p>Loading notifications...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-black justify-center p-4 md:p-8">
            <div className="w-full max-w-2xl text-white">
                <h1 className="text-2xl font-semibold mb-6">Notifications</h1>
                <div className="flex flex-col gap-4">
                    {notifications.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">
                            No new notifications.
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif._id}
                                onClick={() => !notif.isRead && markAsRead(notif._id)}
                                className={`
                                    p-4 rounded-lg flex items-center gap-4 transition-colors cursor-pointer
                                    ${notif.isRead ? 'bg-transparent hover:bg-white/5' : 'bg-white/10 hover:bg-white/15 border-l-4 border-blue-500'}
                                `}
                            >
                                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-700">
                                    {notif.sender?.profilePic ? (
                                        <img
                                            src={notif.sender.profilePic}
                                            alt={notif.sender.username}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl font-bold">
                                            {notif.sender?.username?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm md:text-base">
                                        <span className="font-bold">{notif.sender?.username}</span>
                                        <span className="font-normal text-gray-300 ml-1">
                                            {notif.content || getNotificationText(notif.type)}
                                        </span>
                                    </p>
                                    <span className="text-gray-500 text-xs mt-1 block">
                                        {moment(notif.createdAt).fromNow()}
                                    </span>
                                </div>
                                {!notif.isRead && (
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const getNotificationText = (type) => {
    switch (type) {
        case 'message': return 'sent you a message';
        case 'like': return 'liked your post';
        case 'comment': return 'commented on your post';
        case 'follow': return 'started following you';
        default: return 'interacted with you';
    }
};

export default Notifications;
