import React, { useState, useEffect } from 'react';
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

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!postContent.trim()) return alert('Announcement cannot be empty!');

        const newPost = {
            id: Date.now(),
            text: postContent,
            author: room.teacherFullName || room.teacher,
            timestamp: new Date().toISOString()
        };

        const updatedPosts = [...posts, newPost];
        try {
            const roomRef = doc(db, "teacher_rooms", roomId);
            await updateDoc(roomRef, { posts: updatedPosts });
            setPostContent('');
            setIsPostModalOpen(false);
        } catch (error) {
            console.error("Error creating post: ", error);
            alert("Failed to create post. Please try again.");
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
                        <h4>Announcement</h4>
                        <span>Posted by {post.author} • {new Date(post.timestamp).toLocaleString()}</span>
                        <p>{post.text}</p>
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

    return (
        <div>
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

            <main className="room-container">
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
                <div className="modal-container">
                    <div className="modal-content">
                        <h2 style={{ marginBottom: '20px' }}>Announce something to your class</h2>
                        <form onSubmit={handleCreatePost}>
                            <textarea value={postContent} onChange={e => setPostContent(e.target.value)} rows="5" placeholder="Share with your class..." style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', fontSize: '1rem', resize: 'vertical' }}></textarea>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsPostModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-confirm">Post</button>
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
        </div>
    );
}