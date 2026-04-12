import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TeacherRoom.css';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const roomColorPresets = [
    { id: 'purple', bg: 'linear-gradient(135deg, #6e45e2 0%, #8e44ad 100%)' },
    { id: 'blue', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'green', bg: 'linear-gradient(135deg, #1dd1a1 0%, #10ac84 100%)' },
    { id: 'orange', bg: 'linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%)' },
    { id: 'pink', bg: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)' },
    { id: 'teal', bg: 'linear-gradient(135deg, #00cec9 0%, #01a3a4 100%)' }
];

export default function TeacherRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState(null);
    const [activeTab, setActiveTab] = useState('stream');
    const [posts, setPosts] = useState([]);
    const [classwork, setClasswork] = useState([]);

    // Modal States
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isCwModalOpen, setIsCwModalOpen] = useState(false);

    // Form States
    const [postContent, setPostContent] = useState('');
    const [postType, setPostType] = useState('Announcement');
    const [cwType, setCwType] = useState('module');
    const [cwTitle, setCwTitle] = useState('');
    const [cwDesc, setCwDesc] = useState('');
    const [assessmentType, setAssessmentType] = useState('custom');
    const [isCopied, setIsCopied] = useState(false);

    // Attachment States
    const [attachment, setAttachment] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [previewAttachment, setPreviewAttachment] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(true);

    // Announcement Edit/Delete States
    const [activePostMenu, setActivePostMenu] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
    const [isDeletePostModalOpen, setIsDeletePostModalOpen] = useState(false);
    const [editPostContent, setEditPostContent] = useState('');
    const [editPostType, setEditPostType] = useState('Announcement');

    // Quiz Builder State
    const [quizQuestions, setQuizQuestions] = useState([{ question: '', options: ['', '', '', ''], correctOption: 0 }]);

    const addQuestion = () => {
        setQuizQuestions([...quizQuestions, { question: '', options: ['', '', '', ''], correctOption: 0 }]);
    };

    const removeQuestion = (index) => {
        setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
    };

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...quizQuestions];
        newQuestions[index][field] = value;
        setQuizQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...quizQuestions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuizQuestions(newQuestions);
    };

    useEffect(() => {
        // Enforce teacher role
        if (sessionStorage.getItem('userRole') !== 'teacher') {
            navigate('/');
            return;
        }

        const roomRef = doc(db, "teacher_rooms", roomId);
        const unsubscribe = onSnapshot(roomRef, (roomSnap) => {
            if (roomSnap.exists()) {
                const roomData = roomSnap.data();
                setRoom({ id: roomSnap.id, ...roomData });
                setPosts(roomData.posts || []);
                setClasswork(roomData.classwork || []);
            } else {
                alert('Room not found!');
                navigate('/dashboard');
            }
        }, (error) => {
            console.error("Error fetching room:", error);
            alert('Error loading room data.');
            navigate('/dashboard');
        });

        return () => unsubscribe();
    }, [roomId, navigate]);

    // Close dropdown menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (!event.target.closest('.post-menu-container')) {
                setActivePostMenu(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (previewAttachment) {
            // PDFs don't reliably fire onLoad in iframes, so we skip the spinner for them
            setIsPreviewLoading(!previewAttachment.type.includes('pdf'));
        }
    }, [previewAttachment]);

    // Prevent background scrolling when any modal is open
    useEffect(() => {
        if (isPostModalOpen || isCwModalOpen || isEditPostModalOpen || isDeletePostModalOpen || previewAttachment) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isPostModalOpen, isCwModalOpen, isEditPostModalOpen, isDeletePostModalOpen, previewAttachment]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate allowed file types
        const validTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf'
        ];
        
        if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
            alert('Invalid file type! Only Images and PDFs are allowed.');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('File is too large! Maximum size is 10MB.');
            return;
        }

        setAttachment(file);
        e.target.value = ''; // Reset hidden input
    };

    const handleCopyCode = () => {
        const code = room.classCode || roomId.substring(roomId.length - 6).toUpperCase();
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!postContent.trim() && !attachment) return alert('Announcement cannot be empty!');

        setIsUploading(true);
        let attachmentData = null;

        try {
            // 1. Upload File to Cloudinary (if one is attached)
            if (attachment) {
                const formData = new FormData();
                formData.append('file', attachment);
                formData.append('upload_preset', 'atomarix_uploads'); 
                
                const cloudinaryUrl = `https://api.cloudinary.com/v1_1/dht7nou2f/auto/upload`;
                
                const response = await fetch(cloudinaryUrl, { method: 'POST', body: formData });
                const data = await response.json();
                
                if (!response.ok) throw new Error(data.error?.message || 'Cloudinary upload failed');

                attachmentData = {
                    name: attachment.name,
                    url: data.secure_url,
                    type: attachment.type
                };
            }

            // 2. Save Announcement to Firestore
            const newPost = {
                id: Date.now(),
                type: postType,
                text: postContent,
                attachment: attachmentData,
                author: room.teacherFullName || room.teacher,
                timestamp: new Date().toISOString()
            };

            const updatedPosts = [...posts, newPost];
            const roomRef = doc(db, "teacher_rooms", roomId);
            await updateDoc(roomRef, { posts: updatedPosts });
            setPostContent('');
            setPostType('Announcement');
            setAttachment(null);
            setIsPostModalOpen(false);
        } catch (error) {
            console.error("Error creating post: ", error);
            alert("Failed to create post. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditPostSubmit = async (e) => {
        e.preventDefault();
        if (!editPostContent.trim()) return alert('Announcement cannot be empty!');

        const updatedPosts = posts.map(p => 
            p.id === selectedPost.id ? { ...p, text: editPostContent, type: editPostType } : p
        );
        
        try {
            const roomRef = doc(db, "teacher_rooms", roomId);
            await updateDoc(roomRef, { posts: updatedPosts });
            setIsEditPostModalOpen(false);
            setSelectedPost(null);
        } catch (error) {
            console.error("Error updating post: ", error);
            alert("Failed to update announcement.");
        }
    };

    const handleConfirmDeletePost = async () => {
        if (!selectedPost) return;
        const updatedPosts = posts.filter(p => p.id !== selectedPost.id);
        try {
            const roomRef = doc(db, "teacher_rooms", roomId);
            await updateDoc(roomRef, { posts: updatedPosts });
            setIsDeletePostModalOpen(false);
            setSelectedPost(null);
        } catch (error) {
            console.error("Error deleting post: ", error);
            alert("Failed to delete announcement.");
        }
    };

    const handleCreateClasswork = async (e) => {
        e.preventDefault();
        if (!cwTitle.trim()) return alert('Title is required!');

        // Validate custom quiz
        if (assessmentType === 'custom') {
            for (let i = 0; i < quizQuestions.length; i++) {
                if (!quizQuestions[i].question.trim()) return alert(`Question ${i + 1} cannot be empty.`);
                if (quizQuestions[i].options.some(opt => !opt.trim())) return alert(`All options for Question ${i + 1} must be filled.`);
            }
        }

        setIsUploading(true);
        let attachmentData = null;

        try {
            // Upload File to Cloudinary (if attached)
            if (attachment && assessmentType === 'custom') {
                const formData = new FormData();
                formData.append('file', attachment);
                formData.append('upload_preset', 'atomarix_uploads'); 
                
                const cloudinaryUrl = `https://api.cloudinary.com/v1_1/dht7nou2f/auto/upload`;
                
                const response = await fetch(cloudinaryUrl, { method: 'POST', body: formData });
                const data = await response.json();
                
                if (!response.ok) throw new Error(data.error?.message || 'Cloudinary upload failed');

                attachmentData = {
                    name: attachment.name,
                    url: data.secure_url,
                    type: attachment.type
                };
            }

        const newClasswork = {
            id: Date.now(),
            type: 'assessment',
            assessmentType: assessmentType,
            title: cwTitle,
            desc: cwDesc,
            attachment: attachmentData,
            questions: assessmentType === 'custom' ? quizQuestions : null,
            timestamp: new Date().toISOString()
        };

        const updatedClasswork = [...classwork, newClasswork];
            const roomRef = doc(db, "teacher_rooms", roomId);
            await updateDoc(roomRef, { classwork: updatedClasswork });
            
            // Reset form and close modal
            setCwTitle('');
            setCwDesc('');
            setAttachment(null);
            setAssessmentType('custom');
            setQuizQuestions([{ question: '', options: ['', '', '', ''], correctOption: 0 }]);
            setIsCwModalOpen(false);
        } catch (error) {
            console.error("Error creating classwork: ", error);
            alert("Failed to create classwork. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteClasswork = async (id) => {
        if (window.confirm("Are you sure you want to delete this classwork?")) {
            const updatedClasswork = classwork.filter(cw => cw.id !== id);
            try {
                const roomRef = doc(db, "teacher_rooms", roomId);
                await updateDoc(roomRef, { classwork: updatedClasswork });
            } catch (error) {
                console.error("Error deleting classwork: ", error);
                alert("Failed to delete classwork. Please try again.");
            }
        }
    };

    const renderStream = () => (
        <>
            <div className="btn-create-post" onClick={() => setIsPostModalOpen(true)}>
                <div className="avatar"><i className="fas fa-user"></i></div>
                Upload modules or announce something to your class
            </div>
            {posts.slice().reverse().map(post => {
                const pType = post.type || 'Announcement';
                const pIcon = pType === 'Module' ? 'fa-book' : 'fa-comment-dots';
                const pColor = pType === 'Module' ? '#4facfe' : '#10ac84';
                const pBg = pType === 'Module' ? '#eaf4ff' : '#e3fdf5';

                return (
                <div key={post.id} className="post-card">
                    <div className="post-icon" style={{ background: pBg, color: pColor }}><i className={`fas ${pIcon}`}></i></div>
                    <div className="post-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4>{pType}</h4>
                            <div className="menu-container post-menu-container">
                                <button className="btn-menu" onClick={(e) => { e.stopPropagation(); setActivePostMenu(activePostMenu === post.id ? null : post.id); }}>
                                    <i className="fas fa-ellipsis-v"></i>
                                </button>
                                {activePostMenu === post.id && (
                                    <div className="dropdown-menu show" style={{ right: 0, top: '35px', width: '130px' }} onClick={e => e.stopPropagation()}>
                                        <div className="dropdown-item" onClick={() => {
                                            setSelectedPost(post);
                                            setEditPostContent(post.text);
                                            setEditPostType(post.type || 'Announcement');
                                            setIsEditPostModalOpen(true);
                                            setActivePostMenu(null);
                                        }}>
                                            <i className="fas fa-edit" style={{ color: '#6e45e2', width: '20px' }}></i> Edit
                                        </div>
                                        <div className="dropdown-item danger" onClick={() => {
                                            setSelectedPost(post);
                                            setIsDeletePostModalOpen(true);
                                            setActivePostMenu(null);
                                        }}>
                                            <i className="fas fa-trash" style={{ width: '20px' }}></i> Delete
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <span>Posted by {post.author} • {new Date(post.timestamp).toLocaleString()}</span>
                        <p>{post.text}</p>
                        {post.attachment && (
                            <div style={{ marginTop: '15px', padding: '10px 15px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => setPreviewAttachment(post.attachment)}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                                    <i className={`fas ${post.attachment.type.startsWith('image/') ? 'fa-image' : post.attachment.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-word'}`}></i>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <span style={{ color: '#2d3436', fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '300px' }}>{post.attachment.name}</span>
                                    <span style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                        {post.attachment.type.startsWith('image/') ? 'Image' : post.attachment.type.includes('pdf') ? 'PDF Document' : 'Word Document'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                );
            })}
        </>
    );

    const renderClasswork = () => (
        <>
            {classwork.slice().reverse().map(cw => {
                const icon = cw.type === 'module' ? 'fa-book' : 'fa-clipboard-check';
                const color = cw.type === 'module' ? '#4facfe' : '#e74c3c';
                const bg = cw.type === 'module' ? '#e6f4ff' : '#fceae9';
                return (
                    <div key={cw.id} className="post-card">
                        <div className="post-icon" style={{ background: bg, color: color }}><i className={`fas ${icon}`}></i></div>
                        <div className="post-content" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4>{cw.title} 
                                    {cw.assessmentType === 'time_attack' && <span style={{fontSize: '0.75rem', background: '#f39c12', color: 'white', padding: '3px 8px', borderRadius: '12px', marginLeft: '10px', verticalAlign: 'middle', fontWeight: 'bold'}}><i className="fas fa-stopwatch"></i> Time Attack</span>}
                                    {cw.assessmentType === 'custom' && cw.questions && <span style={{fontSize: '0.75rem', background: '#e74c3c', color: 'white', padding: '3px 8px', borderRadius: '12px', marginLeft: '10px', verticalAlign: 'middle', fontWeight: 'bold'}}><i className="fas fa-tasks"></i> Custom Quiz</span>}
                                </h4>
                                <button onClick={() => handleDeleteClasswork(cw.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.1rem' }} title="Delete Classwork"><i className="fas fa-trash"></i></button>
                            </div>
                            <span>Posted by {room.teacherFullName || room.teacher} • {new Date(cw.timestamp).toLocaleString()}</span>
                            <p>{cw.desc}</p>
                            {cw.attachment && (
                                <div style={{ marginTop: '15px', padding: '10px 15px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => setPreviewAttachment(cw.attachment)}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                                        <i className={`fas ${cw.attachment.type.startsWith('image/') ? 'fa-image' : cw.attachment.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-word'}`}></i>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <span style={{ color: '#2d3436', fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '300px' }}>{cw.attachment.name}</span>
                                        <span style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                            {cw.attachment.type.startsWith('image/') ? 'Image' : cw.attachment.type.includes('pdf') ? 'PDF Document' : 'Word Document'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </>
    );

    const renderPeople = () => (
        <>
            <h2 style={{ color: '#6e45e2', borderBottom: '2px solid #6e45e2', paddingBottom: '10px', marginBottom: '20px' }}>Teachers</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '1.1rem', color: '#333' }}>
                <i className="fas fa-user-circle" style={{ fontSize: '2rem', color: '#aaa' }}></i> {room?.teacherFullName || room?.teacher}
            </div>
        </>
    );

    if (!room) return (
        <div style={{ background: '#f8faff', minHeight: '100vh' }}>
            <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }} onClick={() => navigate('/dashboard')}>
                    <i className="fas fa-arrow-left" style={{ fontSize: '1.1rem', color: '#666', marginRight: '5px' }}></i>
                    <i className="fas fa-atom"></i>
                </div>
                <div></div>
                <div style={{ width: '130px' }}></div>
            </nav>
            <main className="room-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '3rem', color: '#6e45e2', marginBottom: '20px' }}></i>
                <h2 style={{ color: '#2d3436' }}>Entering Classroom...</h2>
                <p style={{ color: '#666' }}>Fetching data from the cloud</p>
            </main>
        </div>
    );

    // Array of floating items (icons and text) for the animated background
    const floatingItems = [
        { id: 1, icon: 'fas fa-atom', left: '10%', animDuration: '15s', delay: '0s', size: '3rem' },
        { id: 2, icon: 'fas fa-flask', left: '30%', animDuration: '20s', delay: '2s', size: '2.5rem' },
        { id: 3, text: 'H₂O', left: '50%', animDuration: '18s', delay: '4s', size: '2rem', fontWeight: 'bold' },
        { id: 4, icon: 'fas fa-vial', left: '70%', animDuration: '22s', delay: '1s', size: '3.5rem' },
        { id: 5, text: 'Au', left: '85%', animDuration: '16s', delay: '5s', size: '2.5rem', fontWeight: 'bold' },
        { id: 6, icon: 'fas fa-atom', left: '20%', animDuration: '25s', delay: '7s', size: '4rem' },
        { id: 7, text: 'O₂', left: '40%', animDuration: '19s', delay: '3s', size: '2.2rem', fontWeight: 'bold' },
        { id: 8, icon: 'fas fa-microscope', left: '60%', animDuration: '21s', delay: '6s', size: '3rem' },
        { id: 9, text: 'NaCl', left: '80%', animDuration: '24s', delay: '8s', size: '2.8rem', fontWeight: 'bold' },
        { id: 10, icon: 'fas fa-flask', left: '5%', animDuration: '17s', delay: '9s', size: '2rem' },
    ];

    return (
        <div style={{ position: 'relative' }}>
            {/* Floating Chemistry Background */}
            <div className="floating-background">
                {floatingItems.map(item => (
                    <div 
                        key={item.id} 
                        className="floating-item" 
                        style={{ 
                            left: item.left, 
                            animationDuration: item.animDuration, 
                            animationDelay: item.delay,
                            fontSize: item.size,
                            fontWeight: item.fontWeight || 'normal'
                        }}
                    >
                        {item.icon ? <i className={item.icon}></i> : item.text}
                    </div>
                ))}
            </div>
            <style>
                {`
                    .floating-background {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        pointer-events: none;
                        z-index: 0;
                        overflow: hidden;
                    }
                    .floating-item {
                        position: absolute;
                        color: #6e45e2;
                        opacity: 0.08;
                        bottom: -100px;
                        animation: float-up infinite linear;
                    }
                    @keyframes float-up {
                        0% { transform: translateY(0) rotate(0deg); }
                        100% { transform: translateY(-120vh) rotate(360deg); }
                    }
                `}
            </style>
            <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }} onClick={() => navigate('/dashboard')}>
                    <i className="fas fa-arrow-left" style={{ fontSize: '1.1rem', color: '#666', marginRight: '5px' }}></i>
                    <i className="fas fa-atom"></i>
                </div>
                <ul className="nav-links">
                    <li className={activeTab === 'stream' ? 'active' : ''} onClick={() => setActiveTab('stream')}><i className="fas fa-stream"></i> <span>Stream</span></li>
                    <li className={activeTab === 'classwork' ? 'active' : ''} onClick={() => setActiveTab('classwork')}><i className="fas fa-clipboard-list"></i> <span>Classwork</span></li>
                    <li className={activeTab === 'people' ? 'active' : ''} onClick={() => setActiveTab('people')}><i className="fas fa-users"></i> <span>People</span></li>
                </ul>
                <div style={{ width: '130px' }}></div>
            </nav>

            <main className="room-container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="class-banner" style={{ background: roomColorPresets.find(c => c.id === (room.colorTheme || 'purple'))?.bg }}>
                    <h1>{room.section}</h1>
                    <p>{room.grade}</p>
                    <i className="fas fa-flask banner-icon"></i>
                </div>

                {activeTab === 'classwork' && (
                    <div className="classwork-summary-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', border: '1px solid #eee', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}><i className="fas fa-book"></i></div>
                                <div>
                                    <p style={{ margin: 0, color: '#888', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Modules</p>
                                    <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#2d3436' }}>{classwork.filter(cw => cw.type === 'module').length}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: '#fceae9', color: '#e74c3c', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}><i className="fas fa-clipboard-check"></i></div>
                                <div>
                                    <p style={{ margin: 0, color: '#888', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Assessments</p>
                                    <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#2d3436' }}>{classwork.filter(cw => cw.type === 'assessment').length}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '2px solid #f0f2f5', paddingLeft: '30px' }}>
                                <div>
                                    <p style={{ margin: 0, color: '#888', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Total Items</p>
                                    <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#6e45e2' }}>{classwork.length}</p>
                                </div>
                            </div>
                        </div>
                        <button className="btn-primary" onClick={() => setIsCwModalOpen(true)}><i className="fas fa-plus"></i> Create</button>
                    </div>
                )}

                <div className="content-layout">
                    <aside className="side-panel">
                        {(activeTab === 'stream' || activeTab === 'classwork') && (
                            <div className="info-box">
                                <h3>Class Code</h3>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                                    <p style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#6e45e2', letterSpacing: '2px', margin: 0 }}>
                                        {room.classCode || roomId.substring(roomId.length - 6).toUpperCase()}
                                    </p>
                                    <button 
                                        onClick={handleCopyCode} 
                                        style={{ background: isCopied ? '#e3fdf5' : '#f0f2f5', border: 'none', color: isCopied ? '#10ac84' : '#888', cursor: 'pointer', fontSize: '1.1rem', width: '40px', height: '40px', borderRadius: '10px', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                        title="Copy Class Code"
                                    >
                                        <i className={isCopied ? "fas fa-check" : "far fa-copy"}></i>
                                    </button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'people' && (
                            <div className="info-box" style={{ textAlign: 'center' }}>
                                <i className="fas fa-users" style={{ fontSize: '3rem', color: '#e1e1e1', marginBottom: '10px' }}></i>
                                <h3 style={{ marginBottom: '5px' }}>Class Roster</h3>
                                <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>Manage your students and co-teachers here.</p>
                            </div>
                        )}
                    </aside>
                    <section className="main-panel">
                        {activeTab === 'stream' && renderStream()}
                        {activeTab === 'classwork' && renderClasswork()}
                        {activeTab === 'people' && renderPeople()}
                    </section>
                </div>
            </main>

            {/* Create Post Modal */}
            {isPostModalOpen && (
                <div className="modal-container show" onClick={() => setIsPostModalOpen(false)}>
                    <div className="modal-content announce-modal" onClick={e => e.stopPropagation()}>
                        <div className="announce-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 style={{ margin: 0 }}>Create</h2>
                                <div style={{ display: 'flex', gap: '5px', background: '#f0f2f5', padding: '4px', borderRadius: '10px' }}>
                                    <button type="button" onClick={() => setPostType('Announcement')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: postType === 'Announcement' ? 'white' : 'transparent', color: postType === 'Announcement' ? '#10ac84' : '#666', fontWeight: '600', cursor: 'pointer', boxShadow: postType === 'Announcement' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fas fa-comment-dots"></i> Announcement
                                    </button>
                                    <button type="button" onClick={() => setPostType('Module')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: postType === 'Module' ? 'white' : 'transparent', color: postType === 'Module' ? '#4facfe' : '#666', fontWeight: '600', cursor: 'pointer', boxShadow: postType === 'Module' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fas fa-book"></i> Module
                                    </button>
                                </div>
                            </div>
                            <button className="close-modal" onClick={() => setIsPostModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreatePost}>
                            <input 
                                type="file" 
                                accept="image/*,application/pdf" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }} 
                                onChange={handleFileChange} 
                            />
                            <div className="announce-input-area" style={{ flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                                    <div className="avatar"><i className="fas fa-user"></i></div>
                                    <textarea value={postContent} onChange={e => setPostContent(e.target.value)} rows="4" placeholder="Share something with your class..." className="modern-textarea" autoFocus></textarea>
                                </div>
                                {attachment && (
                                    <div style={{ marginLeft: '60px', padding: '10px 15px', background: '#f8f9fa', border: '1px solid #e1e1e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 'calc(100% - 60px)', boxSizing: 'border-box' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#333', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <i className={`fas ${attachment.type.startsWith('image/') ? 'fa-image' : attachment.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-word'}`} style={{ color: '#6e45e2', fontSize: '1.2rem' }}></i> 
                                            {attachment.name}
                                        </span>
                                        <button type="button" onClick={() => setAttachment(null)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.1rem' }}><i className="fas fa-times"></i></button>
                                    </div>
                                )}
                            </div>
                            <div className="announce-toolbar">
                                <div className="toolbar-icons">
                                <button type="button" title="Attach file" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                    <i className="fas fa-paperclip"></i>
                                </button>
                                <button type="button" title="Add link" onClick={() => { 
                                    const url = window.prompt("Enter the URL to share:"); 
                                    if (url) setPostContent(prev => prev + (prev.endsWith(' ') ? '' : ' ') + url + ' '); 
                                }}>
                                    <i className="fas fa-link"></i>
                                </button>
                                <button type="button" title="Format text" onClick={() => {
                                    setPostContent(prev => prev + (prev.endsWith(' ') ? '' : ' ') + '**bold text** ');
                                }}>
                                    <i className="fas fa-bold"></i>
                                </button>
                                </div>
                                <div className="modal-actions" style={{ marginTop: 0 }}>
                                    <button type="button" className="btn-cancel" onClick={() => setIsPostModalOpen(false)}>Cancel</button>
                                    <button type="submit" className={`btn-confirm ${(!postContent.trim() && !attachment) || isUploading ? 'disabled' : ''}`} disabled={(!postContent.trim() && !attachment) || isUploading}>
                                        {isUploading ? 'Posting...' : 'Post'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Classwork Modal */}
            {isCwModalOpen && (
                <div className="modal-container show" onClick={() => setIsCwModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '20px' }}>Create Assessment</h2>
                        <form onSubmit={handleCreateClasswork}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div 
                                    onClick={() => { setAssessmentType('time_attack'); setCwTitle('Time Attack Challenge'); setCwDesc('Play the Time Attack mode and try to beat the high score!'); setAttachment(null); }}
                                    style={{ padding: '20px', border: assessmentType === 'time_attack' ? '2px solid #f39c12' : '2px solid #eee', borderRadius: '12px', cursor: 'pointer', background: assessmentType === 'time_attack' ? '#fffdf7' : '#fff', transition: 'all 0.2s', textAlign: 'center' }}
                                >
                                    <i className="fas fa-stopwatch" style={{ fontSize: '2rem', color: '#f39c12', marginBottom: '10px' }}></i>
                                    <h3 style={{ color: '#2d3436', marginBottom: '5px', fontSize: '1.1rem' }}>Time Attack</h3>
                                    <p style={{ color: '#666', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>Assign the built-in fast-paced chemistry quiz game.</p>
                                </div>
                                <div 
                                    onClick={() => { setAssessmentType('custom'); setCwTitle(''); setCwDesc(''); }}
                                    style={{ padding: '20px', border: assessmentType === 'custom' ? '2px solid #e74c3c' : '2px solid #eee', borderRadius: '12px', cursor: 'pointer', background: assessmentType === 'custom' ? '#fcf3f2' : '#fff', transition: 'all 0.2s', textAlign: 'center' }}
                                >
                                    <i className="fas fa-list-ul" style={{ fontSize: '2rem', color: '#e74c3c', marginBottom: '10px' }}></i>
                                    <h3 style={{ color: '#2d3436', marginBottom: '5px', fontSize: '1.1rem' }}>Custom Quiz</h3>
                                    <p style={{ color: '#666', fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>Build your own multiple-choice quiz questions.</p>
                                </div>
                            </div>

                            <div className="input-group">
                                <input type="text" value={cwTitle} onChange={e => setCwTitle(e.target.value)} placeholder="Assessment Title (e.g., Chapter 1 Quiz)" required />
                            </div>
                            <div className="input-group">
                                <textarea value={cwDesc} onChange={e => setCwDesc(e.target.value)} rows="3" placeholder="Instructions (Optional)"></textarea>
                            </div>

                            {assessmentType === 'custom' && (
                                <>
                                <div className="input-group">
                                    {!attachment ? (
                                        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '12px', background: '#f8f9fa', border: '1px dashed #ccc', borderRadius: '8px', color: '#666', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: '600', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#6e45e2'; e.currentTarget.style.color = '#6e45e2'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#666'; }}>
                                            <i className="fas fa-paperclip"></i> Attach File Reference (Optional)
                                        </button>
                                    ) : (
                                        <div style={{ padding: '10px 15px', background: '#f8f9fa', border: '1px solid #e1e1e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#333', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <i className={`fas ${attachment.type.startsWith('image/') ? 'fa-image' : 'fa-file-pdf'}`} style={{ color: '#6e45e2', fontSize: '1.2rem' }}></i> 
                                                {attachment.name}
                                            </span>
                                            <button type="button" onClick={() => setAttachment(null)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.1rem' }}><i className="fas fa-times"></i></button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="quiz-builder" style={{ marginTop: '20px', borderTop: '2px solid #f0f2f5', paddingTop: '20px', marginBottom: '20px' }}>
                                    <h3 style={{ color: '#2d3436', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <i className="fas fa-question-circle" style={{ color: '#e74c3c' }}></i> Quiz Questions
                                    </h3>
                                    {quizQuestions.map((q, qIndex) => (
                                        <div key={qIndex} style={{ background: '#fdfdfd', padding: '15px', borderRadius: '12px', border: '1px solid #e1e1e1', marginBottom: '15px', position: 'relative', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                            {quizQuestions.length > 1 && (
                                                <button type="button" onClick={() => removeQuestion(qIndex)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.1rem' }} title="Remove Question"><i className="fas fa-trash-alt"></i></button>
                                            )}
                                            <div className="input-group" style={{ marginBottom: '15px', paddingRight: quizQuestions.length > 1 ? '30px' : '0' }}>
                                                <input type="text" value={q.question} onChange={e => handleQuestionChange(qIndex, 'question', e.target.value)} placeholder={`Question ${qIndex + 1}`} required style={{ fontWeight: 'bold', fontSize: '1.05rem', border: 'none', borderBottom: '2px solid #ddd', borderRadius: 0, background: 'transparent', padding: '10px 0' }} />
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', fontWeight: '600' }}>Select the correct answer:</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} style={{ display: 'flex', alignItems: 'center', background: '#fff', border: q.correctOption === oIndex ? '2px solid #1dd1a1' : '1px solid #ddd', borderRadius: '8px', padding: '5px 10px', transition: 'all 0.2s', boxShadow: q.correctOption === oIndex ? '0 2px 8px rgba(29, 209, 161, 0.2)' : 'none' }}>
                                                        <input type="radio" name={`correct-${qIndex}`} checked={q.correctOption === oIndex} onChange={() => handleQuestionChange(qIndex, 'correctOption', oIndex)} style={{ marginRight: '8px', cursor: 'pointer', accentColor: '#1dd1a1', width: '18px', height: '18px' }} />
                                                        <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oIndex)}`} required style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.95rem' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addQuestion} style={{ width: '100%', padding: '12px', background: 'transparent', border: '2px dashed #ccc', borderRadius: '8px', color: '#666', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#6e45e2'; e.currentTarget.style.color = '#6e45e2'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#666'; }}>
                                        <i className="fas fa-plus"></i> Add Another Question
                                    </button>
                                </div>
                                </>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsCwModalOpen(false)}>Cancel</button>
                                <button type="submit" className={`btn-confirm ${isUploading ? 'disabled' : ''}`} disabled={isUploading}>{isUploading ? 'Posting...' : 'Post'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Post Modal */}
            {isEditPostModalOpen && selectedPost && (
                <div className="modal-container show" onClick={() => setIsEditPostModalOpen(false)}>
                    <div className="modal-content announce-modal" onClick={e => e.stopPropagation()}>
                        <div className="announce-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 style={{ margin: 0 }}>Edit</h2>
                                <div style={{ display: 'flex', gap: '5px', background: '#f0f2f5', padding: '4px', borderRadius: '10px' }}>
                                    <button type="button" onClick={() => setEditPostType('Announcement')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: editPostType === 'Announcement' ? 'white' : 'transparent', color: editPostType === 'Announcement' ? '#10ac84' : '#666', fontWeight: '600', cursor: 'pointer', boxShadow: editPostType === 'Announcement' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fas fa-comment-dots"></i> Announcement
                                    </button>
                                    <button type="button" onClick={() => setEditPostType('Module')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: editPostType === 'Module' ? 'white' : 'transparent', color: editPostType === 'Module' ? '#4facfe' : '#666', fontWeight: '600', cursor: 'pointer', boxShadow: editPostType === 'Module' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <i className="fas fa-book"></i> Module
                                    </button>
                                </div>
                            </div>
                            <button className="close-modal" onClick={() => setIsEditPostModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleEditPostSubmit}>
                            <div className="announce-input-area" style={{ flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                                    <div className="avatar"><i className="fas fa-user"></i></div>
                                    <textarea value={editPostContent} onChange={e => setEditPostContent(e.target.value)} rows="4" placeholder="Share something with your class..." className="modern-textarea" autoFocus></textarea>
                                </div>
                                {selectedPost.attachment && (
                                    <div style={{ marginLeft: '60px', padding: '10px 15px', background: '#f8f9fa', border: '1px solid #e1e1e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 'calc(100% - 60px)', boxSizing: 'border-box' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#333', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <i className={`fas ${selectedPost.attachment.type.startsWith('image/') ? 'fa-image' : selectedPost.attachment.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-word'}`} style={{ color: '#6e45e2', fontSize: '1.2rem' }}></i> 
                                            {selectedPost.attachment.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="announce-toolbar">
                                <div className="toolbar-icons">
                                    <button type="button" title="Attach file" onClick={() => alert("Editing attachments will be supported in a future update!")}>
                                        <i className="fas fa-paperclip"></i>
                                    </button>
                                    <button type="button" title="Add link" onClick={() => { 
                                        const url = window.prompt("Enter the URL to share:"); 
                                        if (url) setEditPostContent(prev => prev + (prev.endsWith(' ') ? '' : ' ') + url + ' '); 
                                    }}>
                                        <i className="fas fa-link"></i>
                                    </button>
                                    <button type="button" title="Format text" onClick={() => {
                                        setEditPostContent(prev => prev + (prev.endsWith(' ') ? '' : ' ') + '**bold text** ');
                                    }}>
                                        <i className="fas fa-bold"></i>
                                    </button>
                                </div>
                                <div className="modal-actions" style={{ marginTop: 0 }}>
                                    <button type="button" className="btn-cancel" onClick={() => setIsEditPostModalOpen(false)}>Cancel</button>
                                    <button type="submit" className={`btn-confirm ${!editPostContent.trim() ? 'disabled' : ''}`} disabled={!editPostContent.trim()}>Save Changes</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Post Modal */}
            {isDeletePostModalOpen && selectedPost && (
                <div className="modal-container show" onClick={() => setIsDeletePostModalOpen(false)}>
                    <div className="modal-content" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <i className="fas fa-exclamation-triangle modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Delete Post</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to delete this post? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setIsDeletePostModalOpen(false)}>Cancel</button>
                            <button className="btn-confirm" onClick={handleConfirmDeletePost} style={{ backgroundColor: '#e74c3c' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* File Preview Modal */}
            {previewAttachment && (
                <div className="modal-container show" style={{ zIndex: 9999, backdropFilter: 'blur(5px)' }} onClick={() => setPreviewAttachment(null)}>
                    <div className="modal-content" style={{ width: '95%', maxWidth: '1400px', height: '95vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1e1e1e', border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
                        
                        {/* Dark Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#2d3436', borderBottom: '1px solid #444' }}>
                            <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <i className={`fas ${previewAttachment.type.startsWith('image/') ? 'fa-image' : previewAttachment.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-word'}`} style={{ color: '#4facfe' }}></i>
                                {previewAttachment.name}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button onClick={() => window.open(previewAttachment.url, '_blank')} style={{ background: '#4facfe', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                                    <i className="fas fa-external-link-alt"></i> Open
                                </button>
                                <button onClick={() => setPreviewAttachment(null)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1, padding: '0 5px' }}>&times;</button>
                            </div>
                        </div>

                        {/* Edge-to-Edge Document Body */}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f0f0f', position: 'relative' }}>
                            {isPreviewLoading && (
                                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#4facfe', zIndex: 1 }}>
                                    <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '3rem', marginBottom: '10px' }}></i>
                                    <span style={{ fontWeight: '600', color: '#fff' }}>Loading preview...</span>
                                </div>
                            )}
                            {previewAttachment.type.startsWith('image/') ? (
                                <img src={previewAttachment.url} alt={previewAttachment.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: isPreviewLoading ? 0 : 1, transition: 'opacity 0.3s', position: 'relative', zIndex: 2 }} onLoad={() => setIsPreviewLoading(false)} />
                            ) : previewAttachment.type.includes('pdf') ? (
                                <object data={`${previewAttachment.url}#toolbar=0&navpanes=0`} type="application/pdf" width="100%" height="100%" style={{ position: 'relative', zIndex: 2 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '20px' }}>
                                        <i className="fas fa-file-pdf" style={{ fontSize: '4rem', color: '#e74c3c', marginBottom: '15px' }}></i>
                                        <p style={{ color: '#ccc', marginBottom: '20px' }}>Your browser doesn't support inline PDF viewing.</p>
                                        <button className="btn-primary" onClick={() => window.open(previewAttachment.url, '_blank')} style={{ background: '#4facfe' }}><i className="fas fa-external-link-alt" style={{ marginRight: '8px' }}></i> Open PDF</button>
                                    </div>
                                </object>
                            ) : (
                                <iframe src={previewAttachment.url} title={previewAttachment.name} width="100%" height="100%" style={{ border: 'none', opacity: isPreviewLoading ? 0 : 1, transition: 'opacity 0.3s', position: 'relative', zIndex: 2, background: 'white' }} onLoad={() => setIsPreviewLoading(false)}></iframe>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}