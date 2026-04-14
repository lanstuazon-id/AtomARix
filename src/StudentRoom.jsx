import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './StudentRoom.css';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';

const roomColorPresets = [
    { id: 'purple', bg: 'linear-gradient(135deg, #6e45e2 0%, #8e44ad 100%)' },
    { id: 'blue', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'green', bg: 'linear-gradient(135deg, #1dd1a1 0%, #10ac84 100%)' },
    { id: 'orange', bg: 'linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%)' },
    { id: 'pink', bg: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)' },
    { id: 'teal', bg: 'linear-gradient(135deg, #00cec9 0%, #01a3a4 100%)' }
];

const taElements = [
    { sym: 'H', name: 'Hydrogen', n: 1 }, { sym: 'He', name: 'Helium', n: 2 }, { sym: 'Li', name: 'Lithium', n: 3 },
    { sym: 'Be', name: 'Beryllium', n: 4 }, { sym: 'B', name: 'Boron', n: 5 }, { sym: 'C', name: 'Carbon', n: 6 },
    { sym: 'N', name: 'Nitrogen', n: 7 }, { sym: 'O', name: 'Oxygen', n: 8 }, { sym: 'F', name: 'Fluorine', n: 9 },
    { sym: 'Ne', name: 'Neon', n: 10 }, { sym: 'Na', name: 'Sodium', n: 11 }, { sym: 'Mg', name: 'Magnesium', n: 12 },
    { sym: 'Al', name: 'Aluminium', n: 13 }, { sym: 'Si', name: 'Silicon', n: 14 }, { sym: 'P', name: 'Phosphorus', n: 15 },
    { sym: 'S', name: 'Sulfur', n: 16 }, { sym: 'Cl', name: 'Chlorine', n: 17 }, { sym: 'Ar', name: 'Argon', n: 18 },
    { sym: 'K', name: 'Potassium', n: 19 }, { sym: 'Ca', name: 'Calcium', n: 20 }, { sym: 'Fe', name: 'Iron', n: 26 },
    { sym: 'Cu', name: 'Copper', n: 29 }, { sym: 'Zn', name: 'Zinc', n: 30 }, { sym: 'Ag', name: 'Silver', n: 47 },
    { sym: 'Au', name: 'Gold', n: 79 }, { sym: 'Hg', name: 'Mercury', n: 80 }, { sym: 'Pb', name: 'Lead', n: 82 },
    { sym: 'U', name: 'Uranium', n: 92 }, { sym: 'Pt', name: 'Platinum', n: 78 }, { sym: 'Ni', name: 'Nickel', n: 28 }
];

