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
                            <div className="post-content">
                                <h4>{cw.title}</h4>
                                <span>Posted by {room?.teacherFullName || room?.teacher} • {new Date(cw.timestamp).toLocaleString()}</span>
                                <p>{cw.desc}</p>
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

    return (
        <div>
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

            <main className="room-container">
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
        </div>
    );
}