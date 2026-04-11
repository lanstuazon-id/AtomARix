import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TeacherDashboard.css'; 
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function TeacherDashboard() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoomSection, setNewRoomSection] = useState('');
    const [newRoomGrade, setNewRoomGrade] = useState('');
    
    const userName = sessionStorage.getItem('loggedInUser') || 'Teacher';

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const q = query(collection(db, "teacher_rooms"), where("teacher", "==", userName));
                const querySnapshot = await getDocs(q);
                const myRooms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRooms(myRooms);
            } catch (error) {
                console.error("Error fetching rooms: ", error);
            }
        };
        if (userName) fetchRooms();
    }, [userName]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        if (!newRoomSection.trim() || !newRoomGrade.trim()) {
            alert("Please fill in both the section and grade level.");
            return;
        }

        const teacherFullName = sessionStorage.getItem('userFullname') || userName;
        
        // Generate a random 6-character alphanumeric code
        const generateClassCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        };

        const newRoom = {
            id: Date.now().toString(), // Generate a unique ID using timestamp
            section: newRoomSection.trim(),
            grade: newRoomGrade.trim(),
            teacher: userName,
            teacherFullName: teacherFullName,
            classCode: generateClassCode()
        };

        try {
            // Save the room to Firestore using the generated ID as the document ID
            await setDoc(doc(db, "teacher_rooms", newRoom.id), newRoom);
            
            setRooms([...rooms, newRoom]); // Update the UI
            setIsCreateModalOpen(false); // Close modal
            setNewRoomSection(''); // Reset inputs
            setNewRoomGrade('');
        } catch (error) {
            console.error("Error creating room: ", error);
            alert("Failed to create room. Please try again.");
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/'); // Use React Router to navigate instead of window.location.href
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8faff' }}>
            <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }}><i className="fas fa-atom"></i> <span>AtomARix</span></div>
                <ul className="nav-links">
                    <li className="active"><i className="fas fa-chalkboard-teacher"></i> Classrooms</li>
                </ul>
                <div style={{ width: '130px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer', background: 'none', border: '1px solid #ccc', borderRadius: '6px' }}>Logout</button>
                </div>
            </nav>

            <main className="dashboard-container">
                <div className="header-bar">
                    <h1>My Classrooms</h1>
                    <button className="btn-create" onClick={() => setIsCreateModalOpen(true)}>
                        <i className="fas fa-plus"></i> Create Room
                    </button>
                </div>

                <div className="rooms-grid">
                    {rooms.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-folder-open"></i>
                            <h2>No Classrooms Yet</h2>
                        </div>
                    ) : (
                        rooms.map(room => (
                            <div 
                                key={room.id} 
                                className="room-card" 
                                onClick={() => navigate(`/teacher-room/${room.id}`)}
                            >
                                <div className="room-header">
                                    <div className="room-header-text">
                                        <h2>{room.section}</h2>
                                        <p>{room.grade}</p>
                                    </div>
                                </div>
                                <div className="room-body">
                                    <div className="teacher-info">
                                        <div className="teacher-icon"><i className="fas fa-user"></i></div>
                                        <span>{room.teacherFullName || room.teacher}</span>
                                    </div>
                                    <i className="fas fa-arrow-right" style={{ color: '#ccc' }}></i>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {isCreateModalOpen && (
                <div className="modal-container show">
                    <div className="modal-content">
                        <h2 className="modal-title">Create New Classroom</h2>
                        <form onSubmit={handleCreateRoom}>
                            <div className="input-group">
                                <label htmlFor="sectionName">Classroom / Section Name</label>
                                <input 
                                    type="text" 
                                    id="sectionName"
                                    value={newRoomSection} 
                                    onChange={(e) => setNewRoomSection(e.target.value)} 
                                    placeholder="e.g. Armstrong" 
                                    required 
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="gradeLevel">Grade Level</label>
                                <input 
                                    type="text" 
                                    id="gradeLevel"
                                    value={newRoomGrade} 
                                    onChange={(e) => setNewRoomGrade(e.target.value)} 
                                    placeholder="e.g. Grade 7" 
                                    required 
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-confirm">Create Room</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}