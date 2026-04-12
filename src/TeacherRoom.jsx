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
    const [cwType, setCwType] = useState('module');
    const [cwTitle, setCwTitle] = useState('');
    const [cwDesc, setCwDesc] = useState('');

    // Attachment States
    const [attachment, setAttachment] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Announcement Edit/Delete States
    const [activePostMenu, setActivePostMenu] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
    const [isDeletePostModalOpen, setIsDeletePostModalOpen] = useState(false);
    const [editPostContent, setEditPostContent] = useState('');

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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate allowed file types
        const validTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
            alert('Invalid file type! Only Images, PDFs, and Word documents are allowed.');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('File is too large! Maximum size is 10MB.');
            return;
        }

        setAttachment(file);
        e.target.value = ''; // Reset hidden input
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
                
                // Put your Cloudinary cloud name here! (Keep /auto/upload exactly as is)
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
                text: postContent,
                attachment: attachmentData,
                author: room.teacherFullName || room.teacher,
                timestamp: new Date().toISOString()
            };

            const updatedPosts = [...posts, newPost];
            const roomRef = doc(db, "teacher_rooms", roomId);
            await updateDoc(roomRef, { posts: updatedPosts });
            setPostContent('');
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
            p.id === selectedPost.id ? { ...p, text: editPostContent } : p
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

        const newClasswork = {
            id: Date.now(),
            type: cwType,
            title: cwTitle,
            desc: cwDesc,
            timestamp: new Date().toISOString()
        };

        const updatedClasswork = [...classwork, newClasswork];
        try {
            const roomRef = doc(db, "teacher_rooms", roomId);
            await updateDoc(roomRef, { classwork: updatedClasswork });
            
            // Reset form and close modal
            setCwTitle('');
            setCwDesc('');
            setIsCwModalOpen(false);
        } catch (error) {
            console.error("Error creating classwork: ", error);
            alert("Failed to create classwork. Please try again.");
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
                Announce something to your class
            </div>
            {posts.slice().reverse().map(post => (
                <div key={post.id} className="post-card">
                    <div className="post-icon" style={{ background: '#e3fdf5', color: '#10ac84' }}><i className="fas fa-comment-dots"></i></div>
                    <div className="post-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4>Announcement</h4>
                            <div className="menu-container post-menu-container">
                                <button className="btn-menu" onClick={(e) => { e.stopPropagation(); setActivePostMenu(activePostMenu === post.id ? null : post.id); }}>
                                    <i className="fas fa-ellipsis-v"></i>
                                </button>
                                {activePostMenu === post.id && (
                                    <div className="dropdown-menu show" style={{ right: 0, top: '35px', width: '130px' }} onClick={e => e.stopPropagation()}>
                                        <div className="dropdown-item" onClick={() => {
                                            setSelectedPost(post);
                                            setEditPostContent(post.text);
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
                            <div style={{ marginTop: '15px', padding: '10px 15px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s', cursor: 'pointer' }} onClick={() => window.open(post.attachment.url, '_blank')}>
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
            ))}
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
                        <div className="post-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4>{cw.title}</h4>
                                <button onClick={() => handleDeleteClasswork(cw.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.1rem' }} title="Delete Classwork"><i className="fas fa-trash"></i></button>
                            </div>
                            <span>Posted by {room.teacherFullName || room.teacher} • {new Date(cw.timestamp).toLocaleString()}</span>
                            <p>{cw.desc}</p>
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
                    <div className="classwork-actions">
                        <button className="btn-primary" onClick={() => setIsCwModalOpen(true)}><i className="fas fa-plus"></i> Create</button>
                    </div>
                )}

                <div className="content-layout">
                    <aside className="side-panel">
                        <div className="info-box">
                            <h3>Class Code</h3>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6e45e2', letterSpacing: '2px' }}>
                                {room.classCode || roomId.substring(roomId.length - 6).toUpperCase()}
                            </p>
                        </div>
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
                <div className="modal-container show">
                    <div className="modal-content announce-modal">
                        <div className="announce-modal-header">
                            <h2>Create Announcement</h2>
                            <button className="close-modal" onClick={() => setIsPostModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreatePost}>
                            <input 
                                type="file" 
                                accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
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
                <div className="modal-container">
                    <div className="modal-content">
                        <h2 style={{ marginBottom: '20px' }}>Create Classwork</h2>
                        <form onSubmit={handleCreateClasswork}>
                            <div className="input-group">
                                <select value={cwType} onChange={e => setCwType(e.target.value)}>
                                    <option value="module">Module / Material</option>
                                    <option value="assessment">Assessment</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <input type="text" value={cwTitle} onChange={e => setCwTitle(e.target.value)} placeholder="Title (e.g., Chapter 1: The Atom)" required />
                            </div>
                            <div className="input-group">
                                <textarea value={cwDesc} onChange={e => setCwDesc(e.target.value)} rows="3" placeholder="Instructions (Optional)"></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsCwModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-confirm">Post</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Post Modal */}
            {isEditPostModalOpen && selectedPost && (
                <div className="modal-container show">
                    <div className="modal-content">
                        <h2 style={{ marginBottom: '20px' }}>Edit Announcement</h2>
                        <form onSubmit={handleEditPostSubmit}>
                            <textarea value={editPostContent} onChange={e => setEditPostContent(e.target.value)} rows="5" style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '1rem', resize: 'vertical' }} required></textarea>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsEditPostModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-confirm">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Post Modal */}
            {isDeletePostModalOpen && selectedPost && (
                <div className="modal-container show">
                    <div className="modal-content" style={{ textAlign: 'center' }}>
                        <i className="fas fa-exclamation-triangle modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Delete Announcement</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to delete this announcement? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setIsDeletePostModalOpen(false)}>Cancel</button>
                            <button className="btn-confirm" onClick={handleConfirmDeletePost} style={{ backgroundColor: '#e74c3c' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}