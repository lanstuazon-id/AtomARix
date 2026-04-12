import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './StudentRoom.css';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const roomColorPresets = [
    { id: 'purple', bg: 'linear-gradient(135deg, #6e45e2 0%, #8e44ad 100%)' },
    { id: 'blue', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'green', bg: 'linear-gradient(135deg, #1dd1a1 0%, #10ac84 100%)' },
    { id: 'orange', bg: 'linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%)' },
    { id: 'pink', bg: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)' },
    { id: 'teal', bg: 'linear-gradient(135deg, #00cec9 0%, #01a3a4 100%)' }
];

export default function StudentRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const userName = sessionStorage.getItem('loggedInUser');

    const [room, setRoom] = useState(null);
    const [activeTab, setActiveTab] = useState('stream');
    const [posts, setPosts] = useState([]);
    const [classwork, setClasswork] = useState([]);
    const [previewAttachment, setPreviewAttachment] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(true);

    // Quiz States
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);

    useEffect(() => {
        // Enforce user login
        if (!userName) {
            navigate('/');
            return;
        }

        const roomRef = doc(db, "teacher_rooms", roomId);
        
        // Listen for real-time updates while inside the room
        const unsubscribe = onSnapshot(roomRef, (roomSnap) => {
            if (roomSnap.exists()) {
                const roomData = roomSnap.data();
                setRoom({ id: roomSnap.id, ...roomData });
                const roomPosts = roomData.posts || [];
                const roomClasswork = roomData.classwork || [];
                setPosts(roomPosts);
                setClasswork(roomClasswork);
            } else {
                alert('Room has been deleted by the teacher.');
                navigate('/home');
            }
        }, (error) => {
            console.error("Error fetching room:", error);
            alert('Error loading room data in real-time.');
            navigate('/home');
        });

        return () => unsubscribe();
    }, [roomId, navigate, userName]);

    // Mark room updates as read when the student views the room
    useEffect(() => {
        if (room && userName && roomId) {
            let latestTime = parseInt(localStorage.getItem(`lastRead_${userName}_${roomId}`) || '0', 10);
            let updated = false;

            const checkTime = (timestamp) => {
                const t = new Date(timestamp).getTime();
                if (t > latestTime) {
                    latestTime = t;
                    updated = true;
                }
            };

            (room.posts || []).forEach(p => checkTime(p.timestamp));
            (room.classwork || []).forEach(cw => checkTime(cw.timestamp));

            if (updated) {
                localStorage.setItem(`lastRead_${userName}_${roomId}`, latestTime.toString());
                const userRef = doc(db, "users", userName);
                setDoc(userRef, { [`lastRead_${roomId}`]: latestTime }, { merge: true }).catch(e => console.error("Error syncing read time:", e));
            }
        }
    }, [room, userName, roomId]);

    useEffect(() => {
        if (previewAttachment) {
            // PDFs don't reliably fire onLoad in iframes, so we skip the spinner for them
            setIsPreviewLoading(!previewAttachment.type.includes('pdf'));
        }
    }, [previewAttachment]);

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (previewAttachment || activeQuiz) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [previewAttachment, activeQuiz]);

    const handleLeaveRoom = async () => {
        if (window.confirm("Are you sure you want to leave this class? You will need the class code to join again.")) {
            try {
                const userRef = doc(db, "users", userName);
                await setDoc(userRef, { joinedRoomId: null }, { merge: true });
            } catch (error) {
                console.error("Error leaving room:", error);
            }
            localStorage.removeItem(`joinedRoomId_${userName}`);
            localStorage.removeItem(`joinedRoomSection_${userName}`);
            navigate('/home');
        }
    };

    const renderStream = () => (
        <>
            {posts.length === 0 && (
                <div className="post-card">
                    <div className="post-icon"><i className="fas fa-clipboard-list"></i></div>
                    <div className="post-content">
                        <h4>Welcome to AtomARix Classroom!</h4>
                        <span>Posted by {room?.teacherFullName || room?.teacher} • Class created</span>
                        <p>This is your new virtual learning environment. Your teacher will post modules, assignments, and activities here soon.</p>
                    </div>
                </div>
            )}
            {posts.slice().reverse().map(post => {
                const pType = post.type || 'Announcement';
                const pIcon = pType === 'Module' ? 'fa-book' : 'fa-comment-dots';
                const pColor = pType === 'Module' ? '#4facfe' : '#10ac84';
                const pBg = pType === 'Module' ? '#eaf4ff' : '#e3fdf5';

                return (
                <div key={post.id} className="post-card">
                    <div className="post-icon" style={{ background: pBg, color: pColor }}><i className={`fas ${pIcon}`}></i></div>
                    <div className="post-content">
                        <h4>{pType}</h4>
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
            {classwork.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-book-reader"></i>
                    <p>Your teacher hasn't assigned any classwork yet.</p>
                </div>
            ) : (
                classwork.slice().reverse().map(cw => {
                    const icon = cw.type === 'module' ? 'fa-book' : 'fa-clipboard-check';
                    const color = cw.type === 'module' ? '#4facfe' : '#e74c3c';
                    const bg = cw.type === 'module' ? '#e6f4ff' : '#fceae9';
                    return (
                        <div key={cw.id} className="post-card">
                            <div className="post-icon" style={{ background: bg, color: color }}><i className={`fas ${icon}`}></i></div>
                            <div className="post-content" style={{ width: '100%' }}>
                                <h4>{cw.title} 
                                    {cw.assessmentType === 'time_attack' && <span style={{fontSize: '0.75rem', background: '#f39c12', color: 'white', padding: '3px 8px', borderRadius: '12px', marginLeft: '10px', verticalAlign: 'middle', fontWeight: 'bold'}}><i className="fas fa-stopwatch"></i> Time Attack</span>}
                                    {cw.assessmentType === 'custom' && cw.questions && <span style={{fontSize: '0.75rem', background: '#e74c3c', color: 'white', padding: '3px 8px', borderRadius: '12px', marginLeft: '10px', verticalAlign: 'middle', fontWeight: 'bold'}}><i className="fas fa-tasks"></i> Custom Quiz</span>}
                                </h4>
                                <span>Posted by {room?.teacherFullName || room?.teacher} • {new Date(cw.timestamp).toLocaleString()}</span>
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
                                {cw.assessmentType === 'time_attack' && (
                                    <button onClick={() => navigate('/timeattack')} style={{ marginTop: '15px', background: '#f39c12', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(243, 156, 18, 0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                        <i className="fas fa-gamepad"></i> Play Time Attack
                                    </button>
                                )}
                                {cw.assessmentType === 'custom' && cw.questions && (
                                    <button onClick={() => { setActiveQuiz(cw); setCurrentQuestionIndex(0); setQuizAnswers({}); setQuizResult(null); }} style={{ marginTop: '15px', background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(231, 76, 60, 0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                        <i className="fas fa-tasks"></i> Take Custom Quiz
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
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
                <div className="nav-brand" style={{ width: '130px' }} onClick={() => navigate('/home')}>
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
                <div className="nav-brand" style={{ width: '130px' }} onClick={() => navigate('/home')}>
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

                <div className="content-layout">
                    <aside className="side-panel">
                        <div className="info-box" style={{ marginBottom: '15px' }}>
                            <h3>Upcoming</h3>
                            <p>Woohoo, no work due soon!</p>
                        </div>
                        <div className="info-box" style={{ marginTop: '15px', textAlign: 'center', borderColor: '#fceae9', background: '#fffcfc' }}>
                            <button onClick={handleLeaveRoom} className="btn-leave-room"><i className="fas fa-sign-out-alt"></i> Leave Room</button>
                        </div>
                    </aside>
                    <section className="main-panel">
                        {activeTab === 'stream' && renderStream()}
                        {activeTab === 'classwork' && renderClasswork()}
                        {activeTab === 'people' && renderPeople()}
                    </section>
                </div>
            </main>

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

            {/* Custom Quiz Modal */}
            {activeQuiz && (
                <div className="modal-container show" style={{ zIndex: 9999, backdropFilter: 'blur(5px)' }} onClick={() => setActiveQuiz(null)}>
                    <div className="modal-content" style={{ width: '90%', maxWidth: '800px', height: '80vh', padding: '30px', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '16px', border: '1px solid #eee' }} onClick={e => e.stopPropagation()}>
                        {quizResult !== null ? (
                            <div style={{ textAlign: 'center', margin: 'auto' }}>
                                <i className="fas fa-trophy" style={{ fontSize: '5rem', color: '#f1c40f', marginBottom: '20px' }}></i>
                                <h2 style={{ color: '#2d3436', fontSize: '2rem', marginBottom: '10px' }}>Quiz Completed!</h2>
                                <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '30px' }}>You scored <strong>{quizResult}</strong> out of <strong>{activeQuiz.questions.length}</strong>.</p>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                    <button className="btn-cancel" onClick={() => setActiveQuiz(null)}>Close</button>
                                    <button className="btn-confirm" onClick={() => { setCurrentQuestionIndex(0); setQuizAnswers({}); setQuizResult(null); }}>Retake Quiz</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', marginBottom: '20px' }}>
                                    <div>
                                        <h2 style={{ margin: 0, color: '#2d3436', fontSize: '1.5rem' }}>{activeQuiz.title}</h2>
                                        <p style={{ margin: 0, color: '#888', fontSize: '0.95rem', marginTop: '5px', fontWeight: '600' }}>Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</p>
                                    </div>
                                    <button className="close-modal" onClick={() => setActiveQuiz(null)} style={{ position: 'static' }}>&times;</button>
                                </div>
                                
                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                                    <h3 style={{ fontSize: '1.25rem', color: '#333', marginBottom: '25px', lineHeight: '1.5' }}>
                                        {activeQuiz.questions[currentQuestionIndex].question}
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {activeQuiz.questions[currentQuestionIndex].options.map((opt, oIndex) => {
                                            const isSelected = quizAnswers[currentQuestionIndex] === oIndex;
                                            return (
                                                <button 
                                                    key={oIndex} 
                                                    onClick={() => setQuizAnswers({...quizAnswers, [currentQuestionIndex]: oIndex})}
                                                    style={{ textAlign: 'left', padding: '16px 20px', borderRadius: '12px', border: isSelected ? '2px solid #e74c3c' : '2px solid #eee', background: isSelected ? '#fcf3f2' : '#fff', color: isSelected ? '#e74c3c' : '#555', fontSize: '1.05rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '15px', fontWeight: isSelected ? '600' : 'normal' }}
                                                >
                                                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: isSelected ? '6px solid #e74c3c' : '2px solid #ccc', background: '#fff', transition: 'all 0.2s', flexShrink: 0 }}></div>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #f0f2f5' }}>
                                    <button 
                                        className="btn-cancel" 
                                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestionIndex === 0}
                                        style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1, cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer', background: '#f0f2f5' }}
                                    >
                                        <i className="fas fa-chevron-left" style={{ marginRight: '8px' }}></i> Previous
                                    </button>
                                    
                                    {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                                        <button 
                                            className="btn-confirm" 
                                            onClick={() => setCurrentQuestionIndex(prev => Math.min(activeQuiz.questions.length - 1, prev + 1))}
                                            disabled={quizAnswers[currentQuestionIndex] === undefined}
                                            style={{ background: quizAnswers[currentQuestionIndex] === undefined ? '#ccc' : '#e74c3c', cursor: quizAnswers[currentQuestionIndex] === undefined ? 'not-allowed' : 'pointer' }}
                                        >
                                            Next <i className="fas fa-chevron-right" style={{ marginLeft: '8px' }}></i>
                                        </button>
                                    ) : (
                                        <button 
                                            className="btn-confirm" 
                                            style={{ background: quizAnswers[currentQuestionIndex] === undefined ? '#ccc' : '#1dd1a1', cursor: quizAnswers[currentQuestionIndex] === undefined ? 'not-allowed' : 'pointer' }}
                                            disabled={quizAnswers[currentQuestionIndex] === undefined}
                                            onClick={() => {
                                                let score = 0;
                                                activeQuiz.questions.forEach((q, i) => {
                                                    if (quizAnswers[i] === q.correctOption) score++;
                                                });
                                                setQuizResult(score);
                                            }}
                                        >
                                            <i className="fas fa-check"></i> Submit Quiz
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}