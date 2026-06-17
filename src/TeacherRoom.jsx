import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TeacherRoom.css';
import { doc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
    const [activeTab, setActiveTab] = useState('feed');
    const [posts, setPosts] = useState([]);
    const [classwork, setClasswork] = useState([]);
    const [students, setStudents] = useState([]);
    const [teacherAvatar, setTeacherAvatar] = useState('');
    const [studentSearch, setStudentSearch] = useState('');

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
    const [cwTimeLimit, setCwTimeLimit] = useState('');
    const [cwDeadline, setCwDeadline] = useState('');
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
    const [isDeleteCwModalOpen, setIsDeleteCwModalOpen] = useState(false);
    const [selectedCw, setSelectedCw] = useState(null);
    const [editPostContent, setEditPostContent] = useState('');
    const [editPostType, setEditPostType] = useState('Announcement');
    
    // Report States
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedReportCw, setSelectedReportCw] = useState(null);
    const [expandedStudentId, setExpandedStudentId] = useState(null);

    // Student Management States
    const [isRemoveStudentModalOpen, setIsRemoveStudentModalOpen] = useState(false);
    const [studentToRemove, setStudentToRemove] = useState(null);

    // Format & Link States
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkInput, setLinkInput] = useState('');
    const [linkTarget, setLinkTarget] = useState(null);

    // Quiz Builder State
    const [quizQuestions, setQuizQuestions] = useState([{ id: Date.now().toString(), question: '', options: ['', '', '', ''], correctOption: 0 }]);
    const [isRemoveQuestionModalOpen, setIsRemoveQuestionModalOpen] = useState(false);
    const [questionToRemoveIndex, setQuestionToRemoveIndex] = useState(null);

    // AI Quiz Generator States
    const [aiPdfFile, setAiPdfFile] = useState(null);
    const [aiLessonText, setAiLessonText] = useState('');
    const [aiQuestionCount, setAiQuestionCount] = useState(5);
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiGenerated, setAiGenerated] = useState(false);
    const [isAiErrorModalOpen, setIsAiErrorModalOpen] = useState(false);

    const addQuestion = () => {
        setQuizQuestions(prev => [...prev, { id: Date.now().toString() + Math.random(), question: '', options: ['', '', '', ''], correctOption: 0 }]);
    };

    const removeQuestion = (index) => {
        setQuestionToRemoveIndex(index);
        setIsRemoveQuestionModalOpen(true);
    };

    const confirmRemoveQuestion = () => {
        if (questionToRemoveIndex !== null) {
            setQuizQuestions(prev => prev.filter((_, i) => i !== questionToRemoveIndex));
            setIsRemoveQuestionModalOpen(false);
            setQuestionToRemoveIndex(null);
        }
    };

    const handleQuestionChange = (index, field, value) => {
        setQuizQuestions(prev => {
            const newQuestions = [...prev];
            newQuestions[index] = { ...newQuestions[index], [field]: value };
            return newQuestions;
        });
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        setQuizQuestions(prev => {
            const newQuestions = [...prev];
            const newOptions = [...newQuestions[qIndex].options];
            newOptions[oIndex] = value;
            newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
            return newQuestions;
        });
    };

    // ── AI Quiz Generator ──
    const handleGenerateAiQuiz = async () => {
        setIsAiGenerating(true);
        setAiError('');

        try {
            const app = getApp();
            const functions = getFunctions(app);
            const generateQuiz = httpsCallable(functions, 'generateQuiz');

            let lessonContent = aiLessonText.trim();

            // Step 1: If PDF uploaded, extract its text first via Claude
            if (aiPdfFile) {
                const base64Data = await new Promise((res, rej) => {
                    const r = new FileReader();
                    r.onload = () => res(r.result.split(',')[1]);
                    r.onerror = () => rej(new Error('Failed to read PDF file.'));
                    r.readAsDataURL(aiPdfFile);
                });

                const extractResult = await generateQuiz({
                    payload: {
                        model: 'claude-sonnet-4-6',
                        max_tokens: 1000,
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
                                { type: 'text', text: 'Extract and summarize all key concepts, facts, definitions, and important information from this document. Be thorough and comprehensive.' }
                            ]
                        }]
                    }
                });

                lessonContent = extractResult.data?.content?.map(b => b.text || '').join('') || '';
                if (!lessonContent) throw new Error('Could not extract text from PDF. Try pasting the text instead.');
            }

            if (!lessonContent) throw new Error('No content to generate from. Upload a PDF or paste your lesson text.');

            // Step 2: Validate if content is chemistry-related
            const validateResult = await generateQuiz({
                payload: {
                    model: 'claude-sonnet-4-6',
                    max_tokens: 100,
                    messages: [{
                        role: 'user',
                        content: `You are a subject matter validator. Read the following content and determine if it is related to chemistry (e.g., elements, compounds, reactions, periodic table, atoms, molecules, acids, bases, lab procedures, chemical formulas, chemical bonding, stoichiometry, thermochemistry, etc.).

Respond with ONLY one word: YES or NO.

CONTENT:
${lessonContent}`
                    }]
                }
            });

            const validationAnswer = validateResult.data?.content?.map(b => b.text || '').join('').trim().toUpperCase();
            if (!validationAnswer.includes('YES')) {
                throw new Error('The uploaded material does not appear to be related to chemistry. Please upload a chemistry lesson or module only.');
            }

            // Step 3: Generate quiz questions
            const prompt = `You are a professional quiz generator for a Grade 7-8 chemistry classroom. Based on the lesson content below, generate exactly ${aiQuestionCount} multiple-choice questions.

LESSON CONTENT:
${lessonContent}

STRICT OUTPUT RULES:
- Respond with ONLY a valid JSON array. No markdown, no backticks, no preamble, no extra text whatsoever.
- Each item must have exactly these fields: "question" (string), "options" (array of exactly 4 strings), "correctOption" (integer 0-3)
- Questions must be appropriate for Grade 7-8 students (ages 12-14).
- Use simple, clear language that is easy to understand.
- Avoid overly technical jargon unless it is part of the lesson.
- Vary difficulty from easy to moderate — avoid very hard questions.
- All 4 options must be plausible and relevant.

Example format:
[{"question":"What is the chemical formula for water?","options":["H2O2","H2O","HO","H3O"],"correctOption":1}]`;
            const quizResult = await generateQuiz({
                payload: {
                    model: 'claude-sonnet-4-6',
                    max_tokens: 1000,
                    messages: [{ role: 'user', content: prompt }]
                }
            });

            const raw = quizResult.data?.content?.map(b => b.text || '').join('').trim() || '';
            const clean = raw.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(clean);

            if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('AI returned an unexpected format. Please try again.');

            setQuizQuestions(parsed.map((q, i) => ({
                id: Date.now().toString() + i,
                question: q.question,
                options: q.options,
                correctOption: q.correctOption
            })));
            setAiGenerated(true);

        } catch (err) {
            console.error('AI Quiz generation error:', err);
            setAiError(err.message || 'Something went wrong. Please try again.');
            setIsAiErrorModalOpen(true);
        } finally {
            setIsAiGenerating(false);
        }
    };

    const resetAiState = () => {
        setAiPdfFile(null);
        setAiLessonText('');
        setAiError('');
        setAiGenerated(false);
        setQuizQuestions([{ id: Date.now().toString(), question: '', options: ['', '', '', ''], correctOption: 0 }]);
    };

    useEffect(() => {
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

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "student"), where("joinedRoomId", "==", roomId));
        const unsubscribeStudents = onSnapshot(q, (snapshot) => {
            const studentList = [];
            snapshot.forEach(doc => { studentList.push({ id: doc.id, ...doc.data() }); });
            setStudents(studentList);
        });
        return () => unsubscribeStudents();
    }, [roomId]);

    useEffect(() => {
        if (room?.teacher) {
            const unsubscribe = onSnapshot(doc(db, "users", room.teacher), (docSnap) => {
                if (docSnap.exists()) setTeacherAvatar(docSnap.data().avatarUrl || '');
            }, (error) => { console.error("Error fetching teacher avatar:", error); });
            return () => unsubscribe();
        }
    }, [room?.teacher]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (!event.target.closest('.post-menu-container')) setActivePostMenu(null);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (previewAttachment) setIsPreviewLoading(!previewAttachment.type.includes('pdf'));
    }, [previewAttachment]);

    useEffect(() => {
        const anyOpen = isPostModalOpen || isCwModalOpen || isEditPostModalOpen || isDeletePostModalOpen || isDeleteCwModalOpen || isReportModalOpen || isRemoveStudentModalOpen || previewAttachment || isLinkModalOpen || isRemoveQuestionModalOpen || isAiErrorModalOpen;
        document.body.style.overflow = anyOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isPostModalOpen, isCwModalOpen, isEditPostModalOpen, isDeletePostModalOpen, isDeleteCwModalOpen, isReportModalOpen, isRemoveStudentModalOpen, previewAttachment, isLinkModalOpen, isRemoveQuestionModalOpen, isAiErrorModalOpen]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) { alert('Invalid file type! Only Images and PDFs are allowed.'); return; }
        if (file.size > 10 * 1024 * 1024) { alert('File is too large! Maximum size is 10MB.'); return; }
        setAttachment(file);
        e.target.value = '';
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
            if (attachment) {
                const formData = new FormData();
                formData.append('file', attachment);
                formData.append('upload_preset', 'atomarix_uploads');
                const cloudinaryUrl = `https://api.cloudinary.com/v1_1/dht7nou2f/auto/upload`;
                const response = await fetch(cloudinaryUrl, { method: 'POST', body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || 'Cloudinary upload failed');
                attachmentData = { name: attachment.name, url: data.secure_url, type: attachment.type };
            }
            const newPost = { id: Date.now(), type: postType, text: postContent, attachment: attachmentData, author: room.teacherFullName || room.teacher, timestamp: new Date().toISOString() };
            await updateDoc(doc(db, "teacher_rooms", roomId), { posts: [...posts, newPost] });
            setPostContent(''); setPostType('Announcement'); setAttachment(null); setIsPostModalOpen(false);
        } catch (error) {
            console.error("Error creating post: ", error);
            alert("Failed to create post. Please try again.");
        } finally { setIsUploading(false); }
    };

    const handleEditPostSubmit = async (e) => {
        e.preventDefault();
        if (!editPostContent.trim()) return alert('Announcement cannot be empty!');
        const updatedPosts = posts.map(p => p.id === selectedPost.id ? { ...p, text: editPostContent, type: editPostType } : p);
        try {
            await updateDoc(doc(db, "teacher_rooms", roomId), { posts: updatedPosts });
            setIsEditPostModalOpen(false); setSelectedPost(null);
        } catch (error) { console.error("Error updating post: ", error); alert("Failed to update announcement."); }
    };

    const handleConfirmDeletePost = async () => {
        if (!selectedPost) return;
        try {
            await updateDoc(doc(db, "teacher_rooms", roomId), { posts: posts.filter(p => p.id !== selectedPost.id) });
            setIsDeletePostModalOpen(false); setSelectedPost(null);
        } catch (error) { console.error("Error deleting post: ", error); alert("Failed to delete announcement."); }
    };

    const handleCreateClasswork = async (e) => {
        e.preventDefault();
        if (!cwTitle.trim()) return alert('Title is required!');
        if (cwDeadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selected = new Date(cwDeadline);
            if (selected < today) return alert('Deadline cannot be a past date. Please select today or a future date.');
        }
        if (assessmentType === 'custom') {
            for (let i = 0; i < quizQuestions.length; i++) {
                if (!quizQuestions[i].question.trim()) return alert(`Question ${i + 1} cannot be empty.`);
                if (quizQuestions[i].options.some(opt => !opt.trim())) return alert(`All options for Question ${i + 1} must be filled.`);
            }
        }
        setIsUploading(true);
        try {
            const newClasswork = { id: Date.now(), type: 'assessment', assessmentType, title: cwTitle, desc: cwDesc, attachment: null, questions: assessmentType === 'custom' ? quizQuestions : null, timestamp: new Date().toISOString(), timeLimit: cwTimeLimit ? parseInt(cwTimeLimit) : null, deadline: cwDeadline || null };
            await updateDoc(doc(db, "teacher_rooms", roomId), { classwork: [...classwork, newClasswork] });
            setCwTitle(''); setCwDesc(''); setAttachment(null); setAssessmentType('custom'); setCwTimeLimit(''); setCwDeadline('');
            resetAiState(); setIsCwModalOpen(false);
        } catch (error) { console.error("Error creating classwork: ", error); alert("Failed to create classwork. Please try again.");
        } finally { setIsUploading(false); }
    };

    const handleConfirmDeleteClasswork = async () => {
        if (!selectedCw) return;
        try {
            await updateDoc(doc(db, "teacher_rooms", roomId), { classwork: classwork.filter(cw => cw.id !== selectedCw.id) });
            setIsDeleteCwModalOpen(false); setSelectedCw(null);
        } catch (error) { console.error("Error deleting classwork: ", error); alert("Failed to delete activity. Please try again."); }
    };

    const promptRemoveStudent = (studentId, studentName) => { setStudentToRemove({ id: studentId, name: studentName }); setIsRemoveStudentModalOpen(true); };

    const handleConfirmRemoveStudent = async () => {
        if (!studentToRemove) return;
        try {
            await updateDoc(doc(db, "users", studentToRemove.id), { joinedRoomId: null });
            setIsRemoveStudentModalOpen(false); setStudentToRemove(null);
        } catch (error) { console.error("Error removing student:", error); alert("Failed to remove student. Please try again."); }
    };

    const renderTextWithFormatting = (text) => {
        if (!text) return null;
        const parts = text.split(/(\*\*.*?\*\*|https?:\/\/[^\s]+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4)
                return <strong key={i} style={{ color: '#2d3436' }}>{part.slice(2, -2)}</strong>;
            if (/^https?:\/\//.test(part))
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#4facfe', textDecoration: 'none', fontWeight: '600' }} onMouseEnter={e => e.target.style.textDecoration='underline'} onMouseLeave={e => e.target.style.textDecoration='none'}>{part}</a>;
            return <span key={i}>{part}</span>;
        });
    };

    const renderFeed = () => (
        <>
            <div className="modern-create-post" onClick={() => setIsPostModalOpen(true)}>
                <div className="modern-create-left">
                    <div className="avatar-gradient"><i className="fas fa-pen"></i></div>
                    <span className="placeholder-text">What would you like to share with your class?</span>
                </div>
                <div className="modern-create-actions">
                    <div className="action-icon announce" title="Announcement"><i className="fas fa-comment-dots"></i></div>
                    <div className="action-icon module" title="Module"><i className="fas fa-book"></i></div>
                    <div className="action-icon attach" title="Attachment"><i className="fas fa-paperclip"></i></div>
                </div>
            </div>
            <div className="masonry-grid">
                {posts.slice().reverse().map(post => {
                    const pType = post.type || 'Announcement';
                    const pIcon = pType === 'Module' ? 'fa-book' : 'fa-comment-dots';
                    const pColor = pType === 'Module' ? '#4facfe' : '#10ac84';
                    const pBg = pType === 'Module' ? '#eaf4ff' : '#e3fdf5';
                    return (
                        <div key={post.id} className="post-card" style={{ position: 'relative', zIndex: activePostMenu === post.id ? 50 : 1 }}>
                            <div className="post-icon" style={{ background: pBg, color: pColor }}><i className={`fas ${pIcon}`}></i></div>
                            <div className="post-content">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h4>{pType}</h4>
                                    <div className="menu-container post-menu-container">
                                        <button className="btn-menu" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActivePostMenu(activePostMenu === post.id ? null : post.id); }}><i className="fas fa-ellipsis-v"></i></button>
                                        {activePostMenu === post.id && (
                                            <div className="dropdown-menu show" style={{ right: 0, top: '35px', width: '130px' }} onClick={e => { e.stopPropagation(); e.preventDefault(); }}>
                                                <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedPost(post); setEditPostContent(post.text); setEditPostType(post.type || 'Announcement'); setIsEditPostModalOpen(true); setActivePostMenu(null); }}><i className="fas fa-edit" style={{ color: '#6e45e2', width: '20px' }}></i> Edit</div>
                                                <div className="dropdown-item danger" onClick={(e) => { e.stopPropagation(); setSelectedPost(post); setIsDeletePostModalOpen(true); setActivePostMenu(null); }}><i className="fas fa-trash" style={{ width: '20px' }}></i> Delete</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span>Posted by {post.author} • {new Date(post.timestamp).toLocaleString()}</span>
                                <p style={{ marginTop: '12px', color: '#2d3436', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '1.05rem', fontWeight: '500' }}>{renderTextWithFormatting(post.text)}</p>
                                {post.attachment && (
                                    <div style={{ marginTop: '15px', padding: '10px 15px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setPreviewAttachment(post.attachment)}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}><i className={`fas ${post.attachment.type.startsWith('image/') ? 'fa-image' : post.attachment.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-word'}`}></i></div>
                                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                            <span style={{ color: '#2d3436', fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '300px' }}>{post.attachment.name}</span>
                                            <span style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>{post.attachment.type.startsWith('image/') ? 'Image' : post.attachment.type.includes('pdf') ? 'PDF Document' : 'Word Document'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );

    const formatDeadline = (deadline) => {
        const due = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPast = due < today;
        return {
            isPast,
            label: isPast ? 'Closed' : 'Due',
            icon: isPast ? 'fa-lock' : 'fa-calendar-alt',
            date: due.toLocaleDateString([], { month: 'short', day: 'numeric' })
        };
    };

    const renderActivities = () => (
        <div className="masonry-grid">
            {classwork.slice().reverse().map(cw => {
                const icon = cw.assessmentType === 'time_attack' ? 'fa-stopwatch' : 'fa-tasks';
                const color = cw.assessmentType === 'time_attack' ? '#f39c12' : '#e74c3c';
                const bg = cw.assessmentType === 'time_attack' ? '#fffdf7' : '#fcf3f2';
                const deadlineInfo = cw.deadline ? formatDeadline(cw.deadline) : null;
                return (
                    <div key={cw.id} className="post-card">
                        <div className="post-icon" style={{ background: bg, color: color }}><i className={`fas ${icon}`}></i></div>
                        <div className="post-content activity-content">
                            <div className="activity-header">
                                <div className="activity-title-row">
                                    <h4>{cw.title}</h4>
                                    {cw.assessmentType === 'time_attack' && <span className="activity-badge badge-time-attack"><i className="fas fa-stopwatch"></i> Time Attack</span>}
                                    {cw.assessmentType === 'custom' && cw.questions && <span className="activity-badge badge-generated-quiz"><i className="fas fa-tasks"></i> Generated Quiz</span>}
                                </div>
                                <div className="activity-actions">
                                    <button onClick={() => { setSelectedReportCw(cw); setExpandedStudentId(null); setIsReportModalOpen(true); }} className="report-btn" title="View Submissions"><i className="fas fa-chart-bar"></i> Report</button>
                                    <button onClick={() => { setSelectedCw(cw); setIsDeleteCwModalOpen(true); }} className="delete-icon-btn" title="Delete Activity"><i className="fas fa-trash"></i></button>
                                </div>
                            </div>
                            {(cw.timeLimit || cw.deadline) && (
                                <div className="schedule-badges">
                                    {cw.timeLimit && <span className="schedule-badge badge-time-limit"><i className="fas fa-hourglass-half"></i> {cw.timeLimit} min limit</span>}
                                    {deadlineInfo && <span className={`schedule-badge badge-deadline ${deadlineInfo.isPast ? 'is-past' : ''}`}><i className={`fas ${deadlineInfo.icon}`}></i> {deadlineInfo.label} {deadlineInfo.date}</span>}
                                </div>
                            )}
                            <span className="activity-posted-by">Posted by {room.teacherFullName || room.teacher} • {new Date(cw.timestamp).toLocaleString()}</span>
                            <p>{cw.desc}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderMembers = () => {
        const filteredStudents = students.filter(s => (s.fullname || s.username).toLowerCase().includes(studentSearch.toLowerCase()));
        return (
            <div className="post-card">
                <div className="post-content" style={{ width: '100%' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#6e45e2', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px' }}>Teachers</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: teacherAvatar ? 'transparent' : '#f3f0ff', color: '#6e45e2', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', backgroundImage: teacherAvatar ? `url('${teacherAvatar}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                            {!teacherAvatar && <i className="fas fa-user-shield"></i>}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#2d3436' }}>{room?.teacherFullName || room?.teacher}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '20px', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                        <h3 style={{ margin: 0, color: '#4facfe' }}>Students ({students.length})</h3>
                        {students.length > 0 && (
                            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }}></i>
                                <input type="text" placeholder="Search students..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 35px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }} />
                            </div>
                        )}
                    </div>
                    {students.length === 0 ? (<p style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>Student list will appear here once they join the class.</p>)
                    : filteredStudents.length === 0 ? (<p style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>No students found matching your search.</p>)
                    : (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {filteredStudents.map(student => (
                                <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', background: '#fdfdfd', border: '1px solid #eee', borderRadius: '12px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#d7ccff'} onMouseLeave={e => e.currentTarget.style.borderColor = '#eee'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: student.avatarUrl ? 'transparent' : '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', backgroundImage: student.avatarUrl ? `url('${student.avatarUrl}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                            {!student.avatarUrl && <i className="fas fa-user"></i>}
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#2d3436' }}>{student.fullname || student.username}</span>
                                    </div>
                                    <button onClick={(e) => { e.preventDefault(); promptRemoveStudent(student.id, student.fullname || student.username); }} style={{ background: '#fff0f0', border: 'none', color: '#e74c3c', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', fontSize: '1rem' }} title="Remove Student" onMouseEnter={e => { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff0f0'; e.currentTarget.style.color = '#e74c3c'; }}>
                                        <i className="fas fa-user-minus"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!room) return (
        <div style={{ background: '#f8faff', minHeight: '100vh' }}>
            <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }} onClick={() => navigate('/dashboard')}><i className="fas fa-arrow-left" style={{ fontSize: '1.1rem', color: '#666', marginRight: '5px' }}></i><i className="fas fa-atom"></i></div>
                <div></div><div style={{ width: '130px' }}></div>
            </nav>
            <main className="room-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '3rem', color: '#6e45e2', marginBottom: '20px' }}></i>
                <h2 style={{ color: '#2d3436' }}>Entering Classroom...</h2>
                <p style={{ color: '#666' }}>Fetching data from the cloud</p>
            </main>
        </div>
    );

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
            <div className="floating-background">
                {floatingItems.map(item => (
                    <div key={item.id} className="floating-item" style={{ left: item.left, animationDuration: item.animDuration, animationDelay: item.delay, fontSize: item.size, fontWeight: item.fontWeight || 'normal' }}>
                        {item.icon ? <i className={item.icon}></i> : item.text}
                    </div>
                ))}
            </div>
            <style>{`
                .floating-background{position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:0;overflow:hidden}
                .floating-item{position:absolute;color:#6e45e2;opacity:.08;bottom:-100px;animation:float-up infinite linear}
                @keyframes float-up{0%{transform:translateY(0) rotate(0deg)}100%{transform:translateY(-120vh) rotate(360deg)}}
                .modern-room-header{display:flex;justify-content:space-between;align-items:center;padding:35px 40px;border-radius:24px;color:white;margin-bottom:20px;box-shadow:0 12px 35px rgba(0,0,0,.1);position:relative;overflow:hidden;flex-wrap:wrap;gap:20px}
                .header-info{position:relative;z-index:2}
                .header-info h1{font-size:2.8rem;margin:0 0 8px 0;font-weight:800;text-shadow:0 2px 10px rgba(0,0,0,.2)}
                .header-info p{font-size:1.2rem;margin:0;opacity:.9;font-weight:500}
                .header-actions{position:relative;z-index:2;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:20px 30px;border-radius:16px;border:1px solid rgba(255,255,255,.3);display:flex;flex-direction:column;align-items:center;min-width:240px}
                .modern-feed-container{max-width:1000px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:20px}
                .masonry-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:20px;align-items:start;width:100%}
                @media(max-width:768px){.modern-room-header{padding:25px 20px;flex-direction:column;align-items:flex-start}.header-actions{width:100%;min-width:unset}.header-info h1{font-size:2rem}.masonry-grid{grid-template-columns:1fr}}
                .btn-menu{background:transparent;border:none;color:#666;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;justify-content:center;align-items:center;transition:transform .25s cubic-bezier(.34,1.56,.64,1),color .2s,background .2s}
                .btn-menu:hover{background:rgba(0,0,0,.05);color:#2d3436;transform:scale(1.15)}
                .btn-menu:active{transform:scale(.85)}
                .dropdown-menu.show{animation:dropdownPop .25s cubic-bezier(.34,1.56,.64,1) forwards;transform-origin:top right}
                @keyframes dropdownPop{0%{opacity:0;transform:scale(.8) translateY(-10px)}100%{opacity:1;transform:scale(1) translateY(0)}}
                .modern-create-post{background:#fff;border-radius:16px;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,.03);border:1px solid #eee;transition:all .3s cubic-bezier(.25,.8,.25,1);margin-bottom:20px}
                .modern-create-post:hover{box-shadow:0 8px 25px rgba(110,69,226,.12);border-color:#d7ccff;transform:translateY(-2px)}
                .modern-create-left{display:flex;align-items:center;gap:15px}
                .avatar-gradient{width:45px;height:45px;border-radius:12px;background:linear-gradient(135deg,#6e45e2 0%,#4facfe 100%);color:white;display:flex;justify-content:center;align-items:center;font-size:1.2rem;box-shadow:0 4px 10px rgba(110,69,226,.2)}
                .placeholder-text{color:#7f8fa6;font-size:1.05rem;font-weight:500}
                .modern-create-actions{display:flex;gap:10px}
                .action-icon{width:40px;height:40px;border-radius:50%;background:#f8faff;color:#a4b0be;display:flex;justify-content:center;align-items:center;font-size:1.1rem;transition:all .2s}
                .modern-create-post:hover .action-icon.announce{background:#e3fdf5;color:#10ac84}
                .modern-create-post:hover .action-icon.module{background:#eaf4ff;color:#4facfe}
                .modern-create-post:hover .action-icon.attach{background:#f3f0ff;color:#6e45e2}
                @media(max-width:768px){.modern-create-actions{display:none}.modern-create-post{padding:12px 15px}.placeholder-text{font-size:.95rem}.avatar-gradient{width:38px;height:38px;font-size:1rem}}
                .ai-upload-zone{border:2px dashed #d7ccff;border-radius:16px;padding:30px 24px;text-align:center;background:linear-gradient(135deg,#faf8ff 0%,#f0f8ff 100%);transition:all .3s ease;margin-bottom:15px}
                .ai-upload-zone:hover{border-color:#6e45e2;background:linear-gradient(135deg,#f3f0ff 0%,#eaf4ff 100%)}
                .ai-generate-btn{padding:13px 32px;background:linear-gradient(135deg,#6e45e2 0%,#e74c3c 100%);color:white;border:none;border-radius:12px;font-weight:700;font-size:1rem;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:all .3s ease;box-shadow:0 4px 15px rgba(110,69,226,.3)}
                .ai-generate-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 25px rgba(110,69,226,.4)}
                .ai-generate-btn:disabled{background:#ccc;cursor:not-allowed;box-shadow:none}
                .ai-question-card{background:#fdfdfd;padding:18px;border-radius:12px;border:1px solid #e1e1e1;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.03);transition:border-color .2s}
                .ai-question-card:hover{border-color:#d7ccff}
                @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
                .ai-generating-pulse{background:linear-gradient(90deg,#f0f2f5 25%,#e8eaf0 50%,#f0f2f5 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px;height:20px;margin-bottom:8px}

                /* Create Assessment Enhanced Layout */
                .cw-modal-container {
                    display: flex;
                    gap: 30px;
                    align-items: flex-start;
                }
                .cw-modal-left {
                    flex: 0 0 360px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .cw-modal-right {
                    flex: 1;
                    border-left: 1px solid #eee;
                    padding-left: 30px;
                    /* min-height: 400px; - Removed to allow flex to control height */
                }
                @media (max-width: 950px) {
                    .cw-modal-container { flex-direction: column; }
                    .cw-modal-left { flex: none; width: 100%; }
                    .cw-modal-right { border-left: none; padding-left: 0; width: 100%; min-height: unset; }
                }
            `}</style>

            <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }} onClick={() => navigate('/dashboard')}><i className="fas fa-arrow-left" style={{ fontSize: '1.1rem', color: '#666', marginRight: '5px' }}></i><i className="fas fa-atom"></i></div>
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
                        {activeTab === 'members' ? (<><h1>Class Members</h1><p>View who students are in this class here.</p></>) : activeTab === 'activities' ? (<><h1>Class Activities</h1><p>Assign a quiz or create a new activity here.</p></>) : (<><h1>{room.section}</h1><p>{room.grade}</p></>)}
                    </div>
                    {activeTab === 'feed' && (
                        <div className="header-actions">
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', opacity: 0.9 }}>Class Code</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <p style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, letterSpacing: '3px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{room.classCode || roomId.substring(roomId.length - 6).toUpperCase()}</p>
                                <button onClick={handleCopyCode} style={{ background: isCopied ? '#1dd1a1' : 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', width: '45px', height: '45px', borderRadius: '12px', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Copy Class Code"><i className={isCopied ? "fas fa-check" : "far fa-copy"}></i></button>
                            </div>
                        </div>
                    )}
                    <i className={`fas ${activeTab === 'members' ? 'fa-users' : activeTab === 'activities' ? 'fa-tasks' : 'fa-flask'}`} style={{ position: 'absolute', right: '-20px', bottom: '-40px', fontSize: '14rem', opacity: 0.1, transform: 'rotate(-15deg)' }}></i>
                </div>

                <div className="modern-feed-container">
                    {activeTab === 'activities' && (
                        <div className="classwork-summary-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #eee', marginBottom: '10px', flexWrap: 'wrap', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: '#fcf3f2', color: '#e74c3c', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}><i className="fas fa-tasks"></i></div>
                                    <div><p style={{ margin: 0, color: '#888', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Generated Quizzes</p><p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#2d3436' }}>{classwork.filter(cw => cw.assessmentType === 'custom').length}</p></div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: '#fffdf7', color: '#f39c12', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}><i className="fas fa-stopwatch"></i></div>
                                    <div><p style={{ margin: 0, color: '#888', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Time Attacks</p><p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#2d3436' }}>{classwork.filter(cw => cw.assessmentType === 'time_attack').length}</p></div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '2px solid #f0f2f5', paddingLeft: '30px' }}>
                                    <div><p style={{ margin: 0, color: '#888', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Total Activities</p><p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#6e45e2' }}>{classwork.length}</p></div>
                                </div>
                            </div>
                            <button className="btn-primary" onClick={() => setIsCwModalOpen(true)} style={{ borderRadius: '12px' }}><i className="fas fa-plus"></i> Create</button>
                        </div>
                    )}
                    {activeTab === 'feed' && renderFeed()}
                    {activeTab === 'activities' && renderActivities()}
                    {activeTab === 'members' && renderMembers()}
                </div>
            </main>

            {/* ── Create Post Modal ── */}
            {isPostModalOpen && (
                <div className="modal-container show" onClick={() => setIsPostModalOpen(false)}>
                    <div className="modal-content announce-modal" onClick={e => e.stopPropagation()}>
                        <div className="announce-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 style={{ margin: 0 }}>Create</h2>
                                <div style={{ display: 'flex', gap: '5px', background: '#f0f2f5', padding: '4px', borderRadius: '10px' }}>
                                    <button type="button" onClick={() => setPostType('Announcement')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: postType === 'Announcement' ? 'white' : 'transparent', color: postType === 'Announcement' ? '#10ac84' : '#666', fontWeight: '600', cursor: 'pointer', boxShadow: postType === 'Announcement' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-comment-dots"></i> Announcement</button>
                                    <button type="button" onClick={() => setPostType('Module')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: postType === 'Module' ? 'white' : 'transparent', color: postType === 'Module' ? '#4facfe' : '#666', fontWeight: '600', cursor: 'pointer', boxShadow: postType === 'Module' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-book"></i> Module</button>
                                </div>
                            </div>
                            <button className="close-modal" onClick={() => setIsPostModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreatePost}>
                            <input type="file" accept="image/*,application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                            <div className="announce-input-area" style={{ flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                                    <div className="avatar"><i className="fas fa-user"></i></div>
                                    <textarea value={postContent} onChange={e => setPostContent(e.target.value)} rows="4" placeholder="Share something with your class..." className="modern-textarea" autoFocus></textarea>
                                </div>
                                {attachment && (
                                    <div style={{ marginLeft: '60px', padding: '10px 15px', background: '#f8f9fa', border: '1px solid #e1e1e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 'calc(100% - 60px)', boxSizing: 'border-box' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#333', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><i className={`fas ${attachment.type.startsWith('image/') ? 'fa-image' : attachment.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-word'}`} style={{ color: '#6e45e2', fontSize: '1.2rem' }}></i>{attachment.name}</span>
                                        <button type="button" onClick={() => setAttachment(null)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.1rem' }}><i className="fas fa-times"></i></button>
                                    </div>
                                )}
                            </div>
                            <div className="announce-toolbar">
                                <div className="toolbar-icons">
                                    <button type="button" title="Attach file" onClick={() => fileInputRef.current?.click()} disabled={isUploading}><i className="fas fa-paperclip"></i></button>
                                    <button type="button" title="Add link" onClick={() => { setLinkTarget('create'); setLinkInput(''); setIsLinkModalOpen(true); }}><i className="fas fa-link"></i></button>
                                </div>
                                <div className="modal-actions" style={{ marginTop: 0 }}>
                                    <button type="button" className="btn-cancel" onClick={() => setIsPostModalOpen(false)}>Cancel</button>
                                    <button type="submit" className={`btn-confirm ${(!postContent.trim() && !attachment) || isUploading ? 'disabled' : ''}`} disabled={(!postContent.trim() && !attachment) || isUploading}>{isUploading ? 'Posting...' : 'Post'}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Create Classwork Modal ── */}
            {isCwModalOpen && (
                <div className="modal-container show" onClick={() => { setIsCwModalOpen(false); resetAiState(); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '98vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                        <form onSubmit={handleCreateClasswork} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                            <div style={{ padding: '20px 30px', borderBottom: '1px solid #eee', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ margin: 0 }}>Create Assessment</h2>
                                <button type="button" className="close-modal" onClick={() => { setIsCwModalOpen(false); resetAiState(); }} style={{ position: 'static', fontSize: '2rem', padding: '0 5px' }}>&times;</button>
                            </div>
                            
                            <div style={{ flex: 1, display: 'flex', padding: '30px', minHeight: 0, overflowY: 'auto' }}>
                                <div className="cw-modal-container" style={{ maxWidth: '1100px', margin: '0 auto', flex: 1 }}>
                                    {/* Left Column: Metadata and Selection */}
                                    <div className="cw-modal-left" style={{ overflowY: 'auto', minHeight: 0 }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: '#888', textTransform: 'uppercase' }}>1. Basic Information</label>
                                            <div className="input-group" style={{ marginBottom: '12px' }}><input type="text" value={cwTitle} onChange={e => setCwTitle(e.target.value)} placeholder="Assessment Title (e.g., Chapter 1 Quiz)" required /></div>
                                            <div className="input-group"><textarea value={cwDesc} onChange={e => setCwDesc(e.target.value)} rows="3" placeholder="Instructions (Optional)"></textarea></div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: '#888', textTransform: 'uppercase' }}>2. Assessment Type</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div onClick={() => { setAssessmentType('time_attack'); setCwTitle(''); setCwDesc(''); setAttachment(null); resetAiState(); }} style={{ padding: '15px', border: assessmentType === 'time_attack' ? '2px solid #f39c12' : '1px solid #eee', borderRadius: '12px', cursor: 'pointer', background: assessmentType === 'time_attack' ? '#fffdf7' : '#fff', transition: 'all 0.2s' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                                        <i className="fas fa-stopwatch" style={{ fontSize: '1.2rem', color: '#f39c12' }}></i>
                                                        <h3 style={{ color: '#2d3436', margin: 0, fontSize: '1rem' }}>Time Attack</h3>
                                                    </div>
                                                    <p style={{ color: '#666', fontSize: '0.8rem', margin: 0, lineHeight: '1.4' }}>Fast-paced chemistry quiz game.</p>
                                                </div>
                                                <div onClick={() => { setAssessmentType('custom'); setCwTitle(''); setCwDesc(''); }} style={{ padding: '15px', border: assessmentType === 'custom' ? '2px solid #6e45e2' : '1px solid #eee', borderRadius: '12px', cursor: 'pointer', background: assessmentType === 'custom' ? '#f8f5ff' : '#fff', transition: 'all 0.2s' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                                        <i className="fas fa-robot" style={{ fontSize: '1.2rem', color: '#6e45e2' }}></i>
                                                        <h3 style={{ color: '#2d3436', margin: 0, fontSize: '1rem' }}>Generate Quiz</h3>
                                                    </div>
                                                    <p style={{ color: '#666', fontSize: '0.8rem', margin: 0, lineHeight: '1.4' }}>AI questions from your material.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '18px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: '#888', textTransform: 'uppercase' }}>3. Schedule & Limits <span style={{ fontWeight: '400', color: '#bbb', fontSize: '0.8rem' }}>(optional)</span></label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {assessmentType === 'custom' && (
                                                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '12px 14px', border: '1px solid #eee' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <i className="fas fa-hourglass-half" style={{ color: '#6e45e2', fontSize: '0.9rem' }}></i>
                                                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#2d3436' }}>Time Limit</span>
                                                        <span style={{ fontSize: '0.75rem', color: '#aaa' }}>— how long students have to finish</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="300"
                                                            value={cwTimeLimit}
                                                            onChange={e => setCwTimeLimit(e.target.value)}
                                                            placeholder="e.g. 30"
                                                            style={{ width: '90px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' }}
                                                            onFocus={e => e.target.style.borderColor = '#6e45e2'}
                                                            onBlur={e => e.target.style.borderColor = '#ddd'}
                                                        />
                                                        <span style={{ color: '#888', fontSize: '0.85rem' }}>minutes</span>
                                                        {cwTimeLimit && <button type="button" onClick={() => setCwTimeLimit('')} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}><i className="fas fa-times"></i> clear</button>}
                                                    </div>
                                                </div>
                                                )}
                                                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '12px 14px', border: '1px solid #eee' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <i className="fas fa-calendar-alt" style={{ color: '#e74c3c', fontSize: '0.9rem' }}></i>
                                                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#2d3436' }}>Deadline</span>
                                                        <span style={{ fontSize: '0.75rem', color: '#aaa' }}>— last day/time to submit</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="date"
                                                            min={new Date().toISOString().split("T")[0]}
                                                            value={cwDeadline}
                                                            onChange={e => setCwDeadline(e.target.value)}
                                                            style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', colorScheme: 'light' }}
                                                            onFocus={e => e.target.style.borderColor = '#e74c3c'}
                                                            onBlur={e => e.target.style.borderColor = '#ddd'}
                                                        />
                                                        {cwDeadline && <button type="button" onClick={() => setCwDeadline('')} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}><i className="fas fa-times"></i> clear</button>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Quiz Generator Content */}
                                    <div className="cw-modal-right" style={{ overflowY: 'auto', minHeight: 0 }}>
                            {assessmentType === 'custom' && (
                                            <div style={{ marginTop: '0' }}>
                                    <h3 style={{ color: '#2d3436', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="fas fa-robot" style={{ color: '#6e45e2' }}></i>Quiz Generator</h3>

                                    {!aiGenerated && (
                                        <div className="ai-upload-zone">
                                            {!isAiGenerating ? (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                        <i className="fas fa-magic" style={{ fontSize: '1.8rem', color: '#6e45e2' }}></i>
                                                        <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#2d3436' }}>Upload a PDF or paste your lesson</span>
                                                    </div>
                                                    <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '20px', marginTop: 0 }}>The AI will instantly generate multiple-choice questions from your material.</p>

                                                    <input type="file" accept="application/pdf" id="ai-pdf-input" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { alert('PDF too large! Max 10MB.'); return; } setAiPdfFile(file); e.target.value = ''; }} />
                                                    <label htmlFor="ai-pdf-input" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', background: '#f3f0ff', color: '#6e45e2', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', marginBottom: '12px', fontSize: '0.95rem', border: '1px solid #d7ccff', transition: 'all 0.2s' }}>
                                                        <i className="fas fa-file-pdf"></i>{aiPdfFile ? 'Change PDF' : 'Choose PDF'}
                                                    </label>

                                                    {aiPdfFile && (
                                                        <div style={{ margin: '0 auto 14px auto', padding: '8px 14px', background: '#f3f0ff', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6e45e2', fontWeight: '600', fontSize: '0.88rem', border: '1px solid #d7ccff' }}>
                                                            <i className="fas fa-file-pdf"></i>
                                                            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aiPdfFile.name}</span>
                                                            <button type="button" onClick={() => setAiPdfFile(null)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}><i className="fas fa-times"></i></button>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 14px 0' }}>
                                                        <div style={{ flex: 1, height: '1px', background: '#e1e1e1' }}></div>
                                                        <span style={{ color: '#aaa', fontSize: '0.85rem', fontWeight: '600' }}>or paste text</span>
                                                        <div style={{ flex: 1, height: '1px', background: '#e1e1e1' }}></div>
                                                    </div>

                                                    <textarea value={aiLessonText} onChange={e => setAiLessonText(e.target.value)} placeholder="Paste your lesson, module, or notes here..." rows="5" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d7ccff', resize: 'vertical', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', marginBottom: '16px', background: '#fff', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#6e45e2'} onBlur={e => e.target.style.borderColor = '#d7ccff'} />

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
                                                        <label style={{ color: '#555', fontWeight: '600', fontSize: '0.9rem' }}>Number of questions:</label>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            {[3, 5, 8, 10, 15].map(n => (
                                                                <button key={n} type="button" onClick={() => setAiQuestionCount(n)} style={{ width: '38px', height: '38px', border: aiQuestionCount === n ? '2px solid #6e45e2' : '1px solid #ddd', borderRadius: '8px', background: aiQuestionCount === n ? '#f3f0ff' : '#fff', color: aiQuestionCount === n ? '#6e45e2' : '#555', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>{n}</button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {!aiGenerated && (
                                                        <button type="button" className="ai-generate-btn" onClick={handleGenerateAiQuiz} disabled={isAiGenerating || (!aiPdfFile && !aiLessonText.trim())}>
                                                            <i className="fas fa-magic"></i> Generate Quiz with AI
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                                    <i className="fas fa-magic fa-spin" style={{ fontSize: '3.5rem', color: '#6e45e2', marginBottom: '20px', display: 'block' }}></i>
                                                    <h3 style={{ color: '#2d3436', marginBottom: '10px' }}>Generating your chemistry quiz...</h3>
                                                    <p style={{ color: '#888', maxWidth: '400px', margin: '0 auto 30px' }}>Our AI is analyzing your material and crafting {aiQuestionCount} unique questions just for your class.</p>
                                                    <div style={{ textAlign: 'left' }}>
                                                        {[...Array(3)].map((_, i) => (
                                                            <div key={i} style={{ padding: '15px', borderRadius: '12px', border: '1px solid #e1e1e1', marginBottom: '10px', background: '#fff' }}>
                                                                <div className="ai-generating-pulse" style={{ width: '80%' }}></div>
                                                                <div className="ai-generating-pulse" style={{ width: '60%' }}></div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                                                                    {[...Array(4)].map((_, j) => <div key={j} className="ai-generating-pulse" style={{ height: '36px', marginBottom: 0 }}></div>)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}


                                        </div>
                                    )}

                                    {aiGenerated && quizQuestions.length > 0 && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                                                <span style={{ fontWeight: '700', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}><i className="fas fa-check-circle"></i> {quizQuestions.length} questions generated successfully!</span>
                                                <button type="button" onClick={resetAiState} style={{ background: '#fff', border: '1px solid #d1fae5', color: '#16a34a', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}><i className="fas fa-redo"></i> Regenerate</button>
                                            </div>
                                            {quizQuestions.map((q, qIndex) => (
                                                <div key={q.id || qIndex} className="ai-question-card">
                                                    <p style={{ fontWeight: '700', color: '#2d3436', margin: '0 0 14px 0', fontSize: '1rem', lineHeight: '1.5' }}>
                                                        <span style={{ display: 'inline-block', width: '26px', height: '26px', background: '#f3f0ff', color: '#6e45e2', borderRadius: '6px', textAlign: 'center', lineHeight: '26px', fontSize: '0.85rem', fontWeight: '800', marginRight: '10px' }}>{qIndex + 1}</span>
                                                        {q.question}
                                                    </p>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                        {q.options.map((opt, oIndex) => (
                                                            <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 13px', borderRadius: '9px', background: q.correctOption === oIndex ? '#f0fdf4' : '#f8f9fa', border: q.correctOption === oIndex ? '2px solid #1dd1a1' : '1px solid #e1e1e1', fontSize: '0.9rem' }}>
                                                                {q.correctOption === oIndex ? <i className="fas fa-check-circle" style={{ color: '#1dd1a1', flexShrink: 0 }}></i> : <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1.5px solid #ccc', flexShrink: 0, display: 'inline-block' }}></span>}
                                                                <span style={{ color: q.correctOption === oIndex ? '#15803d' : '#555', fontWeight: q.correctOption === oIndex ? '600' : '400' }}>{opt}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                                        {assessmentType === 'time_attack' && (
                                            <div style={{ textAlign: 'center', paddingTop: '60px', color: '#888' }}>
                                                <i className="fas fa-stopwatch" style={{ fontSize: '4rem', opacity: 0.2, marginBottom: '20px' }}></i>
                                                <p style={{ fontSize: '1.1rem' }}>Students will participate in the built-in Time Attack challenge.</p>
                                                <p style={{ fontSize: '0.9rem' }}>No further configuration required.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ padding: '20px 30px', borderTop: '1px solid #eee', margin: 0, flexShrink: 0 }}>
                                <button type="submit" className={`btn-confirm ${isUploading || (assessmentType === 'custom' && !aiGenerated) ? 'disabled' : ''}`} disabled={isUploading || (assessmentType === 'custom' && !aiGenerated)} title={assessmentType === 'custom' && !aiGenerated ? 'Generate questions first' : ''}>{isUploading ? 'Posting...' : 'Post'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Post Modal ── */}
            {isEditPostModalOpen && selectedPost && (
                <div className="modal-container show" onClick={() => setIsEditPostModalOpen(false)}>
                    <div className="modal-content announce-modal" onClick={e => e.stopPropagation()}>
                        <div className="announce-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 style={{ margin: 0 }}>Edit</h2>
                                <div style={{ display: 'flex', gap: '5px', background: '#f0f2f5', padding: '4px', borderRadius: '10px' }}>
                                    <button type="button" onClick={() => setEditPostType('Announcement')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: editPostType === 'Announcement' ? 'white' : 'transparent', color: editPostType === 'Announcement' ? '#10ac84' : '#666', fontWeight: '600', cursor: 'pointer', boxShadow: editPostType === 'Announcement' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-comment-dots"></i> Announcement</button>
                                    <button type="button" onClick={() => setEditPostType('Module')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: editPostType === 'Module' ? 'white' : 'transparent', color: editPostType === 'Module' ? '#4facfe' : '#666', fontWeight: '600', cursor: 'pointer', boxShadow: editPostType === 'Module' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-book"></i> Module</button>
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
                                        <span style={{ fontSize: '0.9rem', color: '#333', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><i className={`fas ${selectedPost.attachment.type.startsWith('image/') ? 'fa-image' : selectedPost.attachment.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-word'}`} style={{ color: '#6e45e2', fontSize: '1.2rem' }}></i>{selectedPost.attachment.name}</span>
                                    </div>
                                )}
                            </div>
                            <div className="announce-toolbar">
                                <div className="toolbar-icons">
                                    <button type="button" title="Attach file" onClick={() => alert("Editing attachments will be supported in a future update!")}><i className="fas fa-paperclip"></i></button>
                                    <button type="button" title="Add link" onClick={() => { setLinkTarget('edit'); setLinkInput(''); setIsLinkModalOpen(true); }}><i className="fas fa-link"></i></button>
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

            {/* ── Delete Post Modal ── */}
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

            {/* ── Delete Classwork Modal ── */}
            {isDeleteCwModalOpen && selectedCw && (
                <div className="modal-container show" onClick={() => setIsDeleteCwModalOpen(false)}>
                    <div className="modal-content" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <i className="fas fa-exclamation-triangle modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Delete Activity</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to delete <strong>{selectedCw.title}</strong>? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setIsDeleteCwModalOpen(false)}>Cancel</button>
                            <button className="btn-confirm" onClick={handleConfirmDeleteClasswork} style={{ backgroundColor: '#e74c3c' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Report Modal ── */}
            {isReportModalOpen && selectedReportCw && (
                <div className="modal-container show" onClick={() => setIsReportModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px' }}>
                            <h2 style={{ margin: 0, color: '#2d3436' }}><i className="fas fa-chart-bar" style={{ color: '#4facfe', marginRight: '10px' }}></i> Submissions</h2>
                            <button className="close-modal" onClick={() => setIsReportModalOpen(false)} style={{ position: 'static' }}>&times;</button>
                        </div>
                        <p style={{ color: '#666', marginBottom: '20px', fontWeight: '600', fontSize: '1.1rem' }}>{selectedReportCw.title}</p>
                        {!selectedReportCw.submissions || selectedReportCw.submissions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                                <i className="fas fa-inbox" style={{ fontSize: '3rem', color: '#e1e1e1', marginBottom: '15px' }}></i>
                                <p>No students have submitted this activity yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {selectedReportCw.submissions.sort((a,b) => b.score - a.score).map((sub, idx) => (
                                    <div key={idx} style={{ background: '#fdfdfd', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                                        <div onClick={() => setExpandedStudentId(expandedStudentId === sub.studentId ? null : sub.studentId)} style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedStudentId === sub.studentId ? '#f8faff' : 'transparent', transition: 'background 0.2s' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{sub.studentName.charAt(0).toUpperCase()}</div>
                                                <div>
                                                    <span style={{ fontWeight: '600', color: '#2d3436', display: 'block', fontSize: '1.05rem' }}>{sub.studentName}</span>
                                                    <span style={{ fontSize: '0.85rem', color: '#888' }}>Submitted: {new Date(sub.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: sub.score >= sub.total / 2 ? '#1dd1a1' : '#e74c3c' }}>{sub.score}/{sub.total}</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Score</span>
                                                </div>
                                                {(selectedReportCw.assessmentType === 'custom' || selectedReportCw.assessmentType === 'time_attack') && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: expandedStudentId === sub.studentId ? '#fff' : '#4facfe', background: expandedStudentId === sub.studentId ? '#4facfe' : '#eaf4ff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.2s' }}>View Details <i className={`fas fa-chevron-${expandedStudentId === sub.studentId ? 'up' : 'down'}`}></i></div>
                                                )}
                                            </div>
                                        </div>
                                        {expandedStudentId === sub.studentId && selectedReportCw.assessmentType === 'custom' && (
                                            <div style={{ padding: '20px', borderTop: '1px solid #eee', background: '#fff' }}>
                                                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Detailed Breakdown</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {selectedReportCw.questions.map((q, qIdx) => {
                                                        const studentAnsIdx = sub.answers ? sub.answers[qIdx] : null;
                                                        const isCorrect = studentAnsIdx === q.correctOption;
                                                        return (
                                                            <div key={qIdx} style={{ padding: '12px', borderRadius: '8px', background: isCorrect ? '#f0fdf4' : '#fff0f0', border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}` }}>
                                                                <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>{qIdx + 1}. {q.question}</p>
                                                                <div style={{ fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                    <span style={{ color: isCorrect ? '#16a34a' : '#ef4444', fontWeight: '500' }}><i className={`fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'}`} style={{ marginRight: '6px' }}></i>Student's Answer: {studentAnsIdx !== null && studentAnsIdx !== undefined ? q.options[studentAnsIdx] : <em>No answer</em>}</span>
                                                                    {!isCorrect && <span style={{ color: '#16a34a', fontWeight: '500' }}><i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>Correct Answer: {q.options[q.correctOption]}</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        {expandedStudentId === sub.studentId && selectedReportCw.assessmentType === 'time_attack' && (
                                            <div style={{ padding: '20px', borderTop: '1px solid #eee', background: '#fff' }}>
                                                <h4 style={{ margin: '0 0 15px 0', color: '#555' }}>Performance Summary</h4>
                                                <div style={{ display: 'flex', gap: '20px' }}>
                                                    <div style={{ flex: 1, padding: '15px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}><i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#16a34a', marginBottom: '10px' }}></i><h3 style={{ margin: 0, color: '#16a34a', fontSize: '1.5rem' }}>{sub.score}</h3><p style={{ margin: 0, color: '#15803d', fontWeight: '600' }}>Correct Answers</p></div>
                                                    <div style={{ flex: 1, padding: '15px', borderRadius: '12px', background: '#fff0f0', border: '1px solid #fecaca', textAlign: 'center' }}><i className="fas fa-times-circle" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '10px' }}></i><h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.5rem' }}>{sub.wrong || 0}</h3><p style={{ margin: 0, color: '#b91c1c', fontWeight: '600' }}>Wrong Answers</p></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Remove Student Modal ── */}
            {isRemoveStudentModalOpen && studentToRemove && (
                <div className="modal-container show" onClick={() => setIsRemoveStudentModalOpen(false)}>
                    <div className="modal-content" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <i className="fas fa-user-minus modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Remove Student</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to remove <strong>{studentToRemove.name}</strong> from this class?</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setIsRemoveStudentModalOpen(false)}>Cancel</button>
                            <button className="btn-confirm" onClick={handleConfirmRemoveStudent} style={{ backgroundColor: '#e74c3c' }}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── File Preview Modal ── */}
            {previewAttachment && (
                <div className="modal-container show" style={{ zIndex: 9999, backdropFilter: 'blur(5px)' }} onClick={() => setPreviewAttachment(null)}>
                    <div className="modal-content" style={{ width: '95%', maxWidth: '1400px', height: '95vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1e1e1e', border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#2d3436', borderBottom: '1px solid #444' }}>
                            <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><i className={`fas ${previewAttachment.type.startsWith('image/') ? 'fa-image' : previewAttachment.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-word'}`} style={{ color: '#4facfe' }}></i>{previewAttachment.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button onClick={() => window.open(previewAttachment.url, '_blank')} style={{ background: '#4facfe', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><i className="fas fa-external-link-alt"></i> Open</button>
                                <button onClick={() => setPreviewAttachment(null)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1, padding: '0 5px' }}>&times;</button>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f0f0f', position: 'relative' }}>
                            {isPreviewLoading && (<div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#4facfe', zIndex: 1 }}><i className="fas fa-circle-notch fa-spin" style={{ fontSize: '3rem', marginBottom: '10px' }}></i><span style={{ fontWeight: '600', color: '#fff' }}>Loading preview...</span></div>)}
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

            {/* ── Link Modal ── */}
            {isLinkModalOpen && (
                <div className="modal-container show" style={{ zIndex: 1100 }} onClick={() => setIsLinkModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '15px', color: '#2d3436' }}><i className="fas fa-link" style={{ color: '#4facfe', marginRight: '10px' }}></i>Add Link</h2>
                        <div className="input-group"><label>URL Address</label><input type="url" placeholder="https://example.com" value={linkInput} onChange={e => setLinkInput(e.target.value)} autoFocus /></div>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={() => setIsLinkModalOpen(false)}>Cancel</button>
                            <button type="button" className="btn-confirm" style={{ background: '#4facfe' }} onClick={() => { if (!linkInput.trim()) return; const url = linkInput.trim(); if (linkTarget === 'create') setPostContent(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + url + ' '); else setEditPostContent(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + url + ' '); setIsLinkModalOpen(false); }}>Add Link</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Remove Question Modal ── */}
            {isRemoveQuestionModalOpen && (
                <div className="modal-container show" style={{ zIndex: 10000 }} onClick={() => setIsRemoveQuestionModalOpen(false)}>
                    <div className="modal-content" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <i className="fas fa-trash-alt modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Remove Question</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to remove this question?</p>
                        <div className="modal-actions">
                            <button type="button" className="btn-cancel" onClick={() => setIsRemoveQuestionModalOpen(false)}>Cancel</button>
                            <button type="button" className="btn-confirm" onClick={confirmRemoveQuestion} style={{ backgroundColor: '#e74c3c' }}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── AI Error Modal ── */}
            {isAiErrorModalOpen && (
                <div className="modal-container show" style={{ zIndex: 10001 }} onClick={() => { setIsAiErrorModalOpen(false); setAiError(''); }}>
                    <div className="modal-content" style={{ textAlign: 'center', maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #fff0f0, #fecaca)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', boxShadow: '0 4px 15px rgba(231,76,60,0.15)' }}>
                            <i className="fas fa-flask" style={{ fontSize: '2rem', color: '#e74c3c' }}></i>
                        </div>
                        <h2 style={{ marginBottom: '10px', color: '#2d3436' }}>Not Chemistry-Related</h2>
                        <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                            {aiError || 'The uploaded material does not appear to be related to chemistry. Please upload a chemistry lesson or module only.'}
                        </p>
                        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '12px 16px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-info-circle" style={{ color: '#6e45e2', fontSize: '1rem', flexShrink: 0 }}></i>
                            <span style={{ color: '#555', fontSize: '0.85rem', textAlign: 'left' }}>Accepted topics: elements, compounds, reactions, periodic table, atoms, molecules, acids & bases, lab procedures, and more.</span>
                        </div>
                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <button type="button" className="btn-confirm" style={{ background: 'linear-gradient(135deg, #6e45e2, #8e44ad)', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setIsAiErrorModalOpen(false); setAiError(''); setAiPdfFile(null); setAiLessonText(''); }}>
                                <i className="fas fa-redo"></i> Generate Another
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
