import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import './TeacherDashboard.css'; 
import { collection, query, where, doc, setDoc, onSnapshot, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { deleteUser, updateEmail } from 'firebase/auth';

const generateEmojiAvatar = (emoji) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 200, 200);
    gradient.addColorStop(0, '#f3f0ff');
    gradient.addColorStop(1, '#eaf4ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 200);
    ctx.font = '100px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 100, 110);
    return canvas.toDataURL('image/png');
};

const getCroppedImg = (imageSrc, pixelCrop) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const targetSize = 200;
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                targetSize,
                targetSize
            );
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        image.onerror = (error) => reject(error);
    });
};

export default function TeacherDashboard() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoomSection, setNewRoomSection] = useState('');
    const [newRoomGrade, setNewRoomGrade] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [resultModal, setResultModal] = useState({ show: false, title: '', message: '', type: 'info' });
    const menuRef = useRef(null);
    
    const userName = sessionStorage.getItem('loggedInUser') || 'Teacher';
    const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem(`userAvatar_${userName}`) || '');
    const [editedAvatarUrl, setEditedAvatarUrl] = useState('');
    const [editedFullName, setEditedFullName] = useState(sessionStorage.getItem('userFullname') || '');
    const fileInputRef = useRef(null);
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    
    // Cropper State
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    useEffect(() => {
        if (!userName) return;

        // Fetch user's avatar from cloud
        const userRef = doc(db, "users", userName);
        const unsubscribeUser = onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.avatarUrl !== undefined) {
                    if (data.avatarUrl === '') localStorage.removeItem(`userAvatar_${userName}`);
                    else localStorage.setItem(`userAvatar_${userName}`, data.avatarUrl);
                    setAvatarUrl(data.avatarUrl);
                }
            }
        });

        const q = query(collection(db, "teacher_rooms"), where("teacher", "==", userName));
        const unsubscribeRooms = onSnapshot(q, (querySnapshot) => {
            const myRooms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRooms(myRooms);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching rooms: ", error);
            setIsLoading(false);
        });

        return () => {
            unsubscribeUser();
            unsubscribeRooms();
        };
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
            
            setIsCreateModalOpen(false); // Close modal
            setNewRoomSection(''); // Reset inputs
            setNewRoomGrade('');
        } catch (error) {
            console.error("Error creating room: ", error);
            alert("Failed to create room. Please try again.");
        }
    };

    // Effect to close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    // Prevent background scrolling when modal or menu is open
    useEffect(() => {
        if (isMenuOpen || isLogoutModalOpen || isCreateModalOpen || isProfileModalOpen || isSettingsModalOpen || isDeleteModalOpen || resultModal.show) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => document.body.style.overflow = '';
    }, [isMenuOpen, isLogoutModalOpen, isCreateModalOpen, isProfileModalOpen, isSettingsModalOpen, isDeleteModalOpen, resultModal.show]);

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/'); // Use React Router to navigate instead of window.location.href
    };

    const openEditProfile = () => {
        setEditedAvatarUrl(avatarUrl);
        setEditedFullName(sessionStorage.getItem('userFullname') || userName);
        setSelectedEmoji(null);
        setIsProfileModalOpen(true);
        setIsMenuOpen(false);
    };

    const handleAvatarClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCropImageSrc(event.target.result);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setSelectedEmoji(null);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels), []);

    const handleCropApply = async () => {
        try {
            const croppedImage = await getCroppedImg(cropImageSrc, croppedAreaPixels);
            setEditedAvatarUrl(croppedImage);
            setCropImageSrc(null);
        } catch (e) { console.error("Error cropping image:", e); }
    };

    const handleProfileUpdate = async () => {
        try {
            const userRef = doc(db, "users", userName);
            const updates = {};
            let avatarChanged = false;
            
            if (editedAvatarUrl !== avatarUrl) {
                if (editedAvatarUrl === '') localStorage.removeItem(`userAvatar_${userName}`);
                else localStorage.setItem(`userAvatar_${userName}`, editedAvatarUrl);
                setAvatarUrl(editedAvatarUrl);
                updates.avatarUrl = editedAvatarUrl;
                avatarChanged = true;
            }

            let nameChanged = false;
            const newFullName = editedFullName.trim();
            if (newFullName !== '' && newFullName !== sessionStorage.getItem('userFullname')) {
                nameChanged = true;
            }

            if (nameChanged) {
                const newEmail = `${newFullName.replace(/\s+/g, '').toLowerCase()}@atomarix.com`;

                // 1. Check if new name is already taken
                const newDocRef = doc(db, "users", newFullName);
                const newDocSnap = await getDoc(newDocRef);
                if (newDocSnap.exists() && newFullName !== userName) {
                    setResultModal({ show: true, title: 'Error', message: 'This Full Name is already taken.', type: 'error' });
                    return;
                }

                // 2. Update Firebase Auth Email
                if (auth.currentUser) {
                    try {
                        await updateEmail(auth.currentUser, newEmail);
                    } catch (error) {
                        if (error.code === 'auth/requires-recent-login') {
                            setResultModal({ show: true, title: 'Re-authentication Required', message: 'For security reasons, you must log out and log back in before changing your login name.', type: 'error' });
                            return;
                        }
                        throw error;
                    }
                }

                // 3. Move the user document to the new ID
                const oldUserSnap = await getDoc(userRef);
                if (oldUserSnap.exists()) {
                    const userData = oldUserSnap.data();
                    userData.fullname = newFullName;
                    userData.username = newFullName; // For teachers, username = fullname
                    if (avatarChanged) userData.avatarUrl = editedAvatarUrl;
                    
                    await setDoc(newDocRef, userData);
                    await deleteDoc(userRef);

                    // 4. Update foreign keys in teacher_rooms
                    const q = query(collection(db, "teacher_rooms"), where("teacher", "==", userName));
                    const roomSnaps = await getDocs(q);
                    const updatePromises = roomSnaps.docs.map(roomDoc => 
                        setDoc(doc(db, "teacher_rooms", roomDoc.id), { teacher: newFullName, teacherFullName: newFullName }, { merge: true })
                    );
                    await Promise.all(updatePromises);

                    // 5. Update local/session storage for the Login Page
                    sessionStorage.setItem('loggedInUser', newFullName);
                    sessionStorage.setItem('userFullname', newFullName);
                    if (localStorage.getItem('rememberedUser') === userName) {
                        localStorage.setItem('rememberedUser', newFullName);
                    }
                    if (avatarChanged && editedAvatarUrl !== '') {
                        localStorage.setItem(`userAvatar_${newFullName}`, editedAvatarUrl);
                        localStorage.removeItem(`userAvatar_${userName}`);
                    } else if (editedAvatarUrl === '') {
                        localStorage.removeItem(`userAvatar_${newFullName}`);
                        localStorage.removeItem(`userAvatar_${userName}`);
                    }

                    setResultModal({ show: true, title: 'Success!', message: 'Profile updated! Reloading...', type: 'success' });
                    setIsProfileModalOpen(false);
                    
                    // Reload the page to sync React state with the new name
                    setTimeout(() => window.location.reload(), 1500);
                }
            } else if (avatarChanged) {
                await setDoc(userRef, updates, { merge: true });
                setResultModal({ show: true, title: 'Success!', message: 'Your profile avatar has been updated.', type: 'success' });
                setIsProfileModalOpen(false);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            setResultModal({ show: true, title: 'Error', message: 'Failed to update profile.', type: 'error' });
        }
    };

    const handleDeleteAccount = async () => {
        const user = auth.currentUser;
        if (!user) {
            setResultModal({ show: true, title: 'Deletion Failed', message: 'You must be logged in to delete your account.', type: 'error' });
            return;
        }

        const userRef = doc(db, "users", userName);
        let userDataBackup = null;

        try {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) userDataBackup = userSnap.data();

            // Delete all classrooms owned by this teacher
            const q = query(collection(db, "teacher_rooms"), where("teacher", "==", userName));
            const roomSnaps = await getDocs(q);
            const deletePromises = roomSnaps.docs.map(roomDoc => deleteDoc(doc(db, "teacher_rooms", roomDoc.id)));
            await Promise.all(deletePromises);

            await deleteDoc(userRef);
            await deleteUser(user);

            sessionStorage.clear();
            Object.keys(localStorage).filter(key => key.includes(userName)).forEach(key => localStorage.removeItem(key));

            setIsDeleteModalOpen(false);
            setResultModal({ show: true, title: 'Account Deleted', message: 'Your account and all associated data have been permanently deleted.', type: 'success' });
            setTimeout(() => navigate('/'), 2500);
        } catch (error) {
            console.error("Error deleting account:", error);
            if (userDataBackup) { try { await setDoc(userRef, userDataBackup); } catch (e) {} }
            let errorMsg = "An error occurred while deleting your account. Please try again.";
            if (error.code === 'auth/requires-recent-login') errorMsg = "For security reasons, you must log in again before deleting your account. Please log out, log back in, and try again.";
            setIsDeleteModalOpen(false);
            setResultModal({ show: true, title: 'Deletion Failed', message: errorMsg, type: 'error' });
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8faff' }}>
            <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }}><i className="fas fa-atom"></i> <span>AtomARix</span></div>
                <ul className="nav-links">
                    <li className="active"><i className="fas fa-chalkboard-teacher"></i> Classrooms</li>
                </ul>
                <div className="nav-right" style={{ width: '130px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                    <div className="menu-container" ref={menuRef}>
                        <button 
                            className={`user-menu-button ${isMenuOpen ? 'open' : ''}`} 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            style={avatarUrl ? { backgroundImage: `url('${avatarUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                        >
                            {!avatarUrl && <i className="fas fa-user"></i>}
                        </button>
                        {isMenuOpen && (
                            <>
                                <div className="mobile-menu-backdrop" onClick={() => setIsMenuOpen(false)}></div>
                                <div className="dropdown-menu show">
                                    <div className="mobile-sheet-header">
                                        <h3>Account</h3>
                                        <button className="btn-done" onClick={() => setIsMenuOpen(false)}>Done</button>
                                    </div>
                                    <div className="mobile-user-info">
                                        <div className="mobile-avatar" style={avatarUrl ? { backgroundImage: `url('${avatarUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                                            {!avatarUrl && <i className="fas fa-user"></i>}
                                        </div>
                                        <div className="mobile-user-info-text">
                                            <h4>{sessionStorage.getItem('userFullname') || userName}</h4>
                                            <p>@{userName}</p>
                                        </div>
                                    </div>
                                    <div className="dropdown-item" onClick={openEditProfile}>
                                        <div className="dropdown-icon-box"><i className="fas fa-user-edit"></i></div> Edit Profile
                                    </div>
                                    <div className="dropdown-item" onClick={() => { setIsSettingsModalOpen(true); setIsMenuOpen(false); }}>
                                        <div className="dropdown-icon-box"><i className="fas fa-cog"></i></div> Account Settings
                                    </div>
                                    <div className="dropdown-item danger" onClick={() => { setIsLogoutModalOpen(true); setIsMenuOpen(false); }}>
                                        <div className="dropdown-icon-box"><i className="fas fa-sign-out-alt"></i></div> Logout
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
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
                    {isLoading ? (
                        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                            <i className="fas fa-circle-notch fa-spin" style={{ color: '#6e45e2', fontSize: '3rem', marginBottom: '15px' }}></i>
                            <h2>Loading Classrooms...</h2>
                        </div>
                    ) : rooms.length === 0 ? (
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

            {isLogoutModalOpen && (
                <div className="modal-container show">
                    <div className="modal-content" style={{ textAlign: 'center' }}>
                        <i className="fas fa-sign-out-alt modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Confirm Logout</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to log out?</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => { setIsLogoutModalOpen(false); setIsMenuOpen(true); }}>Cancel</button>
                            <button className="btn-confirm" onClick={handleLogout} style={{ backgroundColor: '#e74c3c' }}>Logout</button>
                        </div>
                    </div>
                </div>
            )}

            {isSettingsModalOpen && (
                <div className="modal-container show">
                    <div className="modal-content" style={{ maxWidth: '400px', position: 'relative' }}>
                        <button className="close-modal" onClick={() => setIsSettingsModalOpen(false)}>&times;</button>
                        <i className="fas fa-cog modal-icon-box" style={{ color: '#6e45e2' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Account Settings</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Manage your account preferences and data.</p>
                        <div style={{ textAlign: 'left', background: '#fdfdfd', border: '1px solid #eee', borderRadius: '10px', padding: '15px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ color: '#e74c3c', margin: '0 0 5px 0' }}>Delete Account</h4>
                                    <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>Permanently remove your account and all classrooms.</p>
                                </div>
                                <button className="btn-cancel" style={{ color: '#e74c3c', borderColor: '#e74c3c', padding: '8px 15px', fontSize: '0.9rem', flex: 'none' }} onClick={() => { setIsSettingsModalOpen(false); setIsDeleteModalOpen(true); }}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="modal-container show">
                    <div className="modal-content">
                        <i className="fas fa-user-times modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Delete Account</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to permanently delete your account? This action cannot be undone and all your classrooms will be deleted.</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => { setIsDeleteModalOpen(false); setIsSettingsModalOpen(true); }}>Cancel</button>
                            <button className="btn-confirm" onClick={handleDeleteAccount} style={{ backgroundColor: '#e74c3c' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {isProfileModalOpen && (
                <div className="modal-container bottom-sheet show">
                    <div className="modal-content profile-modal-content">
                        <button className="close-modal" onClick={() => { setIsProfileModalOpen(false); setIsMenuOpen(true); setCropImageSrc(null); }}>&times;</button>
                        
                        {cropImageSrc ? (
                            <div className="crop-view">
                                <div className="profile-modal-header" style={{ paddingBottom: '15px' }}>
                                    <h2>Crop & Zoom</h2>
                                    <p>Adjust your profile picture</p>
                                </div>
                                <div className="crop-container-wrapper">
                                    <div className="cropper-box">
                                        <Cropper image={cropImageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                                    </div>
                                    <div className="zoom-slider">
                                        <i className="fas fa-search-minus" style={{ color: '#888' }}></i>
                                        <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} />
                                        <i className="fas fa-search-plus" style={{ color: '#888' }}></i>
                                    </div>
                                </div>
                                <div className="modal-actions profile-modal-actions">
                                    <button className="btn-cancel" onClick={() => setCropImageSrc(null)}>Cancel</button>
                                    <button className="btn-confirm btn-save-profile" onClick={handleCropApply}>Apply Crop</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="profile-modal-header">
                                    <div className="profile-avatar-edit">
                                        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                                        <div className="avatar-circle" style={editedAvatarUrl ? { backgroundImage: `url('${editedAvatarUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                                            {!editedAvatarUrl && <span>{sessionStorage.getItem('userFullname') ? sessionStorage.getItem('userFullname').charAt(0).toUpperCase() : (userName || 'T').charAt(0).toUpperCase()}</span>}
                                        </div>
                                    </div>
                                    <h2>Edit Profile</h2>
                                    <p>Update your name and photo</p>
                                </div>
                                
                                <div className="profile-modal-body" style={{ padding: '20px 30px' }}>
                                    <div className="input-group" style={{ marginBottom: '20px' }}>
                                        <label>Full Name</label>
                                        <input type="text" value={editedFullName} onChange={e => setEditedFullName(e.target.value)} placeholder="Your Full Name" />
                                    </div>
                                    <p style={{ fontWeight: 600, color: '#444', marginBottom: '12px' }}>Select an emoji:</p>
                                    <div className="emoji-grid">
                                        {['🧑‍🏫', '👩‍🏫', '👨‍🔬', '👩‍🔬', '🤖', '👽', '🐶', '🦄'].map(emoji => (
                                            <button type="button" key={emoji} className={`emoji-btn ${selectedEmoji === emoji ? 'selected' : ''}`} onClick={() => { setEditedAvatarUrl(generateEmojiAvatar(emoji)); setSelectedEmoji(emoji); }}>{emoji}</button>
                                        ))}
                                    </div>
                                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                        <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 10px 0' }}>Or upload your own photo</p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button className="btn-upload-photo" onClick={handleAvatarClick}><i className="fas fa-upload"></i> Upload</button>
                                            {editedAvatarUrl && <button className="btn-remove-avatar" onClick={() => { setEditedAvatarUrl(''); setSelectedEmoji(null); }}><i className="fas fa-trash"></i> Remove</button>}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-actions profile-modal-actions">
                                    <button className="btn-cancel" onClick={() => { setIsProfileModalOpen(false); setIsMenuOpen(true); }}>Cancel</button>
                                    <button className="btn-confirm btn-save-profile" onClick={handleProfileUpdate}>Save Profile</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {resultModal.show && (
                <div className="modal-container show">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <i className={`fas ${resultModal.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} modal-icon-box`} style={{ color: resultModal.type === 'success' ? '#1dd1a1' : '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>{resultModal.title}</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>{resultModal.message}</p>
                        <div className="modal-actions">
                            <button className="btn-confirm" onClick={() => setResultModal({ ...resultModal, show: false })} style={{ background: '#6e45e2', width: '100%' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}