export default function StudentRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const userName = sessionStorage.getItem('loggedInUser');

    const [room, setRoom] = useState(null);
    const [activeTab, setActiveTab] = useState('feed');
    const [posts, setPosts] = useState([]);
    const [classwork, setClasswork] = useState([]);
    const [previewAttachment, setPreviewAttachment] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [teacherAvatar, setTeacherAvatar] = useState('');

    // Quiz States
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);
    const [isReviewingQuiz, setIsReviewingQuiz] = useState(false);
    const [isLeaveRoomModalOpen, setIsLeaveRoomModalOpen] = useState(false);

    // Classroom Time Attack States
    const [activeTimeAttack, setActiveTimeAttack] = useState(null);
    const [taGameState, setTaGameState] = useState('start');
    const [taTimeLeft, setTaTimeLeft] = useState(60);
    const [taCorrect, setTaCorrect] = useState(0);
    const [taWrong, setTaWrong] = useState(0);
    const [taQuestion, setTaQuestion] = useState(null);
    const [taOptions, setTaOptions] = useState([]);

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

    // Fetch students in this room
    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "student"), where("joinedRoomId", "==", roomId));
        const unsubscribeStudents = onSnapshot(q, (snapshot) => {
            const studentList = [];
            snapshot.forEach(doc => {
                studentList.push({ id: doc.id, ...doc.data() });
            });
            setStudents(studentList);
        });
        return () => unsubscribeStudents();
    }, [roomId]);

    // Fetch teacher avatar
    useEffect(() => {
        if (room?.teacher) {
            const unsubscribe = onSnapshot(doc(db, "users", room.teacher), (docSnap) => {
                if (docSnap.exists()) {
                    setTeacherAvatar(docSnap.data().avatarUrl || '');
                }
            }, (error) => {
                console.error("Error fetching teacher avatar:", error);
            });
            return () => unsubscribe();
        }
    }, [room?.teacher]);

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
        if (previewAttachment || activeQuiz || activeTimeAttack || isLeaveRoomModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [previewAttachment, activeQuiz, activeTimeAttack, isLeaveRoomModalOpen]);

    // Timer Effect for Time Attack
    useEffect(() => {
        let timer;
        if (taGameState === 'playing' && taTimeLeft > 0) {
            timer = setInterval(() => setTaTimeLeft(prev => prev - 1), 1000);
        } else if (taTimeLeft === 0 && taGameState === 'playing') {
            setTaGameState('end');
        }
        return () => clearInterval(timer);
    }, [taGameState, taTimeLeft]);

    // Submit Time Attack Score Effect
    useEffect(() => {
        if (taGameState === 'end' && activeTimeAttack) {
            const submitTaScore = async () => {
                try {
                    const roomRef = doc(db, "teacher_rooms", roomId);
                    const updatedClasswork = classwork.map(cw => {
                        if (cw.id === activeTimeAttack.id) {
                            const existingSubmissions = cw.submissions || [];
                            const filteredSubmissions = existingSubmissions.filter(sub => sub.studentId !== userName);
                            // Only update if new score is higher
                            const oldSub = existingSubmissions.find(sub => sub.studentId === userName);
                            if (oldSub && oldSub.score >= taCorrect) return cw;

                            return {
                                ...cw,
                                submissions: [
                                    ...filteredSubmissions,
                                    {
                                        studentId: userName,
                                        studentName: sessionStorage.getItem('userFullname') || userName,
                                        score: taCorrect,
                                        wrong: taWrong,
                                        total: 60, // Represents 60 seconds
                                        timestamp: new Date().toISOString()
                                    }
                                ]
                            };
                        }
                        return cw;
                    });
                    await setDoc(roomRef, { classwork: updatedClasswork }, { merge: true });
                } catch (error) {
                    console.error("Error saving time attack result:", error);
                }
            };
            submitTaScore();
        }
    }, [taGameState, activeTimeAttack, classwork, roomId, userName, taCorrect]);

    const startTaGame = () => {
        setTaCorrect(0);
        setTaWrong(0);
        setTaTimeLeft(60);
        setTaGameState('playing');
        generateTaQuestion();
    };

    const generateTaQuestion = () => {
        const el = taElements[Math.floor(Math.random() * taElements.length)];
        
        const qTypes = [
            { text: "What is the symbol for", subject: el.name, correct: el.sym, field: 'sym' },
            { text: "Which element has the symbol", subject: el.sym, correct: el.name, field: 'name' },
            { text: "What is the atomic number of", subject: el.name, correct: el.n.toString(), field: 'n' },
            { text: "Which element has atomic number", subject: el.n.toString(), correct: el.name, field: 'name' }
        ];
        
        const qType = qTypes[Math.floor(Math.random() * qTypes.length)];
        setTaQuestion(qType);

        let newOptions = [qType.correct];
        while (newOptions.length < 4) {
            let rVal = taElements[Math.floor(Math.random() * taElements.length)][qType.field].toString();
            if (!newOptions.includes(rVal)) newOptions.push(rVal);
        }

        for (let i = newOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
        }
        setTaOptions(newOptions);
    };

    const checkTaAnswer = (selectedAns) => {
        if (selectedAns === taQuestion.correct) {
            setTaCorrect(prev => prev + 1);
        } else {
            setTaWrong(prev => prev + 1);
        }
        generateTaQuestion();
    };

    const handleConfirmLeaveRoom = async () => {
        try {
            const userRef = doc(db, "users", userName);
            await setDoc(userRef, { joinedRoomId: null }, { merge: true });
        } catch (error) {
            console.error("Error leaving room:", error);
        }
        localStorage.removeItem(`joinedRoomId_${userName}`);
        localStorage.removeItem(`joinedRoomSection_${userName}`);
        setIsLeaveRoomModalOpen(false);
        navigate('/home');
    };

    const handleQuizSubmit = async () => {
        let score = 0;
        activeQuiz.questions.forEach((q, i) => {
            if (quizAnswers[i] === q.correctOption) score++;
        });
        setQuizResult(score);

        // Save score and specific answers to the classroom activity in the cloud
        try {
            const roomRef = doc(db, "teacher_rooms", roomId);
            const updatedClasswork = classwork.map(cw => {
                if (cw.id === activeQuiz.id) {
                    const existingSubmissions = cw.submissions || [];
                    // Remove old submission if they are retaking the quiz
                    const filteredSubmissions = existingSubmissions.filter(sub => sub.studentId !== userName);
                    return {
                        ...cw,
                        submissions: [
                            ...filteredSubmissions,
                            {
                                studentId: userName,
                                studentName: sessionStorage.getItem('userFullname') || userName,
                                score: score,
                                total: activeQuiz.questions.length,
                                answers: quizAnswers,
                                timestamp: new Date().toISOString()
                            }
                        ]
                    };
                }
                return cw;
            });
            await setDoc(roomRef, { classwork: updatedClasswork }, { merge: true });
        } catch (error) {
            console.error("Error saving quiz result:", error);
        }
    };

    const renderTextWithFormatting = (text) => {
        if (!text) return null;
        const parts = text.split(/(\*\*.*?\*\*|https?:\/\/[^\s]+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                return <strong key={i} style={{ color: '#2d3436' }}>{part.slice(2, -2)}</strong>;
            }
            if (/^https?:\/\//.test(part)) {
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#4facfe', textDecoration: 'none', fontWeight: '600' }} onMouseEnter={e => e.target.style.textDecoration='underline'} onMouseLeave={e => e.target.style.textDecoration='none'}>{part}</a>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const renderFeed = () => (
        <div className="masonry-grid">
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
                        <p style={{ marginTop: '12px', color: '#2d3436', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '1.05rem', fontWeight: '500' }}>{renderTextWithFormatting(post.text)}</p>
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
        </div>
    );

    const renderActivities = () => (
        <>
            {classwork.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-book-reader"></i>
                    <p>Your teacher hasn't assigned any activities yet.</p>
                </div>
            ) : (
                <div className="masonry-grid">
                    {classwork.slice().reverse().map(cw => {
                    const icon = cw.assessmentType === 'time_attack' ? 'fa-stopwatch' : 'fa-tasks';
                    const color = cw.assessmentType === 'time_attack' ? '#f39c12' : '#e74c3c';
                    const bg = cw.assessmentType === 'time_attack' ? '#fffdf7' : '#fcf3f2';
                    const mySubmission = cw.submissions?.find(sub => sub.studentId === userName);
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
                                    <button onClick={() => { setActiveTimeAttack(cw); setTaGameState('start'); }} style={{ marginTop: '15px', background: '#f39c12', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(243, 156, 18, 0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                        <i className="fas fa-gamepad"></i> Play Time Attack
                                    </button>
                                )}
                                {cw.assessmentType === 'custom' && cw.questions && (
                                    mySubmission ? (
                                        <button onClick={() => { setActiveQuiz(cw); setQuizResult(mySubmission.score); setQuizAnswers(mySubmission.answers); setIsReviewingQuiz(false); }} style={{ marginTop: '15px', background: '#1dd1a1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(29, 209, 161, 0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                            <i className="fas fa-check-double"></i> View Results
                                        </button>
                                    ) : (
                                        <button onClick={() => { setActiveQuiz(cw); setCurrentQuestionIndex(0); setQuizAnswers({}); setQuizResult(null); setIsReviewingQuiz(false); }} style={{ marginTop: '15px', background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(231, 76, 60, 0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                            <i className="fas fa-tasks"></i> Take Custom Quiz
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    );
                    })}
                </div>
            )}
        </>
    );

    const renderMembers = () => (
        <div className="post-card">
            <div className="post-content" style={{ width: '100%' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#6e45e2', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px' }}>Teachers</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: teacherAvatar ? 'transparent' : '#f3f0ff', color: '#6e45e2', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', backgroundImage: teacherAvatar ? `url('${teacherAvatar}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        {!teacherAvatar && <i className="fas fa-user-shield"></i>}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#2d3436' }}>{room?.teacherFullName || room?.teacher}</span>
                </div>

                <h3 style={{ marginTop: '30px', marginBottom: '20px', color: '#4facfe', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px' }}>Classmates ({students.length})</h3>
                {students.length === 0 ? (
                    <p style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>No other students have joined this class yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {students.map(student => (
                            <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 15px', background: '#fdfdfd', border: '1px solid #eee', borderRadius: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: student.avatarUrl ? 'transparent' : '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', backgroundImage: student.avatarUrl ? `url('${student.avatarUrl}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                    {!student.avatarUrl && <i className="fas fa-user"></i>}
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#2d3436' }}>{student.fullname || student.username} {student.username === userName ? <span style={{ color: '#888', fontWeight: 'normal', fontSize: '0.9rem' }}>(You)</span> : ''}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
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
                    
                    /* Modern Room Dashboard Redesign */
                    .modern-room-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 35px 40px;
                        border-radius: 24px;
                        color: white;
                        margin-bottom: 20px;
                        box-shadow: 0 12px 35px rgba(0,0,0,0.1);
                        position: relative;
                        overflow: hidden;
                        flex-wrap: wrap;
                        gap: 20px;
                    }
                    .header-info {
                        position: relative;
                        z-index: 2;
                    }
                    .header-info h1 {
                        font-size: 2.8rem;
                        margin: 0 0 8px 0;
                        font-weight: 800;
                        text-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    }
                    .header-info p {
                        font-size: 1.2rem;
                        margin: 0;
                        opacity: 0.9;
                        font-weight: 500;
                    }
                    .header-actions {
                        position: relative;
                        z-index: 2;
                        display: flex;
                        align-items: center;
                    }
                    .modern-feed-container {
                        max-width: 1000px;
                        margin: 0 auto;
                        width: 100%;
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .masonry-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
                        gap: 20px;
                        align-items: start;
                        width: 100%;
                    }
                    @media (max-width: 768px) {
                        .modern-room-header { padding: 25px 20px; flex-direction: column; align-items: flex-start; }
                        .header-info h1 { font-size: 2rem; }
                        .masonry-grid { grid-template-columns: 1fr; }
                    }
                    
                    /* Time Attack Mobile Tap Fix */
                    .ta-option-btn {
                        padding: 20px;
                        font-size: 1.2rem;
                        border-radius: 12px;
                        border: 2px solid #eee;
                        background: #fdfdfd;
                        cursor: pointer;
                        transition: all 0.1s;
                        font-weight: bold;
                        color: #4facfe;
                        outline: none !important;
                        -webkit-tap-highlight-color: transparent !important;
                    }
                    @media (hover: hover) {
                        .ta-option-btn:hover { border-color: #4facfe; background: #eaf4ff; }
                    }
                    .ta-option-btn:active { transform: scale(0.95); }
                `}
            </style>
            <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }} onClick={() => navigate('/home')}>
                    <i className="fas fa-arrow-left" style={{ fontSize: '1.1rem', color: '#666', marginRight: '5px' }}></i>
                    <i className="fas fa-atom"></i>
                </div>
                <ul className="nav-links">
                    <li className={activeTab === 'feed' ? 'active' : ''} onClick={() => setActiveTab('feed')}><i className="fas fa-layer-group"></i> <span>Feed</span></li>
                    <li className={activeTab === 'activities' ? 'active' : ''} onClick={() => setActiveTab('activities')}><i className="fas fa-tasks"></i> <span>Activities</span></li>
                    <li className={activeTab === 'members' ? 'active' : ''} onClick={() => setActiveTab('members')}><i className="fas fa-users"></i> <span>Members</span></li>
                </ul>
                <div style={{ width: '130px' }}></div>
            </nav>

            <main className="room-container" style={{ position: 'relative', zIndex: 1, padding: '30px 20px 50px 20px', maxWidth: '1200px', margin: '0 auto' }}>
                <div className="modern-room-header" style={{ background: roomColorPresets.find(c => c.id === (room.colorTheme || 'purple'))?.bg }}>
                    <div className="header-info">
                        {activeTab === 'members' ? (
                            <>
                                <h1>Class Members</h1>
                                <p>View your teacher and classmates here.</p>
                            </>
                        ) : activeTab === 'activities' ? (
                            <>
                                <h1>Class Activities</h1>
                                <p>View and complete your assigned tasks.</p>
                            </>
                        ) : (
                            <>
                                <h1>{room.section}</h1>
                                <p>{room.grade}</p>
                            </>
                        )}
                    </div>
                    <div className="header-actions">
                        <button onClick={() => setIsLeaveRoomModalOpen(true)} className="btn-leave-room" style={{ background: 'rgba(255,255,255,0.9)', color: '#e74c3c', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                            <i className="fas fa-sign-out-alt"></i> Leave Room
                        </button>
                    </div>
                    <i className={`fas ${activeTab === 'members' ? 'fa-users' : activeTab === 'activities' ? 'fa-tasks' : 'fa-flask'}`} style={{ position: 'absolute', right: '-20px', bottom: '-40px', fontSize: '14rem', opacity: 0.1, transform: 'rotate(-15deg)' }}></i>
                </div>

                <div className="modern-feed-container">
                        {activeTab === 'feed' && renderFeed()}
                        {activeTab === 'activities' && renderActivities()}
                        {activeTab === 'members' && renderMembers()}
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
                        {isReviewingQuiz ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', marginBottom: '20px' }}>
                                    <h2 style={{ margin: 0, color: '#2d3436', fontSize: '1.5rem' }}>Review Mistakes</h2>
                                    <button className="close-modal" onClick={() => setActiveQuiz(null)} style={{ position: 'static' }}>&times;</button>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', textAlign: 'left' }}>
                                    {activeQuiz.questions.map((q, qIdx) => {
                                        const studentAnsIdx = quizAnswers[qIdx];
                                        const isCorrect = studentAnsIdx === q.correctOption;
                                        return (
                                            <div key={qIdx} style={{ padding: '15px', borderRadius: '12px', background: isCorrect ? '#f0fdf4' : '#fff0f0', border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`, marginBottom: '15px' }}>
                                                <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: '#333', fontSize: '1.1rem' }}>{qIdx + 1}. {q.question}</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {q.options.map((opt, oIdx) => {
                                                        let bg = '#fff'; let border = '1px solid #ddd'; let color = '#555'; let icon = null;
                                                        if (oIdx === q.correctOption) { bg = '#1dd1a1'; color = '#fff'; border = '1px solid #1dd1a1'; icon = <i className="fas fa-check" style={{ marginRight: '8px' }}></i>; }
                                                        else if (oIdx === studentAnsIdx && !isCorrect) { bg = '#e74c3c'; color = '#fff'; border = '1px solid #e74c3c'; icon = <i className="fas fa-times" style={{ marginRight: '8px' }}></i>; }
                                                        
                                                        return (
                                                            <div key={oIdx} style={{ padding: '10px 15px', borderRadius: '8px', background: bg, border: border, color: color, fontSize: '0.95rem', fontWeight: (oIdx === q.correctOption || oIdx === studentAnsIdx) ? 'bold' : 'normal' }}>
                                                                {icon} {opt}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #f0f2f5' }}>
                                    <button className="btn-cancel" onClick={() => setIsReviewingQuiz(false)}>Back to Score</button>
                                </div>
                            </>
                        ) : quizResult !== null ? (
                            <div style={{ textAlign: 'center', margin: 'auto' }}>
                                <i className="fas fa-trophy" style={{ fontSize: '5rem', color: '#f1c40f', marginBottom: '20px' }}></i>
                                <h2 style={{ color: '#2d3436', fontSize: '2rem', marginBottom: '10px' }}>Quiz Completed!</h2>
                                <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '30px' }}>You scored <strong>{quizResult}</strong> out of <strong>{activeQuiz.questions.length}</strong>.</p>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                    <button className="btn-cancel" onClick={() => setActiveQuiz(null)}>Close</button>
                                    <button className="btn-confirm" style={{ background: '#4facfe' }} onClick={() => setIsReviewingQuiz(true)}>Review Answers</button>
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
                                        onClick={handleQuizSubmit}
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

            {/* Classroom Time Attack Modal */}
            {activeTimeAttack && (
                <div className="modal-container show" style={{ zIndex: 9999, backdropFilter: 'blur(5px)' }} onClick={() => { if(taGameState !== 'playing') setActiveTimeAttack(null); }}>
                    <div className="modal-content" style={{ width: '90%', maxWidth: '600px', padding: '30px', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '16px', border: '1px solid #eee', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        {taGameState === 'start' && (
                            <>
                                <i className="fas fa-stopwatch" style={{ fontSize: '4rem', color: '#f39c12', margin: '0 auto 15px auto', display: 'block' }}></i>
                                <h2 style={{ color: '#2d3436', marginBottom: '10px' }}>{activeTimeAttack.title}</h2>
                                <p style={{ color: '#666', marginBottom: '25px' }}>You have 60 seconds to answer as many chemistry questions as you can. Your highest score will be submitted to your teacher.</p>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                    <button className="btn-cancel" onClick={() => setActiveTimeAttack(null)}>Cancel</button>
                                    <button className="btn-confirm" style={{ background: '#f39c12' }} onClick={startTaGame}>Start Challenge</button>
                                </div>
                            </>
                        )}

                        {taGameState === 'playing' && taQuestion && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e74c3c' }}>
                                        <i className="fas fa-clock"></i> {taTimeLeft}s
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1dd1a1' }}>
                                        <i className="fas fa-check-circle"></i> {taCorrect}
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '1.2rem', color: '#666', marginBottom: '10px', fontWeight: 'normal' }}>{taQuestion.text}</h3>
                                <h2 style={{ fontSize: '2.5rem', color: '#2d3436', marginBottom: '30px' }}>{taQuestion.subject}</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {taOptions.map((opt, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => checkTaAnswer(opt)}
                                            className="ta-option-btn"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {taGameState === 'end' && (
                            <>
                                <i className="fas fa-flag-checkered" style={{ fontSize: '4rem', color: '#1dd1a1', margin: '0 auto 15px auto', display: 'block' }}></i>
                                <h2 style={{ color: '#2d3436', marginBottom: '10px' }}>Time's Up!</h2>
                                <p style={{ color: '#666', fontSize: '1.2rem', marginBottom: '10px' }}>You answered</p>
                                <h1 style={{ fontSize: '3.5rem', color: '#4facfe', margin: '0 0 25px 0' }}>{taCorrect}</h1>
                                <p style={{ color: '#1dd1a1', fontWeight: 'bold', marginBottom: '25px' }}><i className="fas fa-check"></i> Score successfully submitted to your teacher.</p>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                    <button className="btn-cancel" onClick={() => { setActiveTimeAttack(null); setTaGameState('start'); }}>Close</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Leave Room Modal */}
            {isLeaveRoomModalOpen && (
                <div className="modal-container show" style={{ zIndex: 10000 }} onClick={() => setIsLeaveRoomModalOpen(false)}>
                    <div className="modal-content" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <i className="fas fa-sign-out-alt modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Leave Class</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to leave this class? You will need the class code to join again.</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setIsLeaveRoomModalOpen(false)}>Cancel</button>
                            <button className="btn-confirm" onClick={handleConfirmLeaveRoom} style={{ backgroundColor: '#e74c3c' }}>Leave</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}