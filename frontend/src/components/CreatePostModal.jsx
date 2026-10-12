import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { BiImageAdd, BiCamera, BiVideo } from 'react-icons/bi';
import { BsStars, BsRecordCircle, BsStopCircle } from 'react-icons/bs';
import api from '../services/api';
import { toast } from 'react-toastify';
import useAuth from '../hooks/useAuth';

const CreatePostModal = ({ onClose }) => {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggesting, setSuggesting] = useState(false);
    const [uploadType, setUploadType] = useState('post'); // 'post' or 'story'

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [videoChunks, setVideoChunks] = useState([]);
    const videoRef = React.useRef(null);
    const [cameraError, setCameraError] = useState(null);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        if (uploadType === 'post') {
            formData.append('caption', caption);
        }

        try {
            const endpoint = uploadType === 'post' ? '/posts' : '/stories';
            await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(`${uploadType === 'post' ? 'Post' : 'Story'} created!`);
            onClose();
            // Refresh logic depends on where we are, but Home/Profile have their own refresh
            if (window.location.pathname === '/' || window.location.pathname.startsWith('/profile')) window.location.reload();
        } catch (error) {
            console.error(error);
            toast.error(`Failed to create ${uploadType}`);
        } finally {
            setLoading(false);
        }
    };

    // Camera Handlers
    const startCamera = async () => {
        setCameraError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setStream(mediaStream);
            setShowCamera(true);

            // Wait for modal to render video element
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            }, 100);

        } catch (err) {
            console.error("Camera Error:", err);
            setCameraError("Could not access camera/microphone. Please check permissions.");
            toast.error("Camera access denied");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setShowCamera(false);
        setIsRecording(false);
        setMediaRecorder(null);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
            setFile(file);
            setPreview(URL.createObjectURL(file));
            stopCamera();
        }, "image/jpeg");
    };

    const startRecording = () => {
        if (!stream) return;
        const recorder = new MediaRecorder(stream);
        let chunks = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/mp4" }); // or webm depending on browser
            const file = new File([blob], "camera-video.mp4", { type: "video/mp4" });
            setFile(file);
            setPreview(URL.createObjectURL(file));
            stopCamera();
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
        }
    };

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [stream]);

    const handleAiSuggestion = async () => {
        if (!file) return toast.error("Please select an image first");
        setSuggesting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post('/ai/suggest-caption', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setCaption(data.caption);
            toast.success("Caption generated!");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to generate caption");
        } finally {
            setSuggesting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-0 md:p-4" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white z-[110] md:block hidden"><MdClose size={30} /></button>

            <div className="bg-black w-full h-full md:h-[85vh] md:max-w-5xl md:rounded-xl flex flex-col overflow-hidden text-white border border-white/20" onClick={(e) => e.stopPropagation()}>
                <div className="border-b border-white/20 p-2 text-center font-semibold text-sm flex justify-between items-center">
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition w-16 text-left">Cancel</button>
                    <div className="flex bg-white/10 rounded-full p-1 gap-1">
                        <button
                            onClick={() => setUploadType('post')}
                            className={`px-3 py-1 rounded-full transition ${uploadType === 'post' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Post
                        </button>
                        <button
                            onClick={() => setUploadType('story')}
                            className={`px-3 py-1 rounded-full transition ${uploadType === 'story' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Story
                        </button>
                    </div>
                    <button onClick={handleSubmit} className="text-blue-500 font-bold disabled:opacity-50 w-16 text-right" disabled={loading || !file}>
                        {loading ? '...' : 'Share'}
                    </button>
                </div>

                <div className="flex-grow flex flex-col md:flex-row h-full">
                    <div className={`flex-grow bg-white/5 flex items-center justify-center relative ${file ? 'bg-black' : ''}`}>
                        {preview ? (
                            <img src={preview} alt="preview" className="max-h-full max-w-full object-contain" />
                        ) : (
                            <div className="flex flex-col items-center">
                                <BiImageAdd size={50} className="text-gray-400" />
                                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold mt-4 cursor-pointer transition">
                                    Select from computer
                                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                                </label>
                                <div className="mt-4 flex flex-col items-center">
                                    <button onClick={startCamera} className="text-white flex items-center gap-2 hover:text-blue-400">
                                        <BiCamera size={30} />
                                        <span>Use Camera</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {showCamera && (
                            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-20">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                                <div className="absolute bottom-4 flex gap-8 items-center">
                                    {!isRecording && (
                                        <button onClick={capturePhoto} className="p-4 rounded-full bg-white text-black hover:scale-110 transition" title="Take Photo">
                                            <BiCamera size={32} />
                                        </button>
                                    )}
                                    {isRecording ? (
                                        <button onClick={stopRecording} className="p-4 rounded-full bg-red-600 text-white hover:scale-110 transition animate-pulse" title="Stop Recording">
                                            <BsStopCircle size={32} />
                                        </button>
                                    ) : (
                                        <button onClick={startRecording} className="p-4 rounded-full bg-red-500 text-white hover:scale-110 transition" title="Start Recording">
                                            <BsRecordCircle size={32} />
                                        </button>
                                    )}
                                </div>
                                <button onClick={stopCamera} className="absolute top-4 right-4 text-white hover:text-red-500 bg-black/50 rounded-full p-2">
                                    <MdClose size={24} />
                                </button>
                                {cameraError && <div className="absolute top-1/2 text-red-500 bg-black/80 p-4 rounded text-center">{cameraError}</div>}
                            </div>
                        )}
                    </div>
                    {file && uploadType === 'post' && (
                        <div className="w-full md:w-80 border-l border-white/20 p-4 flex flex-col bg-white/5">
                            <div className="flex items-center gap-2 mb-4">
                                <img src={user?.profilePic || "/default-avatar.png"} className="w-8 h-8 rounded-full object-cover" alt="user" />
                                <span className="font-semibold text-sm">{user?.username}</span>
                            </div>
                            <textarea
                                className="w-full flex-grow outline-none resize-none text-sm bg-transparent text-white placeholder-gray-500"
                                placeholder="Write a caption..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                            ></textarea>
                            <div className="flex justify-between items-center mt-2 border-t border-white/10 pt-2">
                                <span className="text-xs text-gray-500">{caption.length}/2200</span>
                                <button
                                    type="button"
                                    onClick={handleAiSuggestion}
                                    disabled={suggesting}
                                    className="flex items-center gap-2 text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                                >
                                    <BsStars />
                                    {suggesting ? 'Magic...' : 'AI Caption'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreatePostModal;
