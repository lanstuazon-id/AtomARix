import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './TeacherRoom.css';
import { doc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
    const [analyticsStudent, setAnalyticsStudent] = useState(null);
    const [selectedReportCw, setSelectedReportCw] = useState(null);
    const [expandedStudentId, setExpandedStudentId] = useState(null);
    const [expandedWeakStudents, setExpandedWeakStudents] = useState(new Set());
    const [isMostMissedOpen, setIsMostMissedOpen] = useState(false);
    const [analysisModal, setAnalysisModal] = useState(null); // { type: 'avg'|'participation'|'atrisk'|'range' }

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
    // Per-type question counts
    const [countMC, setCountMC]     = useState(3);
    const [countTF, setCountTF]     = useState(2);
    const [countID, setCountID]     = useState(2);
    const [countFB, setCountFB]     = useState(2);

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
        const totalCount = countMC + countTF + countID + countFB;
        if (totalCount === 0) {
            setAiError('Please set at least 1 question for any type.');
            setIsAiErrorModalOpen(true);
            return;
        }
        setIsAiGenerating(true);
        setAiError('');

        try {
            const app = getApp();
            const functions = getFunctions(app);
            const generateQuiz = httpsCallable(functions, 'generateQuiz');

            let lessonContent = aiLessonText.trim();

            // Step 1 — Extract PDF text if uploaded
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

            // Step 2 — Validate chemistry content
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

            // Step 3 — Build type-specific instructions
            const typeInstructions = [];
            if (countMC > 0) typeInstructions.push(`- ${countMC} Multiple Choice questions: each has a "question" string, "options" array of exactly 4 strings, "correctOption" integer (0-3), and "type": "mc"`);
            if (countTF > 0) typeInstructions.push(`- ${countTF} True or False questions: each has a "question" string, "options": ["True", "False"], "correctOption" integer (0 for True, 1 for False), and "type": "tf"`);
            if (countID > 0) typeInstructions.push(`- ${countID} Identification questions: each has a "question" string (e.g. "What element has the symbol Au?"), "answer" string (the correct word/phrase, e.g. "Gold"), and "type": "identification". No options array.`);
            if (countFB > 0) typeInstructions.push(`- ${countFB} Fill in the Blank questions: each has a "question" string with a blank shown as ___ (e.g. "The atomic number of Carbon is ___."), "answer" string (the word or value that fills the blank, e.g. "6"), and "type": "fillblank". No options array.`);

            const prompt = `You are a professional quiz generator for a Grade 7-8 chemistry classroom. Based on the lesson content below, generate a mixed quiz with exactly ${totalCount} questions total.

LESSON CONTENT:
${lessonContent}

QUESTION TYPES TO GENERATE:
${typeInstructions.join('\n')}

STRICT OUTPUT RULES:
- Respond with ONLY a valid JSON array. No markdown, no backticks, no preamble, no extra text.
- Each item must have the exact fields described above for its type.
- Questions must be appropriate for Grade 7-8 students (ages 12-14).
- Use simple, clear language.
- Vary difficulty from easy to moderate.
- Mix the question types throughout — do not group all of one type together.

Example format:
[
  {"type":"mc","question":"What is the symbol for Gold?","options":["Ag","Au","Fe","Cu"],"correctOption":1},
  {"type":"tf","question":"Protons have a negative charge.","options":["True","False"],"correctOption":1},
  {"type":"identification","question":"What element has the atomic number 1?","answer":"Hydrogen"},
  {"type":"fillblank","question":"Water is made of hydrogen and ___.","answer":"oxygen"}
]`;

            const quizResult = await generateQuiz({
                payload: {
                    model: 'claude-sonnet-4-6',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: prompt }]
                }
            });

            const raw = quizResult.data?.content?.map(b => b.text || '').join('').trim() || '';
            const clean = raw.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(clean);

            if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('AI returned an unexpected format. Please try again.');

            setQuizQuestions(parsed.map((q, i) => ({
                id: Date.now().toString() + i,
                type: q.type || 'mc',
                question: q.question,
                options: q.options || (q.type === 'tf' ? ['True', 'False'] : []),
                correctOption: q.correctOption ?? 0,
                answer: q.answer || '',
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
        const anyOpen = isPostModalOpen || isCwModalOpen || isEditPostModalOpen || isDeletePostModalOpen || isDeleteCwModalOpen || isReportModalOpen || isRemoveStudentModalOpen || previewAttachment || isLinkModalOpen || isRemoveQuestionModalOpen || isAiErrorModalOpen || isAnalyticsModalOpen;
        document.body.style.overflow = anyOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isPostModalOpen, isCwModalOpen, isEditPostModalOpen, isDeletePostModalOpen, isDeleteCwModalOpen, isReportModalOpen, isRemoveStudentModalOpen, previewAttachment, isLinkModalOpen, isRemoveQuestionModalOpen, isAiErrorModalOpen, isAnalyticsModalOpen]);

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
                return <strong key={i} style={{ color: '#888' }}>{part.slice(2, -2)}</strong>;
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
                                    <div style={{ marginTop: '15px', padding: '10px 15px', background: 'white', border: '1px solid #eee', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setPreviewAttachment(post.attachment)}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}><i className={`fas ${post.attachment.type.startsWith('image/') ? 'fa-image' : post.attachment.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file-word'}`}></i></div>
                                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                            <span style={{ color: '#2d3436', fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '300px' }}>{post.attachment.name}</span>
                                            <span style={{ color: '#2d3436', fontSize: '0.8rem', textTransform: 'uppercase' }}>{post.attachment.type.startsWith('image/') ? 'Image' : post.attachment.type.includes('pdf') ? 'PDF Document' : 'Word Document'}</span>
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

    // Gathers one student's submissions across every activity posted in this
    // room (classwork already holds all of it client-side), sorted oldest
    // to newest so a line chart of their scores reads as a real timeline.
    const getStudentActivityHistory = (studentId) => {
        const history = [];
        classwork.forEach(cw => {
            if (cw.type !== 'assessment' || !cw.submissions) return;
            const sub = cw.submissions.find(s => s.studentId === studentId);
            if (sub) {
                history.push({
                    title: cw.title,
                    score: sub.score,
                    total: sub.total,
                    percent: sub.total > 0 ? Math.round((sub.score / sub.total) * 100) : 0,
                    timestamp: sub.timestamp,
                    assessmentType: cw.assessmentType,
                });
            }
        });
        return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    };

    const openAnalyticsModal = (student) => {
        setAnalyticsStudent(student);
        setIsAnalyticsModalOpen(true);
    };

    const renderAnalysis = () => {
        const customCw = classwork.filter(cw => cw.type === 'assessment' && cw.assessmentType === 'custom' && cw.questions?.length > 0);
        const allCw    = classwork.filter(cw => cw.type === 'assessment');

        const scoreColor = p => p >= 70 ? '#1dd1a1' : p >= 50 ? '#f39c12' : '#e74c3c';
        const scoreBg    = p => p >= 70 ? '#e3fdf5' : p >= 50 ? '#fff7e0' : '#fff0f0';
        const diffLabel  = p => p >= 70 ? 'Easy' : p >= 50 ? 'Medium' : 'Hard';

        const studentData = students.map(student => {
            const actScores = allCw.map(cw => {
                const sub = (cw.submissions || []).find(s => s.studentId === student.id);
                if (!sub) return null;
                const pct = sub.total > 0 ? Math.round((sub.score / sub.total) * 100) : 0;
                return { cwId: cw.id, title: cw.title, score: sub.score, total: sub.total, pct, assessmentType: cw.assessmentType };
            });
            const submitted = actScores.filter(Boolean);
            const avg = submitted.length > 0 ? Math.round(submitted.reduce((a, b) => a + b.pct, 0) / submitted.length) : null;
            const weakTopics = [];
            customCw.forEach(cw => {
                const sub = (cw.submissions || []).find(s => s.studentId === student.id);
                if (!sub?.answers) return;
                cw.questions.forEach((q, qi) => {
                    if (sub.answers[qi] !== q.correctOption) weakTopics.push({ question: q.question, activity: cw.title });
                });
            });
            return { student, actScores, avg, submitted: submitted.length, weakTopics };
        }).sort((a, b) => {
            if (a.avg === null && b.avg === null) return 0;
            if (a.avg === null) return 1;
            if (b.avg === null) return -1;
            return b.avg - a.avg;
        });

        const questionMissMap = {};
        customCw.forEach(cw => {
            cw.questions.forEach((q, qi) => {
                const total = (cw.submissions || []).length;
                if (total === 0) return;
                const wrong = (cw.submissions || []).filter(s => !s.answers || s.answers[qi] !== q.correctOption).length;
                questionMissMap[`${cw.id}-${qi}`] = { question: q.question, activity: cw.title, wrong, total, missRate: Math.round((wrong / total) * 100) };
            });
        });
        const hardestQuestions = Object.values(questionMissMap).filter(q => q.missRate > 0).sort((a, b) => b.missRate - a.missRate).slice(0, 8);

        const allAvgs = studentData.filter(s => s.avg !== null).map(s => s.avg);
        const classAvg = allAvgs.length > 0 ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) : null;
        const atRisk = studentData.filter(s => s.avg !== null && s.avg < 50).length;
        const topStudent = studentData.find(s => s.avg !== null);
        const mostMissed = hardestQuestions[0];

        const toggleWeakStudent = (id) => {
            setExpandedWeakStudents(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
            });
        };

        const card = { background: 'white', border: '1px solid #eee', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' };

        if (students.length === 0) return (
            <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
                <i className="fas fa-users" style={{ fontSize: '3rem', color: '#ddd', marginBottom: '16px', display: 'block' }}></i>
                <h3 style={{ color: '#2d3436', fontWeight: '600' }}>No students have joined yet</h3>
                <p style={{ color: '#bbb', marginTop: '8px' }}>Item analysis will appear once students join and submit activities.</p>
            </div>
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

                {/* ── stat cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>

                    {/* Class Average */}
                    <div onClick={() => setAnalysisModal({ type: 'avg' })} style={{ background: 'white', border: '1px solid #eee', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6e45e2'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(110,69,226,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.75rem', color: '#2d3436', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Class Average</span>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3f0ff', color: '#6e45e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}><i className="fas fa-chart-line"></i></div>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: classAvg !== null ? (classAvg >= 70 ? '#1dd1a1' : classAvg >= 50 ? '#f39c12' : '#e74c3c') : '#ccc', lineHeight: 1 }}>
                            {classAvg !== null ? `${classAvg}%` : '—'}
                        </div>
                        {classAvg !== null && (
                            <div>
                                <div style={{ height: '6px', background: '#f0f2f5', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                                    <div style={{ height: '100%', width: `${classAvg}%`, background: classAvg >= 70 ? '#1dd1a1' : classAvg >= 50 ? '#f39c12' : '#e74c3c', borderRadius: '99px', transition: 'width 0.6s ease' }}></div>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                    {classAvg >= 70 ? '✓ Class is performing well' : classAvg >= 50 ? '⚠ Needs some improvement' : '✗ Class needs attention'}
                                </span>
                            </div>
                        )}
                        <span style={{ fontSize: '0.72rem', color: '#6e45e2', fontWeight: '600', marginTop: '2px' }}>Tap to see breakdown →</span>
                    </div>

                    {/* Participation */}
                    <div onClick={() => setAnalysisModal({ type: 'participation' })} style={{ background: 'white', border: '1px solid #eee', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#4facfe'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,172,254,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.75rem', color: '#2d3436', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Participation</span>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eaf4ff', color: '#4facfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}><i className="fas fa-users"></i></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', lineHeight: 1 }}>
                            <span style={{ fontSize: '2rem', fontWeight: '800', color: '#888' }}>{studentData.filter(s => s.submitted > 0).length}</span>
                            <span style={{ fontSize: '1rem', color: '#2d3436', fontWeight: '600', marginBottom: '4px' }}>/ {students.length}</span>
                        </div>
                        <div>
                            <div style={{ height: '6px', background: '#f0f2f5', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                                <div style={{ height: '100%', width: students.length > 0 ? `${Math.round((studentData.filter(s => s.submitted > 0).length / students.length) * 100)}%` : '0%', background: '#4facfe', borderRadius: '99px', transition: 'width 0.6s ease' }}></div>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#888' }}>students submitted at least one activity</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#4facfe', fontWeight: '600', marginTop: '2px' }}>Tap to see who submitted →</span>
                    </div>

                    {/* At Risk */}
                    <div onClick={() => setAnalysisModal({ type: 'atrisk' })} style={{ background: atRisk > 0 ? '#fff8f8' : 'white', border: `1px solid ${atRisk > 0 ? '#fecaca' : '#eee'}`, borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#e74c3c'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(231,76,60,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = atRisk > 0 ? '#fecaca' : '#eee'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.75rem', color: atRisk > 0 ? '#e74c3c' : '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>At Risk</span>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff0f0', color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}><i className="fas fa-exclamation-triangle"></i></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', lineHeight: 1 }}>
                            <span style={{ fontSize: '2rem', fontWeight: '800', color: atRisk > 0 ? '#e74c3c' : '#1dd1a1' }}>{atRisk}</span>
                            <span style={{ fontSize: '0.85rem', color: '#2d3436', fontWeight: '600', marginBottom: '4px' }}>student{atRisk !== 1 ? 's' : ''}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: atRisk > 0 ? '#e74c3c' : '#1dd1a1' }}>
                            {atRisk > 0 ? 'averaging below 50% — needs intervention' : '✓ No students at risk'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#e74c3c', fontWeight: '600', marginTop: '2px' }}>Tap to see at-risk students →</span>
                    </div>

                    {/* Score Range */}
                    <div onClick={() => setAnalysisModal({ type: 'range' })} style={{ background: 'white', border: '1px solid #eee', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#f39c12'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(243,156,18,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.75rem', color: '#2d3436', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score Range</span>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff7e0', color: '#f39c12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}><i className="fas fa-arrows-alt-v"></i></div>
                        </div>
                        {(() => {
                            const withAvg = studentData.filter(s => s.avg !== null);
                            const highest = withAvg[0];
                            const lowest = withAvg[withAvg.length - 1];
                            if (!highest) return <span style={{ fontSize: '0.85rem', color: '#ccc' }}>No data yet</span>;
                            return (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <i className="fas fa-arrow-up" style={{ fontSize: '0.7rem', color: '#1dd1a1' }}></i>
                                                <span style={{ fontSize: '0.82rem', color: '#2d3436', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>{highest.student.fullname || highest.student.username}</span>
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1dd1a1' }}>{highest.avg}%</span>
                                        </div>
                                        {lowest && lowest.student.id !== highest.student.id && (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <i className="fas fa-arrow-down" style={{ fontSize: '0.7rem', color: '#e74c3c' }}></i>
                                                    <span style={{ fontSize: '0.82rem', color: '#2d3436', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>{lowest.student.fullname || lowest.student.username}</span>
                                                </div>
                                                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#e74c3c' }}>{lowest.avg}%</span>
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                        {lowest && lowest.student.id !== highest.student.id ? `${highest.avg - lowest.avg}pt gap between top and bottom` : 'Only one student has submitted'}
                                    </span>
                                </>
                            );
                        })()}
                        <span style={{ fontSize: '0.72rem', color: '#f39c12', fontWeight: '600', marginTop: '2px' }}>Tap to see full ranking →</span>
                    </div>

                </div>

                {/* ── stat card modals ── */}
                {analysisModal && (() => {
                    const scoreColor = p => p >= 70 ? '#1dd1a1' : p >= 50 ? '#f39c12' : '#e74c3c';
                    const scoreBg   = p => p >= 70 ? '#e3fdf5' : p >= 50 ? '#fff7e0' : '#fff0f0';
                    const withAvg   = studentData.filter(s => s.avg !== null);

                    const configs = {
                        avg: {
                            icon: 'fa-chart-line', iconColor: '#6e45e2', iconBg: '#f3f0ff',
                            title: 'Class Average Breakdown',
                            subtitle: `Overall average across ${allCw.length} activit${allCw.length !== 1 ? 'ies' : 'y'}`,
                        },
                        participation: {
                            icon: 'fa-users', iconColor: '#4facfe', iconBg: '#eaf4ff',
                            title: 'Participation Details',
                            subtitle: 'Who has and hasn\'t submitted at least one activity',
                        },
                        atrisk: {
                            icon: 'fa-exclamation-triangle', iconColor: '#e74c3c', iconBg: '#fff0f0',
                            title: 'At-Risk Students',
                            subtitle: 'Students averaging below 50% across all activities',
                        },
                        range: {
                            icon: 'fa-arrows-alt-v', iconColor: '#f39c12', iconBg: '#fff7e0',
                            title: 'Full Score Ranking',
                            subtitle: 'All students ranked by overall average, highest to lowest',
                        },
                    };
                    const cfg = configs[analysisModal.type];

                    return (
                        <div className="modal-container show" onClick={() => setAnalysisModal(null)}>
                            <div className="modal-content" onClick={e => e.stopPropagation()}
                                style={{ maxWidth: '520px', maxHeight: '82vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: '18px', background: 'white', border: 'none' }}>

                                {/* header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 22px', borderBottom: '1px solid #f0f2f5', flexShrink: 0 }}>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: cfg.iconBg, color: cfg.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                        <i className={`fas ${cfg.icon}`}></i>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '800', color: '#2d3436', fontSize: '1rem' }}>{cfg.title}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#2d3436', marginTop: '1px' }}>{cfg.subtitle}</div>
                                    </div>
                                    <button onClick={() => setAnalysisModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#2d3436', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>&times;</button>
                                </div>

                                {/* body */}
                                <div style={{ overflowY: 'auto', padding: '18px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                    {/* ── CLASS AVERAGE modal ── */}
                                    {analysisModal.type === 'avg' && (
                                        <>
                                            {/* big avg + bar */}
                                            <div style={{ textAlign: 'center', padding: '16px', background: scoreBg(classAvg ?? 0), borderRadius: '12px', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '3rem', fontWeight: '800', color: scoreColor(classAvg ?? 0), lineHeight: 1 }}>{classAvg !== null ? `${classAvg}%` : '—'}</div>
                                                <div style={{ fontSize: '0.82rem', color: '#2d3436', marginTop: '6px' }}>{classAvg >= 70 ? '✓ Class is performing well' : classAvg >= 50 ? '⚠ Needs some improvement' : '✗ Class needs attention'}</div>
                                                <div style={{ height: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '99px', overflow: 'hidden', marginTop: '12px' }}>
                                                    <div style={{ height: '100%', width: `${classAvg ?? 0}%`, background: scoreColor(classAvg ?? 0), borderRadius: '99px' }}></div>
                                                </div>
                                            </div>
                                            {/* per-activity averages */}
                                            <p style={{ fontSize: '0.78rem', color: '#2d3436', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Per-activity averages</p>
                                            {allCw.map(cw => {
                                                const subs = cw.submissions || [];
                                                const pcts = subs.map(s => s.total > 0 ? Math.round((s.score / s.total) * 100) : 0);
                                                const avg2 = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
                                                return (
                                                    <div key={cw.id} style={{ padding: '11px 14px', background: 'white', borderRadius: '10px', border: '1px solid #eee' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                                                            <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#2d3436', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>{cw.title}</span>
                                                            <span style={{ fontWeight: '800', fontSize: '0.95rem', color: avg2 !== null ? scoreColor(avg2) : '#ccc', flexShrink: 0, marginLeft: '10px' }}>{avg2 !== null ? `${avg2}%` : '—'}</span>
                                                        </div>
                                                        <div style={{ height: '6px', background: '#e9ecef', borderRadius: '99px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${avg2 ?? 0}%`, background: avg2 !== null ? scoreColor(avg2) : '#ddd', borderRadius: '99px' }}></div>
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', color: '#2d3436', marginTop: '5px' }}>{subs.length} submission{subs.length !== 1 ? 's' : ''}</div>
                                                    </div>
                                                );
                                            })}
                                            {allCw.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#ccc' }}>No activities yet.</div>}
                                        </>
                                    )}

                                    {/* ── PARTICIPATION modal ── */}
                                    {analysisModal.type === 'participation' && (
                                        <>
                                            {/* submitted */}
                                            <p style={{ fontSize: '0.78rem', color: '#4facfe', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted ({studentData.filter(s => s.submitted > 0).length})</p>
                                            {studentData.filter(s => s.submitted > 0).map(({ student, submitted, avg }) => {
                                                const name = student.fullname || student.username;
                                                return (
                                                    <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 13px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#2d3436', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                                                            <div style={{ fontSize: '0.72rem', color: '#888' }}>{submitted} / {allCw.length} activit{allCw.length !== 1 ? 'ies' : 'y'} submitted</div>
                                                        </div>
                                                        {avg !== null && <span style={{ fontSize: '0.85rem', fontWeight: '800', color: scoreColor(avg) }}>{avg}%</span>}
                                                        <i className="fas fa-check-circle" style={{ color: '#4facfe', fontSize: '1rem', flexShrink: 0 }}></i>
                                                    </div>
                                                );
                                            })}
                                            {/* not submitted */}
                                            {studentData.filter(s => s.submitted === 0).length > 0 && (
                                                <>
                                                    <p style={{ fontSize: '0.78rem', color: '#e74c3c', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '8px' }}>Not yet submitted ({studentData.filter(s => s.submitted === 0).length})</p>
                                                    {studentData.filter(s => s.submitted === 0).map(({ student }) => {
                                                        const name = student.fullname || student.username;
                                                        return (
                                                            <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 13px', background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '10px' }}>
                                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff0f0', color: '#e74c3c', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#888' }}>{name}</div>
                                                                    <div style={{ fontSize: '0.72rem', color: '#e74c3c' }}>No submissions yet</div>
                                                                </div>
                                                                <i className="fas fa-times-circle" style={{ color: '#e74c3c', fontSize: '1rem', flexShrink: 0 }}></i>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* ── AT RISK modal ── */}
                                    {analysisModal.type === 'atrisk' && (
                                        <>
                                            {studentData.filter(s => s.avg !== null && s.avg < 50).length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '30px' }}>
                                                    <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: '#1dd1a1', marginBottom: '12px', display: 'block' }}></i>
                                                    <p style={{ fontWeight: '700', color: '#888' }}>No at-risk students!</p>
                                                    <p style={{ fontSize: '0.82rem', color: '#2d3436', marginTop: '6px' }}>All students who have submitted are averaging 50% or above.</p>
                                                </div>
                                            ) : studentData.filter(s => s.avg !== null && s.avg < 50).map(({ student, avg, submitted, weakTopics }) => {
                                                const name = student.fullname || student.username;
                                                return (
                                                    <div key={student.id} style={{ padding: '13px 15px', background: '#fff8f8', border: '1px solid #fecaca', borderRadius: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: weakTopics.length > 0 ? '10px' : 0 }}>
                                                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#fff0f0', color: '#e74c3c', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: '700', color: '#2d3436', fontSize: '0.95rem' }}>{name}</div>
                                                                <div style={{ fontSize: '0.72rem', color: '#888' }}>{submitted} / {allCw.length} activities submitted</div>
                                                            </div>
                                                            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#e74c3c' }}>{avg}%</span>
                                                        </div>
                                                        {weakTopics.length > 0 && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                                <p style={{ fontSize: '0.72rem', color: '#e74c3c', fontWeight: '700', marginBottom: '2px' }}>MISSED QUESTIONS</p>
                                                                {weakTopics.slice(0, 3).map((w, wi) => (
                                                                    <div key={wi} style={{ fontSize: '0.8rem', color: '#7d3c3c', background: '#fff0f0', border: '1px solid #fecaca', borderRadius: '7px', padding: '6px 10px', display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                                                                        <i className="fas fa-times" style={{ color: '#e74c3c', marginTop: '2px', flexShrink: 0, fontSize: '0.75rem' }}></i>
                                                                        <span style={{ lineHeight: '1.4' }}>{w.question}</span>
                                                                    </div>
                                                                ))}
                                                                {weakTopics.length > 3 && <p style={{ fontSize: '0.72rem', color: '#2d3436', marginTop: '2px' }}>+{weakTopics.length - 3} more missed questions</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}

                                    {/* ── SCORE RANGE modal ── */}
                                    {analysisModal.type === 'range' && (
                                        <>
                                            {withAvg.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '30px', color: '#ccc' }}>No submissions yet.</div>
                                            ) : withAvg.map(({ student, avg, submitted }, i) => {
                                                const name = student.fullname || student.username;
                                                const isTop = i === 0;
                                                const isLast = i === withAvg.length - 1 && withAvg.length > 1;
                                                return (
                                                    <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: isTop ? '#f0fdf4' : isLast ? '#fff8f8' : '#f8f9fa', border: `1px solid ${isTop ? '#bbf7d0' : isLast ? '#fecaca' : '#eee'}`, borderRadius: '11px' }}>
                                                        {/* rank */}
                                                        <div style={{ width: '26px', textAlign: 'center', fontSize: i < 3 ? '1.1rem' : '0.85rem', color: '#2d3436', fontWeight: '700', flexShrink: 0 }}>
                                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                                        </div>
                                                        {/* avatar */}
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</div>
                                                        {/* name */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#2d3436', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                                                            <div style={{ fontSize: '0.72rem', color: '#888' }}>{submitted} activit{submitted !== 1 ? 'ies' : 'y'} submitted</div>
                                                        </div>
                                                        {/* avg pill + bar */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                                            <span style={{ fontSize: '1rem', fontWeight: '800', color: scoreColor(avg) }}>{avg}%</span>
                                                            <div style={{ width: '60px', height: '5px', background: '#e9ecef', borderRadius: '99px', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${avg}%`, background: scoreColor(avg), borderRadius: '99px' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* students who haven't submitted */}
                                            {studentData.filter(s => s.avg === null).length > 0 && (
                                                <>
                                                    <p style={{ fontSize: '0.78rem', color: '#2d3436', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>No submissions</p>
                                                    {studentData.filter(s => s.avg === null).map(({ student }) => {
                                                        const name = student.fullname || student.username;
                                                        return (
                                                            <div key={student.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'white', border: '1px solid #eee', borderRadius: '11px', opacity: 0.6 }}>
                                                                <div style={{ width: '26px', textAlign: 'center', fontSize: '0.85rem', color: '#ccc' }}>—</div>
                                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0f2f5', color: '#ccc', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '700', fontSize: '0.85rem' }}>{name.charAt(0).toUpperCase()}</div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#888' }}>{name}</div>
                                                                    <div style={{ fontSize: '0.72rem', color: '#ccc' }}>No submissions yet</div>
                                                                </div>
                                                                <span style={{ fontSize: '0.85rem', color: '#ccc', fontWeight: '700' }}>—</span>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </>
                                    )}

                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── performance table ── */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <i className="fas fa-table" style={{ color: '#6e45e2', fontSize: '1rem' }}></i>
                        <h3 style={{ margin: 0, color: '#2d3436', fontSize: '1.05rem', fontWeight: '800' }}>Student performance table</h3>
                    </div>
                    <p style={{ color: '#2d3436', fontSize: '0.83rem', margin: '0 0 20px 0' }}>Every student's score per activity, sorted best to worst.</p>
                    {allCw.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}><i className="fas fa-tasks" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>No activities posted yet.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f0f2f5' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.8rem', color: '#2d3436', fontWeight: '700', textTransform: 'uppercase', width: '180px' }}>Student</th>
                                        {allCw.map(cw => (
                                            <th key={cw.id} style={{ textAlign: 'center', padding: '10px 8px', fontSize: '0.75rem', color: '#2d3436', fontWeight: '700', maxWidth: '90px' }}>
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px' }} title={cw.title}>{cw.title.length > 12 ? cw.title.slice(0, 11) + '…' : cw.title}</div>
                                                <div style={{ fontSize: '0.65rem', color: cw.assessmentType === 'time_attack' ? '#f39c12' : '#e74c3c', fontWeight: '600', marginTop: '2px' }}>{cw.assessmentType === 'time_attack' ? 'Time Attack' : 'Quiz'}</div>
                                            </th>
                                        ))}
                                        <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: '0.8rem', color: '#6e45e2', fontWeight: '700', textTransform: 'uppercase' }}>Avg</th>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '0.8rem', color: '#2d3436', fontWeight: '700', textTransform: 'uppercase' }}>Weak areas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentData.map(({ student, actScores, avg, weakTopics }, si) => {
                                        const name = student.fullname || student.username;
                                        const isAtRisk = avg !== null && avg < 50;
                                        const topWeakTopics = weakTopics.slice(0, 2);
                                        return (
                                            <tr key={student.id} style={{ borderBottom: '1px solid #f0f2f5', background: si % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f3f0ff22'}
                                                onMouseLeave={e => e.currentTarget.style.background = si % 2 === 0 ? '#fff' : '#fafafa'}>
                                                <td style={{ padding: '12px 12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: student.avatarUrl ? 'transparent' : '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.85rem', fontWeight: '700', flexShrink: 0, backgroundImage: student.avatarUrl ? `url('${student.avatarUrl}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                                            {!student.avatarUrl && name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '700', color: '#2d3436', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>{name}</div>
                                                            {isAtRisk && <div style={{ fontSize: '0.65rem', color: '#e74c3c', fontWeight: '700' }}>⚠ At risk</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                {actScores.map((sc, ci) => (
                                                    <td key={ci} style={{ textAlign: 'center', padding: '12px 8px' }}>
                                                        {sc ? (
                                                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: scoreColor(sc.pct) }}>{sc.score}/{sc.total}</span>
                                                                <div style={{ width: '36px', height: '5px', background: '#f0f2f5', borderRadius: '99px', overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', width: `${sc.pct}%`, background: scoreColor(sc.pct), borderRadius: '99px' }}></div>
                                                                </div>
                                                            </div>
                                                        ) : <span style={{ fontSize: '0.82rem', color: '#ccc', fontWeight: '600' }}>—</span>}
                                                    </td>
                                                ))}
                                                <td style={{ textAlign: 'center', padding: '12px 12px' }}>
                                                    {avg !== null
                                                        ? <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fff', background: scoreColor(avg), padding: '4px 10px', borderRadius: '20px', display: 'inline-block' }}>{avg}%</span>
                                                        : <span style={{ color: '#ccc', fontSize: '0.85rem' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '12px 12px', maxWidth: '200px' }}>
                                                    {topWeakTopics.length > 0 ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {topWeakTopics.map((w, wi) => (
                                                                <span key={wi} title={`${w.activity}: ${w.question}`} style={{ fontSize: '0.7rem', background: '#fff0f0', color: '#c0392b', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '20px', fontWeight: '600', cursor: 'default', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                                    {w.question.length > 28 ? w.question.slice(0, 27) + '…' : w.question}
                                                                </span>
                                                            ))}
                                                            {weakTopics.length > 2 && <span style={{ fontSize: '0.7rem', background: '#f0f2f5', color: '#2d3436', padding: '3px 8px', borderRadius: '20px', fontWeight: '600' }}>+{weakTopics.length - 2} more</span>}
                                                        </div>
                                                    ) : avg !== null
                                                        ? <span style={{ fontSize: '0.78rem', color: '#1dd1a1', fontWeight: '700' }}>✓ No weak areas</span>
                                                        : <span style={{ fontSize: '0.78rem', color: '#ccc' }}>No submissions</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── student weak-topic breakdown (collapsible) ── */}
                <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <i className="fas fa-user-graduate" style={{ color: '#4facfe', fontSize: '1rem' }}></i>
                        <h3 style={{ margin: 0, color: '#2d3436', fontSize: '1.05rem', fontWeight: '800' }}>Student weak-topic breakdown</h3>
                    </div>
                    <p style={{ color: '#2d3436', fontSize: '0.83rem', margin: '0 0 20px 0' }}>Tap any student to expand the full list of questions they got wrong.</p>

                    {studentData.filter(s => s.weakTopics.length > 0).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                            <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', marginBottom: '10px', display: 'block', color: '#1dd1a1' }}></i>
                            <p style={{ fontWeight: '600' }}>No weak areas found — all students answered every question correctly!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {studentData.filter(s => s.weakTopics.length > 0).map(({ student, avg, weakTopics }) => {
                                const name = student.fullname || student.username;
                                const isOpen = expandedWeakStudents.has(student.id);
                                const isAtRisk = avg !== null && avg < 50;
                                return (
                                    <div key={student.id} style={{ border: `1px solid ${isAtRisk ? '#fecaca' : '#eee'}`, borderRadius: '12px', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>

                                        {/* ── clickable header row ── */}
                                        <div
                                            onClick={() => toggleWeakStudent(student.id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: isOpen ? '#f3f0ff' : isAtRisk ? '#fff8f8' : '#f8f9fa', cursor: 'pointer', transition: 'background 0.2s', borderBottom: isOpen ? '1px solid #e8e0ff' : 'none', userSelect: 'none' }}
                                            onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#f0eeff'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = isOpen ? '#f3f0ff' : isAtRisk ? '#fff8f8' : '#f8f9fa'; }}>

                                            {/* avatar */}
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: student.avatarUrl ? 'transparent' : '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.9rem', fontWeight: '700', flexShrink: 0, backgroundImage: student.avatarUrl ? `url('${student.avatarUrl}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                                {!student.avatarUrl && name.charAt(0).toUpperCase()}
                                            </div>

                                            {/* name + at-risk badge */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: '700', color: isOpen ? '#6e45e2' : '#2d3436', fontSize: '0.95rem', transition: 'color 0.2s' }}>{name}</div>
                                                {isAtRisk && <div style={{ fontSize: '0.65rem', color: '#e74c3c', fontWeight: '700', marginTop: '1px' }}>⚠ At risk</div>}
                                            </div>

                                            {/* avg pill */}
                                            {avg !== null && (
                                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#fff', background: avg >= 70 ? '#1dd1a1' : avg >= 50 ? '#f39c12' : '#e74c3c', padding: '3px 11px', borderRadius: '20px', flexShrink: 0 }}>{avg}% avg</span>
                                            )}

                                            {/* weak count pill */}
                                            <span style={{ fontSize: '0.75rem', color: '#e74c3c', background: '#fff0f0', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', flexShrink: 0 }}>
                                                {weakTopics.length} weak item{weakTopics.length !== 1 ? 's' : ''}
                                            </span>

                                            {/* chevron */}
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isOpen ? '#6e45e2' : '#eee', color: isOpen ? '#fff' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', fontSize: '0.8rem' }}>
                                                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
                                            </div>
                                        </div>

                                        {/* ── collapsible body ── */}
                                        {isOpen && (
                                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'white', animation: 'fadeIn 0.2s ease' }}>
                                                {weakTopics.map((w, wi) => (
                                                    <div key={wi} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 13px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '9px' }}>
                                                        <i className="fas fa-times-circle" style={{ color: '#e74c3c', marginTop: '2px', flexShrink: 0, fontSize: '0.9rem' }}></i>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.87rem', color: '#2d3436', fontWeight: '600', lineHeight: '1.5' }}>{w.question}</div>
                                                            <div style={{ fontSize: '0.73rem', color: '#2d3436', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                <i className="fas fa-book" style={{ fontSize: '0.65rem' }}></i> {w.activity}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── most-missed questions (collapsible) ── */}
                {hardestQuestions.length > 0 && (
                    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>

                        {/* clickable header */}
                        <div
                            onClick={() => setIsMostMissedOpen(o => !o)}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: isMostMissedOpen ? '#fff5f5' : '#f8f9fa', cursor: 'pointer', transition: 'background 0.2s', borderBottom: isMostMissedOpen ? '1px solid #fecaca' : 'none', userSelect: 'none' }}
                            onMouseEnter={e => { if (!isMostMissedOpen) e.currentTarget.style.background = '#feefef'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isMostMissedOpen ? '#fff5f5' : '#f8f9fa'; }}>

                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isMostMissedOpen ? '#e74c3c' : '#fff0f0', color: isMostMissedOpen ? '#fff' : '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, transition: 'all 0.2s' }}>
                                <i className="fas fa-fire"></i>
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '800', color: isMostMissedOpen ? '#c0392b' : '#2d3436', fontSize: '1.02rem', transition: 'color 0.2s' }}>Most-missed questions</div>
                                <div style={{ fontSize: '0.78rem', color: '#2d3436', marginTop: '2px' }}>{hardestQuestions.length} question{hardestQuestions.length !== 1 ? 's' : ''} flagged across all quizzes</div>
                            </div>

                            <span style={{ fontSize: '0.75rem', color: '#e74c3c', background: '#fff0f0', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', flexShrink: 0 }}>
                                {hardestQuestions.length} item{hardestQuestions.length !== 1 ? 's' : ''}
                            </span>

                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isMostMissedOpen ? '#e74c3c' : '#eee', color: isMostMissedOpen ? '#fff' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', fontSize: '0.8rem' }}>
                                <i className={`fas fa-chevron-${isMostMissedOpen ? 'up' : 'down'}`}></i>
                            </div>
                        </div>

                        {/* collapsible body */}
                        {isMostMissedOpen && (
                            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'white', animation: 'fadeIn 0.2s ease' }}>
                                <p style={{ color: '#2d3436', fontSize: '0.83rem', margin: '0 0 6px 0' }}>Questions with the highest wrong-answer rate — prioritise these in your next lesson.</p>
                                {hardestQuestions.map((q, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', background: q.missRate >= 70 ? '#fff5f5' : q.missRate >= 50 ? '#fffdf0' : '#f8f9fa', border: `1px solid ${q.missRate >= 70 ? '#fecaca' : q.missRate >= 50 ? '#fde68a' : '#eee'}`, borderRadius: '12px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: scoreColor(100 - q.missRate), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem', flexShrink: 0 }}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: '700', color: '#2d3436', fontSize: '0.9rem', marginBottom: '3px' }}>{q.question}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#888' }}>From: {q.activity} · {q.wrong}/{q.total} students missed it</div>
                                        </div>
                                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', minWidth: '80px' }}>
                                            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: scoreColor(100 - q.missRate) }}>{q.missRate}% missed</span>
                                            <div style={{ width: '80px', height: '6px', background: '#f0f2f5', borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${q.missRate}%`, background: scoreColor(100 - q.missRate), borderRadius: '99px' }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.68rem', color: '#2d3436', fontWeight: '600', textTransform: 'uppercase' }}>{diffLabel(100 - q.missRate)} topic</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        );
    };

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
                        <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#888' }}>{room?.teacherFullName || room?.teacher}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '20px', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                        <h3 style={{ margin: 0, color: '#4facfe' }}>Students ({students.length})</h3>
                        {students.length > 0 && (
                            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}></i>
                                <input type="text" placeholder="Search students..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 35px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }} />
                            </div>
                        )}
                    </div>
                    {students.length === 0 ? (<p style={{ color: '#2d3436', textAlign: 'center', padding: '20px 0' }}>Student list will appear here once they join the class.</p>)
                    : filteredStudents.length === 0 ? (<p style={{ color: '#2d3436', textAlign: 'center', padding: '20px 0' }}>No students found matching your search.</p>)
                    : (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            {filteredStudents.map(student => (
                                <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px', background: 'white', border: '1px solid #eee', borderRadius: '12px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#d7ccff'} onMouseLeave={e => e.currentTarget.style.borderColor = '#eee'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: student.avatarUrl ? 'transparent' : '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', backgroundImage: student.avatarUrl ? `url('${student.avatarUrl}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                            {!student.avatarUrl && <i className="fas fa-user"></i>}
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#888' }}>{student.fullname || student.username}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button onClick={(e) => { e.preventDefault(); openAnalyticsModal(student); }} style={{ background: '#f3f0ff', border: 'none', color: '#6e45e2', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.2s' }} title="View Analytics" onMouseEnter={e => { e.currentTarget.style.background = '#6e45e2'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f3f0ff'; e.currentTarget.style.color = '#6e45e2'; }}>
                                            <i className="fas fa-chart-line"></i> Analytics
                                        </button>
                                        <button onClick={(e) => { e.preventDefault(); promptRemoveStudent(student.id, student.fullname || student.username); }} style={{ background: '#fff0f0', border: 'none', color: '#e74c3c', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s', fontSize: '1rem' }} title="Remove Student" onMouseEnter={e => { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff0f0'; e.currentTarget.style.color = '#e74c3c'; }}>
                                            <i className="fas fa-user-minus"></i>
                                        </button>
                                    </div>
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
                <h2 style={{ color: '#888' }}>Entering Classroom...</h2>
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
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
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
                    <li className={activeTab === 'analysis' ? 'active' : ''} onClick={() => setActiveTab('analysis')}><i className="fas fa-microscope"></i> <span>Analysis</span></li>
                </ul>
                <div style={{ width: '130px' }}></div>
            </nav>

            <main className="room-container" style={{ position: 'relative', zIndex: 1, padding: '30px 20px 50px 20px', maxWidth: '1200px', margin: '0 auto' }}>
                <div className="modern-room-header" style={{ background: roomColorPresets.find(c => c.id === (room.colorTheme || 'purple'))?.bg }}>
                    <div className="header-info">
                        {activeTab === 'members' ? (<><h1>Class Members</h1><p>View who students are in this class here.</p></>) : activeTab === 'activities' ? (<><h1>Class Activities</h1><p>Assign a quiz or create a new activity here.</p></>) : activeTab === 'analysis' ? (<><h1>Item Analysis</h1><p>See every student's strengths, weaknesses, and gaps.</p></>) : (<><h1>{room.section}</h1><p>{room.grade}</p></>)}
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
                    <i className={`fas ${activeTab === 'members' ? 'fa-users' : activeTab === 'activities' ? 'fa-tasks' : activeTab === 'analysis' ? 'fa-microscope' : 'fa-flask'}`} style={{ position: 'absolute', right: '-20px', bottom: '-40px', fontSize: '14rem', opacity: 0.1, transform: 'rotate(-15deg)' }}></i>
                </div>

                <div className="modern-feed-container">
                    {activeTab === 'activities' && (
                        <div className="classwork-summary-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 25px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #eee', marginBottom: '10px', flexWrap: 'wrap', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: '#fcf3f2', color: '#e74c3c', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}><i className="fas fa-tasks"></i></div>
                                    <div><p style={{ margin: 0, color: '#2d3436', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Generated Quizzes</p><p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#888' }}>{classwork.filter(cw => cw.assessmentType === 'custom').length}</p></div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: '#fffdf7', color: '#f39c12', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}><i className="fas fa-stopwatch"></i></div>
                                    <div><p style={{ margin: 0, color: '#2d3436', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Time Attacks</p><p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#888' }}>{classwork.filter(cw => cw.assessmentType === 'time_attack').length}</p></div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '2px solid #f0f2f5', paddingLeft: '30px' }}>
                                    <div><p style={{ margin: 0, color: '#2d3436', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Total Activities</p><p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: '#6e45e2' }}>{classwork.length}</p></div>
                                </div>
                            </div>
                            <button className="btn-primary" onClick={() => setIsCwModalOpen(true)} style={{ borderRadius: '12px' }}><i className="fas fa-plus"></i> Create</button>
                        </div>
                    )}
                    {activeTab === 'feed' && renderFeed()}
                    {activeTab === 'activities' && renderActivities()}
                    {activeTab === 'members' && renderMembers()}
                    {activeTab === 'analysis' && renderAnalysis()}
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
                                    <div style={{ marginLeft: '60px', padding: '10px 15px', background: 'white', border: '1px solid #e1e1e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 'calc(100% - 60px)', boxSizing: 'border-box' }}>
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
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: '#2d3436', textTransform: 'uppercase' }}>1. Basic Information</label>
                                            <div className="input-group" style={{ marginBottom: '12px' }}><input type="text" value={cwTitle} onChange={e => setCwTitle(e.target.value)} placeholder="Assessment Title (e.g., Chapter 1 Quiz)" required /></div>
                                            <div className="input-group"><textarea value={cwDesc} onChange={e => setCwDesc(e.target.value)} rows="3" placeholder="Instructions (Optional)"></textarea></div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: '#2d3436', textTransform: 'uppercase' }}>2. Assessment Type</label>
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
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: '#2d3436', textTransform: 'uppercase' }}>3. Schedule & Limits <span style={{ fontWeight: '400', color: '#bbb', fontSize: '0.8rem' }}>(optional)</span></label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {assessmentType === 'custom' && (
                                                <div style={{ background: 'white', borderRadius: '10px', padding: '12px 14px', border: '1px solid #eee' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <i className="fas fa-hourglass-half" style={{ color: '#6e45e2', fontSize: '0.9rem' }}></i>
                                                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#888' }}>Time Limit</span>
                                                        <span style={{ fontSize: '0.75rem', color: '#888' }}>— how long students have to finish</span>
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
                                                        <span style={{ color: '#2d3436', fontSize: '0.85rem' }}>minutes</span>
                                                        {cwTimeLimit && <button type="button" onClick={() => setCwTimeLimit('')} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}><i className="fas fa-times"></i> clear</button>}
                                                    </div>
                                                </div>
                                                )}
                                                <div style={{ background: 'white', borderRadius: '10px', padding: '12px 14px', border: '1px solid #eee' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <i className="fas fa-calendar-alt" style={{ color: '#e74c3c', fontSize: '0.9rem' }}></i>
                                                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#888' }}>Deadline</span>
                                                        <span style={{ fontSize: '0.75rem', color: '#888' }}>— last day/time to submit</span>
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
                                                        <span style={{ fontWeight: '700', fontSize: '1.05rem', color: '#888' }}>Upload a PDF or paste your lesson</span>
                                                    </div>
                                                    <p style={{ color: '#2d3436', fontSize: '0.85rem', marginBottom: '20px', marginTop: 0 }}>The AI will instantly generate multiple-choice questions from your material.</p>

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
                                                        <span style={{ color: '#2d3436', fontSize: '0.85rem', fontWeight: '600' }}>or paste text</span>
                                                        <div style={{ flex: 1, height: '1px', background: '#e1e1e1' }}></div>
                                                    </div>

                                                    <textarea value={aiLessonText} onChange={e => setAiLessonText(e.target.value)} placeholder="Paste your lesson, module, or notes here..." rows="5" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d7ccff', resize: 'vertical', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', marginBottom: '16px', background: 'white', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#6e45e2'} onBlur={e => e.target.style.borderColor = '#d7ccff'} />

                                                    <div style={{ marginBottom: '20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                            <label style={{ color: '#2d3436', fontWeight: '600', fontSize: '0.9rem' }}>Question Types & Count:</label>
                                                            <span style={{ background: (countMC + countTF + countID + countFB) > 50 ? '#fff0f0' : '#f3f0ff', color: (countMC + countTF + countID + countFB) > 50 ? '#e74c3c' : '#6e45e2', fontWeight: 800, fontSize: '0.85rem', padding: '3px 12px', borderRadius: '20px', border: `1px solid ${(countMC + countTF + countID + countFB) > 50 ? '#fecaca' : '#d7ccff'}` }}>
                                                                Total: {countMC + countTF + countID + countFB} / 50 (Maximum)
                                                            </span>
                                                        </div>
                                                        {(countMC + countTF + countID + countFB) > 50 && (
                                                            <div style={{ fontSize: '0.75rem', color: '#e74c3c', background: '#fff0f0', padding: '6px 12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <i className="fas fa-exclamation-triangle"></i> Maximum 50 questions total. Please reduce the count.
                                                            </div>
                                                        )}
                                                        {[
                                                            { label: 'Multiple Choice', icon: 'fa-list',      color: '#6e45e2', bg: '#f3f0ff', count: countMC, set: setCountMC },
                                                            { label: 'True or False',   icon: 'fa-toggle-on', color: '#1dd1a1', bg: '#e3fdf5', count: countTF, set: setCountTF },
                                                            { label: 'Identification',  icon: 'fa-lightbulb', color: '#f39c12', bg: '#fff7e0', count: countID, set: setCountID },
                                                            { label: 'Fill in the Blank', icon: 'fa-pen',    color: '#4facfe', bg: '#eaf4ff', count: countFB, set: setCountFB },
                                                        ].map(type => (
                                                            <div key={type.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: type.count > 0 ? type.bg : '#f8f9fa', borderRadius: '10px', border: `1.5px solid ${type.count > 0 ? type.color + '55' : '#eee'}`, marginBottom: '8px', transition: 'all 0.2s' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <i className={`fas ${type.icon}`} style={{ color: type.count > 0 ? type.color : '#bbb', fontSize: '0.9rem', width: '16px' }}></i>
                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: type.count > 0 ? '#2d3436' : '#aaa' }}>{type.label}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <button type="button" onClick={() => type.set(v => Math.max(0, v - 1))} style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontWeight: 800, color: '#555', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="50"
                                                                        value={type.count}
                                                                        onChange={e => {
                                                                            const val = Math.min(50, Math.max(0, parseInt(e.target.value) || 0));
                                                                            const otherTotal = (countMC + countTF + countID + countFB) - type.count;
                                                                            type.set(Math.min(val, 50 - otherTotal < 0 ? 0 : 50 - otherTotal));
                                                                        }}
                                                                        style={{ width: '44px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: type.count > 0 ? type.color : '#bbb', border: '1px solid #ddd', borderRadius: '6px', padding: '3px 4px', outline: 'none', MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'textfield' }}
                                                                    />
                                                                    <button type="button" onClick={() => { const otherTotal = (countMC + countTF + countID + countFB) - type.count; if (type.count < 50 && otherTotal + type.count < 50) type.set(v => v + 1); }} style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontWeight: 800, color: '#555', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {!aiGenerated && (
                                                        <button type="button" className="ai-generate-btn" onClick={handleGenerateAiQuiz} disabled={isAiGenerating || (!aiPdfFile && !aiLessonText.trim()) || (countMC + countTF + countID + countFB) === 0 || (countMC + countTF + countID + countFB) > 50}>
                                                            <i className="fas fa-magic"></i> Generate Quiz with AI
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                                    <i className="fas fa-magic fa-spin" style={{ fontSize: '3.5rem', color: '#6e45e2', marginBottom: '20px', display: 'block' }}></i>
                                                    <h3 style={{ color: '#2d3436', marginBottom: '10px' }}>Generating your chemistry quiz...</h3>
                                                    <p style={{ color: '#2d3436', maxWidth: '400px', margin: '0 auto 30px' }}>Our AI is analyzing your material and crafting {countMC + countTF + countID + countFB} mixed questions just for your class.</p>
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
                                                <button type="button" onClick={resetAiState} style={{ background: 'white', border: '1px solid #d1fae5', color: '#16a34a', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}><i className="fas fa-redo"></i> Regenerate</button>
                                            </div>
                                            {quizQuestions.map((q, qIndex) => (
                                                <div key={q.id || qIndex} className="ai-question-card" style={{ marginBottom: '14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '26px', height: '26px', background: '#f3f0ff', color: '#6e45e2', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '800', flexShrink: 0, marginTop: '8px' }}>{qIndex + 1}</span>
                                                        <div style={{ flex: 1 }}>
                                                            {(() => {
                                                                const typeMap = { mc: { label: 'Multiple Choice', color: '#6e45e2', bg: '#f3f0ff' }, tf: { label: 'True or False', color: '#1dd1a1', bg: '#e3fdf5' }, identification: { label: 'Identification', color: '#f39c12', bg: '#fff7e0' }, fillblank: { label: 'Fill in the Blank', color: '#4facfe', bg: '#eaf4ff' } };
                                                                const t = typeMap[q.type || 'mc'] || typeMap.mc;
                                                                return <span style={{ fontSize: '10px', fontWeight: 700, color: t.color, background: t.bg, padding: '2px 8px', borderRadius: '20px', border: `1px solid ${t.color}44`, marginBottom: '6px', display: 'inline-block' }}>{t.label}</span>;
                                                            })()}
                                                            <textarea value={q.question} onChange={e => handleQuestionChange(qIndex, 'question', e.target.value)} rows={2} placeholder="Question text..."
                                                                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e1e1e1', borderRadius: '9px', fontSize: '0.95rem', fontWeight: '600', color: '#2d3436', background: '#fff', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: '1.5', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                                                onFocus={e => e.target.style.borderColor = '#6e45e2'} onBlur={e => e.target.style.borderColor = '#e1e1e1'} />
                                                        </div>
                                                        {quizQuestions.length > 1 && (
                                                            <button type="button" onClick={() => removeQuestion(qIndex)} title="Remove" style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1rem', padding: '6px', borderRadius: '6px', flexShrink: 0, marginTop: '4px', opacity: 0.7 }}
                                                                onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Multiple Choice */}
                                                    {(q.type === 'mc' || !q.type) && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {q.options.map((opt, oIndex) => {
                                                                const isCorrect = q.correctOption === oIndex;
                                                                return (
                                                                    <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '9px', background: isCorrect ? '#f0fdf4' : '#f8f9fa', border: isCorrect ? '2px solid #1dd1a1' : '1px solid #e1e1e1', transition: 'all 0.2s' }}>
                                                                        <button type="button" onClick={() => handleQuestionChange(qIndex, 'correctOption', oIndex)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                                                                            {isCorrect ? <i className="fas fa-check-circle" style={{ color: '#1dd1a1', fontSize: '1.1rem' }}></i> : <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid #ccc', display: 'inline-block' }}></span>}
                                                                        </button>
                                                                        <span style={{ width: '22px', height: '22px', borderRadius: '5px', background: isCorrect ? '#1dd1a1' : '#ddd', color: isCorrect ? '#fff' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', flexShrink: 0 }}>{['A','B','C','D'][oIndex]}</span>
                                                                        <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Choice ${['A','B','C','D'][oIndex]}...`}
                                                                            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.9rem', color: isCorrect ? '#15803d' : '#555', fontWeight: isCorrect ? '600' : '400', outline: 'none', fontFamily: 'inherit' }} />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* True or False */}
                                                    {q.type === 'tf' && (
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            {['True', 'False'].map((opt, oIndex) => {
                                                                const isCorrect = q.correctOption === oIndex;
                                                                return (
                                                                    <button key={oIndex} type="button" onClick={() => handleQuestionChange(qIndex, 'correctOption', oIndex)}
                                                                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: isCorrect ? `2px solid ${oIndex === 0 ? '#1dd1a1' : '#e74c3c'}` : '1.5px solid #e1e1e1', background: isCorrect ? (oIndex === 0 ? '#f0fdf4' : '#fff0f0') : '#f8f9fa', fontWeight: 700, fontSize: '0.95rem', color: isCorrect ? (oIndex === 0 ? '#15803d' : '#c0392b') : '#888', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                        {isCorrect && <i className="fas fa-check-circle"></i>}
                                                                        {opt}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Identification / Fill in the Blank */}
                                                    {(q.type === 'identification' || q.type === 'fillblank') && (
                                                        <div>
                                                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#888', marginBottom: '5px', display: 'block' }}>
                                                                {q.type === 'fillblank' ? 'Word/value that fills the blank:' : 'Correct answer:'}
                                                            </label>
                                                            <input type="text" value={q.answer || ''} onChange={e => handleQuestionChange(qIndex, 'answer', e.target.value)}
                                                                placeholder={q.type === 'fillblank' ? 'e.g. 6' : 'e.g. Sodium'}
                                                                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e1e1e1', borderRadius: '9px', fontSize: '0.95rem', fontWeight: 600, color: '#2d3436', background: '#f8f9fa', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                                                onFocus={e => e.target.style.borderColor = '#6e45e2'} onBlur={e => e.target.style.borderColor = '#e1e1e1'} />
                                                            <small style={{ color: '#aaa', fontSize: '0.7rem', marginTop: '4px', display: 'block' }}>Case-insensitive match.</small>
                                                        </div>
                                                    )}
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
                                    <div style={{ marginLeft: '60px', padding: '10px 15px', background: 'white', border: '1px solid #e1e1e1', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 'calc(100% - 60px)', boxSizing: 'border-box' }}>
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
                            <h2 style={{ margin: 0, color: '#888' }}><i className="fas fa-chart-bar" style={{ color: '#4facfe', marginRight: '10px' }}></i> Submissions</h2>
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
                                    <div key={idx} style={{ background: 'white', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
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
                                                    <span style={{ fontSize: '0.8rem', color: '#2d3436', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>
                                                        {selectedReportCw.assessmentType === 'time_attack' ? 'Correct / Answered' : 'Score'}
                                                    </span>
                                                </div>
                                                {(selectedReportCw.assessmentType === 'custom' || selectedReportCw.assessmentType === 'time_attack') && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: expandedStudentId === sub.studentId ? '#fff' : '#4facfe', background: expandedStudentId === sub.studentId ? '#4facfe' : '#eaf4ff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.2s' }}>View Details <i className={`fas fa-chevron-${expandedStudentId === sub.studentId ? 'up' : 'down'}`}></i></div>
                                                )}
                                            </div>
                                        </div>
                                        {expandedStudentId === sub.studentId && selectedReportCw.assessmentType === 'custom' && (
                                            <div style={{ padding: '20px', borderTop: '1px solid #eee', background: '#fff' }}>
                                                <h4 style={{ margin: '0 0 15px 0', color: '#888' }}>Detailed Breakdown</h4>
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
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                    <h4 style={{ margin: 0, color: '#888' }}>Performance Summary</h4>
                                                    <span style={{ fontSize: '0.78rem', color: '#2d3436', background: 'white', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <i className="fas fa-lock"></i> Final attempt — one try only
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '20px' }}>
                                                    <div style={{ flex: 1, padding: '15px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}><i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#16a34a', marginBottom: '10px' }}></i><h3 style={{ margin: 0, color: '#16a34a', fontSize: '1.5rem' }}>{sub.score}</h3><p style={{ margin: 0, color: '#15803d', fontWeight: '600' }}>Correct Answers</p></div>
                                                    <div style={{ flex: 1, padding: '15px', borderRadius: '12px', background: '#fff0f0', border: '1px solid #fecaca', textAlign: 'center' }}><i className="fas fa-times-circle" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '10px' }}></i><h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.5rem' }}>{sub.wrong || 0}</h3><p style={{ margin: 0, color: '#b91c1c', fontWeight: '600' }}>Wrong Answers</p></div>
                                                    <div style={{ flex: 1, padding: '15px', borderRadius: '12px', background: 'white', border: '1px solid #eee', textAlign: 'center' }}><i className="fas fa-list-ol" style={{ fontSize: '2rem', color: '#6e45e2', marginBottom: '10px' }}></i><h3 style={{ margin: 0, color: '#2d3436', fontSize: '1.5rem' }}>{sub.total}</h3><p style={{ margin: 0, color: '#2d3436', fontWeight: '600' }}>Total Answered</p></div>
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

            {/* ── Student Analytics Modal ── */}
            {isAnalyticsModalOpen && analyticsStudent && (() => {
                const history = getStudentActivityHistory(analyticsStudent.id);
                const studentName = analyticsStudent.fullname || analyticsStudent.username;

                // recharts wants a flat array of plain objects — reuse the same
                // history data, just labeled for the chart's axes/tooltip.
                const lineChartData = history.map((h, i) => ({
                    name: `#${i + 1}`,
                    title: h.title,
                    percent: h.percent,
                    score: h.score,
                    total: h.total,
                }));
                const recentHistory = history.slice(-8);
                const barChartData = recentHistory.map(h => ({
                    title: h.title.length > 12 ? h.title.slice(0, 11) + '…' : h.title,
                    fullTitle: h.title,
                    score: h.score,
                    total: h.total,
                    percent: h.percent,
                }));

                // --- App-wide progress ---
                const learnedCount = (analyticsStudent.learnedElements || []).length;
                const compoundsCount = (analyticsStudent.discoveredCompounds || []).length;
                const elementsPct = Math.min(100, Math.round((learnedCount / 118) * 100));
                const compoundsPct = Math.min(100, Math.round((compoundsCount / 37) * 100));

                return (
                    <div className="modal-container show" style={{ zIndex: 10004 }} onClick={() => setIsAnalyticsModalOpen(false)}>
                        <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            <button className="close-modal" onClick={() => setIsAnalyticsModalOpen(false)}>&times;</button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: analyticsStudent.avatarUrl ? 'transparent' : '#eaf4ff', color: '#4facfe', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.4rem', backgroundImage: analyticsStudent.avatarUrl ? `url('${analyticsStudent.avatarUrl}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }}>
                                    {!analyticsStudent.avatarUrl && <i className="fas fa-user"></i>}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, color: '#888' }}>{studentName}</h2>
                                    <p style={{ margin: 0, color: '#2d3436', fontSize: '0.9rem' }}>Student Analytics — {room?.section}</p>
                                </div>
                            </div>

                            {/* --- This Room's Activity Performance --- */}
                            <h3 style={{ color: '#6e45e2', borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', marginBottom: '18px' }}>
                                <i className="fas fa-chart-line"></i> Activity Performance in This Room
                            </h3>

                            {history.length === 0 ? (
                                <p style={{ color: '#2d3436', textAlign: 'center', padding: '20px 0' }}>This student hasn't submitted any activities in this room yet.</p>
                            ) : (
                                <>
                                    <p style={{ color: '#2d3436', fontSize: '0.85rem', marginTop: 0, marginBottom: '8px' }}>Score trend over time (%)</p>
                                    <div style={{ width: '100%', minWidth: '300px', height: 220, marginBottom: '10px' }}>
                                        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={220} initialDimension={{ width: 520, height: 220 }}>
                                            <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} />
                                                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} width={36} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '10px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontSize: '0.85rem' }}
                                                    formatter={(value, name, props) => [`${props.payload.score}/${props.payload.total} (${value}%)`, props.payload.title]}
                                                    labelFormatter={() => ''}
                                                />
                                                <Line type="monotone" dataKey="percent" stroke="#6e45e2" strokeWidth={2.5} dot={{ r: 4, fill: '#6e45e2', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <p style={{ color: '#2d3436', fontSize: '0.85rem', marginBottom: '8px' }}>Score per activity{history.length > 8 ? ' (most recent 8)' : ''}</p>
                                    <div style={{ width: '100%', minWidth: '300px', height: 200, marginBottom: '20px' }}>
                                        <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200} initialDimension={{ width: 520, height: 200 }}>
                                            <BarChart data={barChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                                                <XAxis dataKey="title" tick={{ fontSize: 10, fill: '#aaa' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
                                                <YAxis tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} width={30} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '10px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', fontSize: '0.85rem' }}
                                                    formatter={(value, name, props) => [`${props.payload.score}/${props.payload.total} (${props.payload.percent}%)`, 'Score']}
                                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullTitle || label}
                                                />
                                                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                                    {barChartData.map((entry, index) => (
                                                        <Cell key={index} fill={entry.percent < 50 ? '#ff6b6b' : '#1dd1a1'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            )}

                            {/* --- App-Wide Progress --- */}
                            <h3 style={{ color: '#4facfe', borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', marginBottom: '18px' }}>
                                <i className="fas fa-seedling"></i> Overall App Progress
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '5px' }}>
                                        <span style={{ color: '#2d3436', fontWeight: '600' }}><i className="fas fa-atom" style={{ color: '#f1c40f' }}></i> Elements Learned</span>
                                        <span style={{ color: '#888' }}>{learnedCount}/118</span>
                                    </div>
                                    <div style={{ height: '10px', background: '#f0f2f5', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${elementsPct}%`, background: 'linear-gradient(90deg, #f1c40f, #f39c12)', borderRadius: '99px' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '5px' }}>
                                        <span style={{ color: '#2d3436', fontWeight: '600' }}><i className="fas fa-vial" style={{ color: '#1dd1a1' }}></i> Compounds Found</span>
                                        <span style={{ color: '#888' }}>{compoundsCount}/37</span>
                                    </div>
                                    <div style={{ height: '10px', background: '#f0f2f5', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${compoundsPct}%`, background: 'linear-gradient(90deg, #1dd1a1, #10ac84)', borderRadius: '99px' }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* --- Game Best Scores --- */}
                            <h3 style={{ color: '#ff6b6b', borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', marginBottom: '18px' }}>
                                <i className="fas fa-gamepad"></i> Game Best Scores
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                                <div style={{ background: '#fff0f0', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                                    <i className="fas fa-stopwatch" style={{ color: '#ff6b6b', fontSize: '1.3rem', marginBottom: '6px' }}></i>
                                    <div style={{ fontWeight: '800', fontSize: '1.3rem', color: '#888' }}>{analyticsStudent.timeAttackBestCorrect ?? 0}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>Time Attack pts</div>
                                </div>
                                <div style={{ background: '#eaf4ff', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                                    <i className="fas fa-puzzle-piece" style={{ color: '#4facfe', fontSize: '1.3rem', marginBottom: '6px' }}></i>
                                    <div style={{ fontWeight: '800', fontSize: '1.3rem', color: '#888' }}>{analyticsStudent.matchingGameBestScore > 0 ? analyticsStudent.matchingGameBestScore : '—'}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>Matching moves</div>
                                </div>
                                <div style={{ background: '#f3f0ff', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                                    <i className="fas fa-brain" style={{ color: '#6e45e2', fontSize: '1.3rem', marginBottom: '6px' }}></i>
                                    <div style={{ fontWeight: '800', fontSize: '1.3rem', color: '#888' }}>{analyticsStudent.compoundRecallBestScore ?? 0}/8</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>Compound Recall</div>
                                </div>
                                <div style={{ background: 'white', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                                    <i className="fas fa-th" style={{ color: '#2d3436', fontSize: '1.3rem', marginBottom: '6px' }}></i>
                                    <div style={{ fontWeight: '800', fontSize: '1.3rem', color: '#888' }}>{analyticsStudent.puzzlesCompleted ?? 0}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>Puzzles done</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
                                <button onClick={() => setPreviewAttachment(null)} style={{ background: 'transparent', border: 'none', color: '#2d3436', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1, padding: '0 5px' }}>&times;</button>
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
                                <iframe src={previewAttachment.url} title={previewAttachment.name} width="100%" height="100%" style={{ border: 'none', opacity: isPreviewLoading ? 0 : 1, transition: 'opacity 0.3s', position: 'relative', zIndex: 2, background: '#fff' }} onLoad={() => setIsPreviewLoading(false)}></iframe>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Link Modal ── */}
            {isLinkModalOpen && (
                <div className="modal-container show" style={{ zIndex: 1100 }} onClick={() => setIsLinkModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '15px', color: '#888' }}><i className="fas fa-link" style={{ color: '#4facfe', marginRight: '10px' }}></i>Add Link</h2>
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
                        <h2 style={{ marginBottom: '10px', color: '#888' }}>Not Chemistry-Related</h2>
                        <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                            {aiError || 'The uploaded material does not appear to be related to chemistry. Please upload a chemistry lesson or module only.'}
                        </p>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '12px 16px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-info-circle" style={{ color: '#6e45e2', fontSize: '1rem', flexShrink: 0 }}></i>
                            <span style={{ color: '#2d3436', fontSize: '0.85rem', textAlign: 'left' }}>Accepted topics: elements, compounds, reactions, periodic table, atoms, molecules, acids & bases, lab procedures, and more.</span>
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
