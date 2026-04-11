import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import './StudentHome.css'; 
import { collection, getDocs, doc, getDoc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { deleteUser } from 'firebase/auth';

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
    // Explicitly declare standard mobile Emoji fonts so smartphones can draw them properly!
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
            // Compress to JPEG with 80% quality
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        image.onerror = (error) => reject(error);
    });
};

const fireConfetti = (x, y) => {
    const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#1dd1a1', '#ff9f43'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = `${x}px`;
        confetti.style.top = `${y}px`;
        confetti.style.width = `${Math.random() * 8 + 4}px`;
        confetti.style.height = `${Math.random() * 12 + 6}px`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 200 + 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity - 200; 
        const rot = Math.random() * 720 - 360;

        document.body.appendChild(confetti);

        const animation = confetti.animate([
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.6 },
            { transform: `translate(${tx}px, ${ty + 200}px) rotate(${rot}deg)`, opacity: 0 }
        ], { duration: Math.random() * 1000 + 1500, easing: 'cubic-bezier(.25,.1,.25,1)' });

        animation.onfinish = () => confetti.remove();
    }
};

export default function StudentHome() {
    const navigate = useNavigate();
    const menuRef = useRef(null);

    // User and Room State
    const [userName, setUserName] = useState(sessionStorage.getItem('loggedInUser'));

    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [classCode, setClassCode] = useState('');
    const [joinedRoom, setJoinedRoom] = useState(() => {
        const savedId = localStorage.getItem(`joinedRoomId_${userName}`);
        const savedSection = localStorage.getItem(`joinedRoomSection_${userName}`);
        return savedId && savedSection ? { id: savedId, section: savedSection } : null;
    });
    const [stats, setStats] = useState({ learned: 0, compounds: 0, timeAttack: 0, matching: 999 });
    const [leaderboard, setLeaderboard] = useState([]);
    const [matchingLeaderboard, setMatchingLeaderboard] = useState([]);
    const [lastReadTime, setLastReadTime] = useState(0);
    const [showAllTimeAttack, setShowAllTimeAttack] = useState(false);
    const [showAllMatching, setShowAllMatching] = useState(false);

    // Menu and Modal State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // Profile Editing State
    const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem(`userAvatar_${userName}`) || '');
    const [editedAvatarUrl, setEditedAvatarUrl] = useState('');
    const fileInputRef = useRef(null);
    const [selectedEmoji, setSelectedEmoji] = useState(null);

    // Cropper State
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // PWA Install State
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [showIosInstallPrompt, setShowIosInstallPrompt] = useState(false);

    // General purpose modal for results/errors
    const [resultModal, setResultModal] = useState({ show: false, title: '', message: '', type: 'info' });
    const [showJoinBtn, setShowJoinBtn] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [animElementsPct, setAnimElementsPct] = useState(0);
    const [animCompoundsPct, setAnimCompoundsPct] = useState(0);
    const [hasCelebrated, setHasCelebrated] = useState(false);

    useEffect(() => {
        if (!userName) {
            navigate('/');
        }

        // Fetch user stats from localStorage to populate the dashboard overview
        const learnedCount = (JSON.parse(localStorage.getItem(`learnedElements_${userName}`)) || []).length;
        const discoveredCompoundsCount = (JSON.parse(localStorage.getItem(`discoveredCompounds_${userName}`)) || []).length;
        const timeAttackScore = parseInt(localStorage.getItem(`timeAttackBestCorrect_${userName}`) || '0', 10);
        let matchingScore = parseInt(localStorage.getItem(`matchingGameBestScore_${userName}`), 10);
        if (isNaN(matchingScore) || matchingScore <= 0) matchingScore = 999;
        setStats({ learned: learnedCount, compounds: discoveredCompoundsCount, timeAttack: timeAttackScore, matching: matchingScore });

        let unsubscribeRoom = null;
        let unsubscribeUser = null;

        // Fetch user data from cloud (Rooms, Elements, Compounds)
        const fetchUserData = () => {
            const userRef = doc(db, "users", userName);
            
            unsubscribeUser = onSnapshot(userRef, async (userSnap) => {
                try {
                    let roomIdToFetch = localStorage.getItem(`joinedRoomId_${userName}`);
                    
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        
                        if (data.joinedRoomId !== undefined) {
                            roomIdToFetch = data.joinedRoomId;
                            if (roomIdToFetch) localStorage.setItem(`joinedRoomId_${userName}`, roomIdToFetch);
                            else localStorage.removeItem(`joinedRoomId_${userName}`);
                        }
                        
                        if (data.learnedElements) {
                            localStorage.setItem(`learnedElements_${userName}`, JSON.stringify(data.learnedElements));
                        }
                        if (data.discoveredCompounds) {
                            localStorage.setItem(`discoveredCompounds_${userName}`, JSON.stringify(data.discoveredCompounds));
                        }
                        if (data.timeAttackBestCorrect !== undefined) {
                            localStorage.setItem(`timeAttackBestCorrect_${userName}`, data.timeAttackBestCorrect.toString());
                        }
                        if (data.matchingGameBestScore !== undefined && data.matchingGameBestScore > 0) {
                            localStorage.setItem(`matchingGameBestScore_${userName}`, data.matchingGameBestScore.toString());
                        }
                        if (data.avatarUrl) {
                            localStorage.setItem(`userAvatar_${userName}`, data.avatarUrl);
                            setAvatarUrl(data.avatarUrl);
                        }
                        if (roomIdToFetch && data[`lastRead_${roomIdToFetch}`] !== undefined) {
                            const cloudLastRead = data[`lastRead_${roomIdToFetch}`];
                            localStorage.setItem(`lastRead_${userName}_${roomIdToFetch}`, cloudLastRead.toString());
                            setLastReadTime(cloudLastRead);
                        }
                        
                        // Update stats with the latest cloud data
                        setStats({ 
                            learned: data.learnedElements ? data.learnedElements.length : learnedCount, 
                            compounds: data.discoveredCompounds ? data.discoveredCompounds.length : discoveredCompoundsCount,
                            timeAttack: data.timeAttackBestCorrect !== undefined ? data.timeAttackBestCorrect : timeAttackScore,
                            matching: (data.matchingGameBestScore !== undefined && data.matchingGameBestScore > 0) ? data.matchingGameBestScore : matchingScore
                        });
                    }

                    if (roomIdToFetch) {
                        if (!unsubscribeRoom) {
                            const roomRef = doc(db, "teacher_rooms", roomIdToFetch);
                            unsubscribeRoom = onSnapshot(roomRef, async (roomSnap) => {
                                if (roomSnap.exists()) {
                                    setJoinedRoom({ id: roomSnap.id, ...roomSnap.data() });
                                    localStorage.setItem(`joinedRoomSection_${userName}`, roomSnap.data().section);
                                } else {
                                    localStorage.removeItem(`joinedRoomId_${userName}`);
                                    localStorage.removeItem(`joinedRoomSection_${userName}`);
                                    setJoinedRoom(null);
                                    await setDoc(userRef, { joinedRoomId: null }, { merge: true });
                                }
                            });
                        }
                    } else {
                        if (unsubscribeRoom) {
                            unsubscribeRoom();
                            unsubscribeRoom = null;
                        }
                        setJoinedRoom(null);
                    }
                } catch (error) {
                    console.error("Error parsing user data snapshot:", error);
                }
            }, (error) => {
                console.error("Error listening to user data:", error);
            });
        };
        fetchUserData();

        // Fetch Leaderboard Data in real-time
        const unsubscribeLeaderboard = onSnapshot(collection(db, "users"), (querySnapshot) => {
            const usersData = [];
            const matchingData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.timeAttackBestCorrect !== undefined && data.timeAttackBestCorrect > 0) {
                    usersData.push({
                        username: doc.id,
                        score: data.timeAttackBestCorrect
                    });
                }
                if (data.matchingGameBestScore !== undefined && data.matchingGameBestScore > 0 && data.matchingGameBestScore < 999) {
                    matchingData.push({
                        username: doc.id,
                        score: data.matchingGameBestScore
                    });
                }
            });
            usersData.sort((a, b) => b.score - a.score);
            matchingData.sort((a, b) => a.score - b.score); // Ascending order (fewest moves is best)
            setLeaderboard(usersData);
            setMatchingLeaderboard(matchingData);
        }, (error) => {
            console.error("Error fetching leaderboard:", error);
        });

        // Listen for the PWA install prompt
        const handleBeforeInstallPrompt = (e) => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            if (isMobile) {
                e.preventDefault();
                setDeferredPrompt(e);
                setShowInstallBanner(true);
            }
        };

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setShowInstallBanner(false);
            console.log('PWA was installed');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            if (unsubscribeRoom) unsubscribeRoom();
            if (unsubscribeUser) unsubscribeUser();
            if (unsubscribeLeaderboard) unsubscribeLeaderboard();
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [userName, navigate]);

    // iOS PWA Install Detection
    useEffect(() => {
        const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
        const hasDismissed = localStorage.getItem('iosInstallDismissed');

        if (isIos && !isStandalone && !hasDismissed) {
            setShowIosInstallPrompt(true);
        }
    }, []);

    // Scroll listener to hide/show the floating Join Room button
    useEffect(() => {
        let lastScrollY = window.scrollY;
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                setShowJoinBtn(false); // Hide on scroll down
            } else if (currentScrollY < lastScrollY) {
                setShowJoinBtn(true); // Show on scroll up
            }
            
            // Hide the transparent mobile header if scrolled past the very top
            setIsScrolled(currentScrollY > 20);
            
            lastScrollY = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Animate progress rings on mount or when stats change
    useEffect(() => {
        const targetElements = Math.min((stats.learned / 118) * 100, 100) || 0;
        const targetCompounds = Math.min((stats.compounds / 37) * 100, 100) || 0;

        let animationFrame;
        const startTime = performance.now();
        const duration = 1200; 

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4); 

            setAnimElementsPct(targetElements * ease);
            setAnimCompoundsPct(targetCompounds * ease);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [stats]);

    // Effect to close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    // Prevent background scrolling when any modal or menu is open
    useEffect(() => {
        if (isMenuOpen || isProfileModalOpen || isLogoutModalOpen || isJoinModalOpen || resultModal.show || isSettingsModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = ''; // Cleanup on unmount
        };
    }, [isMenuOpen, isProfileModalOpen, isLogoutModalOpen, isJoinModalOpen, resultModal.show, isSettingsModalOpen]);

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/');
    };

    const openEditProfile = () => {
        setEditedAvatarUrl(avatarUrl);
        setSelectedEmoji(null);
        setIsProfileModalOpen(true);
        setIsMenuOpen(false);
    };

    const handleAvatarClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

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
        e.target.value = ''; // Reset input so same file can be selected again
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropApply = async () => {
        try {
            const croppedImage = await getCroppedImg(cropImageSrc, croppedAreaPixels);
            setEditedAvatarUrl(croppedImage);
            setCropImageSrc(null);
        } catch (e) {
            console.error("Error cropping image:", e);
        }
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        await deferredPrompt.userChoice;
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowInstallBanner(false);
    };

    const handleJoinRoomClick = () => {
        if (joinedRoom) {
            navigate(`/student-room/${joinedRoom.id}`);
        } else {
            setIsJoinModalOpen(true);
        }
    };

    const handleConfirmJoin = async () => {
        const code = classCode.trim().toUpperCase();
        if (!code) {
            setResultModal({ show: true, title: 'Input Error', message: 'Please enter a class code.', type: 'error' });
            return;
        }

        try {
            const querySnapshot = await getDocs(collection(db, "teacher_rooms"));
            const allRooms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const foundRoom = allRooms.find(r => 
                (r.classCode && r.classCode === code) || 
                (!r.classCode && r.id && r.id.substring(r.id.length - 6).toUpperCase() === code)
            );

            if (foundRoom) {
                // Save to Firestore so it syncs across devices
                const userRef = doc(db, "users", userName);
                await setDoc(userRef, { joinedRoomId: foundRoom.id }, { merge: true });

                localStorage.setItem(`joinedRoomId_${userName}`, foundRoom.id);
                localStorage.setItem(`joinedRoomSection_${userName}`, foundRoom.section);
                navigate(`/student-room/${foundRoom.id}`);
            } else {
                setResultModal({ show: true, title: 'Join Failed', message: 'Invalid class code. Please check and try again.', type: 'error' });
            }
        } catch (error) {
            console.error("Error finding room:", error);
            setResultModal({ show: true, title: 'Network Error', message: 'Could not connect to the database to verify the code.', type: 'error' });
        }
    };

    const handleProfileUpdate = async () => {
            if (editedAvatarUrl !== avatarUrl) {
            localStorage.setItem(`userAvatar_${userName}`, editedAvatarUrl);
                setAvatarUrl(editedAvatarUrl);
                try {
                const userRef = doc(db, "users", userName);
                    await setDoc(userRef, { avatarUrl: editedAvatarUrl }, { merge: true });
                } catch (e) { console.error("Error saving avatar to cloud:", e); }
            }

        setResultModal({ show: true, title: 'Success!', message: 'Your profile avatar has been updated.', type: 'success' });
        setIsProfileModalOpen(false);
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
            // 1. Backup user data in case auth deletion fails
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                userDataBackup = userSnap.data();
            }

            // 2. Delete user profile from Firestore
            await deleteDoc(userRef);

            // 3. Delete user from Firebase Auth
            await deleteUser(user);

            // 4. Clear local storage records related specifically to this user
            sessionStorage.clear();
            const keysToRemove = Object.keys(localStorage).filter(key => key.includes(userName));
            keysToRemove.forEach(key => localStorage.removeItem(key));

            setIsDeleteModalOpen(false);
            setResultModal({ show: true, title: 'Account Deleted', message: 'Your account and all associated data have been permanently deleted.', type: 'success' });

            setTimeout(() => {
                navigate('/');
            }, 2500);
        } catch (error) {
            console.error("Error deleting account:", error);
            
            // Rollback: Restore the Firestore document if Auth deletion failed
            if (userDataBackup) {
                try {
                    await setDoc(userRef, userDataBackup);
                } catch (restoreError) {
                    console.error("Failed to restore user data:", restoreError);
                }
            }

            let errorMsg = "An error occurred while deleting your account. Please try again.";
            if (error.code === 'auth/requires-recent-login') {
                errorMsg = "For security reasons, you must log in again before deleting your account. Please log out, log back in, and try again.";
            }
            setIsDeleteModalOpen(false);
            setResultModal({ show: true, title: 'Deletion Failed', message: errorMsg, type: 'error' });
        }
    };

    // Combine and sort Announcements, Modules, and Assessments for the notifications feed
    const getRecentUpdates = () => {
        if (!joinedRoom) return [];
        
        const localReadTime = parseInt(localStorage.getItem(`lastRead_${userName}_${joinedRoom.id}`) || '0', 10);
        const effectiveLastRead = Math.max(localReadTime, lastReadTime);

        const posts = (joinedRoom.posts || []).map(p => ({
            id: `post-${p.id}`, type: 'announcement', title: 'New Announcement', desc: p.text,
            author: p.author || joinedRoom.teacherFullName || joinedRoom.teacher, timestamp: p.timestamp
        }));
        
        const classworks = (joinedRoom.classwork || []).map(cw => ({
            id: `cw-${cw.id}`, type: cw.type, title: cw.type === 'module' ? `New Module: ${cw.title}` : `New Assessment: ${cw.title}`,
            desc: cw.desc, author: joinedRoom.teacherFullName || joinedRoom.teacher, timestamp: cw.timestamp
        }));
        
        return [...posts, ...classworks]
            .filter(update => new Date(update.timestamp).getTime() > effectiveLastRead)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 3); // Grab the 3 most recent notifications
    };
    const recentUpdates = getRecentUpdates();

    return (
        <div>
            <nav className={`navbar ${isScrolled ? 'scrolled-hide' : ''}`}>
                <div className="nav-brand" style={{ width: '130px' }}><i className="fas fa-atom"></i> <span>AtomARix</span></div>
                <ul className="nav-links">
                    <li className="active"><i className="fas fa-home"></i> <span>Home</span></li>
                    <li onClick={() => navigate('/periodic-table')}><i className="fas fa-th"></i> <span>Periodic Table</span></li>
                    <li onClick={() => navigate('/laboratory')}><i className="fas fa-flask"></i> <span>Laboratory</span></li>
                    <li onClick={() => navigate('/matchinggame')}><i className="fas fa-puzzle-piece"></i> <span>Matching Game</span></li>
                    <li onClick={() => navigate('/timeattack')}><i className="fas fa-stopwatch"></i> <span>Time Attack</span></li>
                    <li onClick={() => navigate('/achievements')}><i className="fas fa-trophy"></i> <span>Achievements</span></li>
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
                                <div className="mobile-menu-backdrop"></div>
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
                {/* PWA Custom Install Banner */}
                {showInstallBanner && (
                    <div className="install-banner">
                        <div className="install-banner-content">
                            <div className="install-icon"><i className="fas fa-download"></i></div>
                            <div className="install-text">
                                <h4>Install AtomARix</h4>
                                <p>Add to your home screen for quick access and a full-screen experience!</p>
                            </div>
                        </div>
                        <div className="install-actions">
                            <button className="btn-install-close" onClick={() => setShowInstallBanner(false)}>&times;</button>
                            <button className="btn-install-app" onClick={handleInstallClick}>Install</button>
                        </div>
                    </div>
                )}

                {/* iOS Fallback Install Banner */}
                {showIosInstallPrompt && (
                    <div className="install-banner">
                        <div className="install-banner-content">
                            <div className="install-icon"><i className="fab fa-apple"></i></div>
                            <div className="install-text">
                                <h4>Install on your HomeScreen!</h4>
                                <p>Tap Share <i className="fas fa-share-square"></i> in Safari, then select <i className="fas fa-plus-square"></i> <strong>Add to Home Screen</strong> .</p>
                            </div>
                        </div>
                        <div className="install-actions">
                            <button className="btn-install-close" onClick={() => { setShowIosInstallPrompt(false); localStorage.setItem('iosInstallDismissed', 'true'); }}>&times;</button>
                        </div>
                    </div>
                )}

                <div className="hero-banner">
                    <div className="hero-text">
                        <h1>Welcome, {userName}! 🧪</h1>
                        <p>Ready to explore the elements today?</p>
                    </div>
                    <button className={`btn-join-room ${!showJoinBtn ? 'hide-fab' : ''}`} onClick={handleJoinRoomClick}>
                        {joinedRoom ? (
                            <><i className="fas fa-door-open"></i> <span>Enter {joinedRoom.section}</span></>
                        ) : (
                            <><i className="fas fa-sign-in-alt"></i> <span>Join Room</span></>
                        )}
                    </button>
                </div>

                {/* Classroom Updates Widget */}
                {joinedRoom && (
                    <div className="classroom-updates-card">
                        <div className="updates-header">
                            <h3><i className={`fas fa-bell ${recentUpdates.length > 0 ? 'notification-bell' : ''}`}></i> {joinedRoom.grade} - {joinedRoom.section}</h3>
                            <button className="btn-go-to-class" onClick={() => navigate(`/student-room/${joinedRoom.id}`)}>
                                Go to Classroom <i className="fas fa-arrow-right"></i>
                            </button>
                        </div>
                        <div className="updates-content">
                            {recentUpdates.length > 0 ? (
                                <div className="recent-posts-list">
                                    {recentUpdates.map((update) => (
                                        <div key={update.id} className="recent-post-item">
                                            <div className={`recent-post-icon ${update.type}`}>
                                                <i className={`fas ${
                                                    update.type === 'announcement' ? 'fa-comment-dots' :
                                                    update.type === 'module' ? 'fa-book' : 'fa-clipboard-check'
                                                }`}></i>
                                            </div>
                                            <div className="recent-post-details">
                                                <h4>{update.title}</h4>
                                                <span className="post-date">{update.author} • {new Date(update.timestamp).toLocaleString()}</span>
                                                {update.desc && <p>{update.desc}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-updates">
                                    <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#1dd1a1', marginBottom: '10px' }}></i>
                                    <p>You're all caught up! No new updates yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Stats Overview */}
                <div className="progress-stats-container">
                    <div className="progress-stat-card">
                        <div className="circular-progress-wrap" style={{ background: `conic-gradient(#f1c40f ${animElementsPct}%, #f0f2f5 0)` }}>
                            <div className="circular-progress-inner"><i className="fas fa-star" style={{ color: '#f1c40f' }}></i></div>
                        </div>
                        <div className="stat-details">
                            <h4>Elements Learned</h4>
                            <span>{stats.learned}/118</span>
                        </div>
                    </div>
                    <div className="progress-stat-card">
                        <div className="circular-progress-wrap" style={{ background: `conic-gradient(#1dd1a1 ${animCompoundsPct}%, #f0f2f5 0)` }}>
                            <div className="circular-progress-inner"><i className="fas fa-vial" style={{ color: '#1dd1a1' }}></i></div>
                        </div>
                        <div className="stat-details">
                            <h4>Compounds Found</h4>
                            <span>{stats.compounds}/37</span>
                        </div>
                    </div>
                    <div className="score-stat-card">
                        <div className="score-icon-box time-attack">
                            <i className="fas fa-stopwatch"></i>
                        </div>
                        <div className="score-details">
                            <h4>Time Attack Best</h4>
                            <span>{stats.timeAttack} <small>pts</small></span>
                        </div>
                        <button className="btn-play-game time-attack" onClick={() => navigate('/timeattack')}>
                            Take Quiz
                        </button>
                    </div>
                    <div className="score-stat-card">
                        <div className="score-icon-box matching">
                            <i className="fas fa-puzzle-piece"></i>
                        </div>
                        <div className="score-details">
                            <h4>Matching Game Best</h4>
                            <span>{stats.matching === 999 ? '-' : stats.matching} <small>moves</small></span>
                        </div>
                        <button className="btn-play-game matching" onClick={() => navigate('/matchinggame')}>
                            Play Now
                        </button>
                    </div>
                </div>

                <div className="bottom-widgets-grid">
                {/* Global Leaderboard Widget - Time Attack */}
                <div className="leaderboard-card">
                    <div className="leaderboard-header">
                        <div className="leaderboard-icon-wrapper time-attack">
                            <i className="fas fa-trophy"></i>
                        </div>
                        <div>
                            <h3>AtomARix Top Scorers</h3>
                            <p className="time-attack-subtitle">Time Attack</p>
                        </div>
                    </div>
                    <div className="leaderboard-list">
                        {leaderboard.length > 0 ? (
                            <>
                                {(showAllTimeAttack ? leaderboard : leaderboard.slice(0, 3)).map((user, index) => {
                                let rankClass = '';
                                let rankIcon = <span>#{index + 1}</span>;
                                if (index === 0) { rankClass = 'gold'; rankIcon = <i className="fas fa-crown"></i>; }
                                else if (index === 1) { rankClass = 'silver'; rankIcon = <i className="fas fa-medal"></i>; }
                                else if (index === 2) { rankClass = 'bronze'; rankIcon = <i className="fas fa-award"></i>; }

                                return (
                                    <div 
                                        key={user.username} 
                                        className={`leaderboard-item ${rankClass} ${user.username === userName ? 'current-user' : ''}`}
                                    >
                                        <div className="rank-col">{rankIcon}</div>
                                        <div className="user-col">
                                            {user.username}
                                            {user.username === userName && <span className="you-badge">You</span>}
                                        </div>
                                        <div className="score-col">{user.score} <small style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>pts</small></div>
                                    </div>
                                );
                                })}
                                {leaderboard.length > 3 && (
                                    <button className="btn-view-all" onClick={() => setShowAllTimeAttack(!showAllTimeAttack)}>
                                        {showAllTimeAttack ? 'Show Less' : 'View All'}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="no-updates">
                                <p>No scores yet. Be the first to play Time Attack!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Global Leaderboard Widget - Matching Game */}
                <div className="leaderboard-card">
                    <div className="leaderboard-header">
                        <div className="leaderboard-icon-wrapper matching">
                            <i className="fas fa-trophy"></i>
                        </div>
                        <div>
                            <h3>AtomARix Top Scorers</h3>
                            <p className="matching-subtitle">Matching Game</p>
                        </div>
                    </div>
                    <div className="leaderboard-list">
                        {matchingLeaderboard.length > 0 ? (
                            <>
                                {(showAllMatching ? matchingLeaderboard : matchingLeaderboard.slice(0, 3)).map((user, index) => {
                                let rankClass = '';
                                let rankIcon = <span>#{index + 1}</span>;
                                if (index === 0) { rankClass = 'gold'; rankIcon = <i className="fas fa-crown"></i>; }
                                else if (index === 1) { rankClass = 'silver'; rankIcon = <i className="fas fa-medal"></i>; }
                                else if (index === 2) { rankClass = 'bronze'; rankIcon = <i className="fas fa-award"></i>; }

                                return (
                                    <div 
                                        key={user.username} 
                                        className={`leaderboard-item ${rankClass} ${user.username === userName ? 'current-user' : ''}`}
                                    >
                                        <div className="rank-col">{rankIcon}</div>
                                        <div className="user-col">
                                            {user.username}
                                            {user.username === userName && <span className="you-badge">You</span>}
                                        </div>
                                        <div className="score-col">{user.score} <small style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>moves</small></div>
                                    </div>
                                );
                                })}
                                {matchingLeaderboard.length > 3 && (
                                    <button className="btn-view-all" onClick={() => setShowAllMatching(!showAllMatching)}>
                                        {showAllMatching ? 'Show Less' : 'View All'}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="no-updates">
                                <p>No scores yet. Be the first to play the Matching Game!</p>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </main>

            {isJoinModalOpen && (
                <div className="modal-container show">
                    <div className="modal-content">
                        <i className="fas fa-door-open modal-icon-box" style={{ color: '#6e45e2' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Join a Class</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Ask your teacher for the class code, then enter it here.</p>
                        <input type="text" value={classCode} onChange={e => setClassCode(e.target.value)} className="class-code-input" placeholder="Class Code" maxLength="6" />
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setIsJoinModalOpen(false)}>Cancel</button>
                            <button className="btn-confirm" onClick={handleConfirmJoin} style={{ background: '#6e45e2' }}>Join</button>
                        </div>
                    </div>
                </div>
            )}

            {isLogoutModalOpen && (
                <div className="modal-container show">
                    <div className="modal-content">
                        <i className="fas fa-sign-out-alt modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Confirm Logout</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to log out?</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => { setIsLogoutModalOpen(false); setIsMenuOpen(true); }}>Cancel</button>
                            <button className="btn-confirm" onClick={handleLogout}>Logout</button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="modal-container show">
                    <div className="modal-content">
                        <i className="fas fa-user-times modal-icon-box" style={{ color: '#e74c3c' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Delete Account</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Are you sure you want to permanently delete your account? This action cannot be undone and all your progress, achievements, and data will be lost.</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => { setIsDeleteModalOpen(false); setIsSettingsModalOpen(true); }}>Cancel</button>
                            <button className="btn-confirm" onClick={handleDeleteAccount} style={{ backgroundColor: '#e74c3c' }}>Delete</button>
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
                                    <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>Permanently remove your account.</p>
                                </div>
                                <button className="btn-cancel" style={{ color: '#e74c3c', borderColor: '#e74c3c', padding: '8px 15px', fontSize: '0.9rem', flex: 'none' }} onClick={() => { setIsSettingsModalOpen(false); setIsDeleteModalOpen(true); }}>
                                    Delete
                                </button>
                            </div>
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
                                        <Cropper
                                            image={cropImageSrc}
                                            crop={crop}
                                            zoom={zoom}
                                            aspect={1}
                                            cropShape="round"
                                            showGrid={false}
                                            onCropChange={setCrop}
                                            onCropComplete={onCropComplete}
                                            onZoomChange={setZoom}
                                        />
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
                                        {!editedAvatarUrl && <span>{sessionStorage.getItem('userFullname') ? sessionStorage.getItem('userFullname').charAt(0).toUpperCase() : (userName || 'U').charAt(0).toUpperCase()}</span>}
                                        </div>
                                    </div>
                                    <h2>Choose Avatar</h2>
                                    <p>Pick an emoji or upload a photo</p>
                                </div>
                                
                                <div className="profile-modal-body" style={{ padding: '20px 30px' }}>
                                    <p style={{ fontWeight: 600, color: '#444', marginBottom: '12px' }}>Select an emoji:</p>
                                    <div className="emoji-grid">
                                        {['🧑‍🔬', '👩‍🔬', '🤖', '👽', '👻', '🐱', '🐶', '🦄', '🚀', '⭐', '🔥', '💧'].map(emoji => (
                                            <button 
                                                type="button" 
                                                key={emoji} 
                                                className={`emoji-btn ${selectedEmoji === emoji ? 'selected' : ''}`} 
                                                onClick={() => { setEditedAvatarUrl(generateEmojiAvatar(emoji)); setSelectedEmoji(emoji); }}
                                            >
                                                {emoji}
                                            </button>
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
                                    <button className="btn-confirm btn-save-profile" onClick={handleProfileUpdate}>Save Avatar</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {resultModal.show && (
                <div className="modal-container show">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <i 
                            className={`fas ${resultModal.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} modal-icon-box`} 
                            style={{ color: resultModal.type === 'success' ? '#1dd1a1' : '#e74c3c' }}>
                        </i>
                        <h2 style={{ marginBottom: '10px' }}>{resultModal.title}</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>{resultModal.message}</p>
                        <div className="modal-actions">
                            <button className="btn-confirm" onClick={() => setResultModal({ ...resultModal, show: false })} style={{ background: '#6e45e2' }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PWA Custom Install Modal */}
            {showInstallBanner && (
                <div className="modal-container bottom-sheet show">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <i className="fas fa-download modal-icon-box" style={{ color: '#4facfe' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Install AtomARix</h2>
                        <p style={{ color: '#666', marginBottom: '25px' }}>Add to your home screen for quick access and a full-screen experience!</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" style={{ flex: 1 }} onClick={() => setShowInstallBanner(false)}>Not Now</button>
                            <button className="btn-confirm" style={{ flex: 1, background: 'linear-gradient(135deg, #6e45e2 0%, #4facfe 100%)' }} onClick={handleInstallClick}>Install App</button>
                        </div>
                    </div>
                </div>
            )}

            {/* iOS Fallback Install Modal */}
            {showIosInstallPrompt && (
                <div className="modal-container bottom-sheet show">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <i className="fab fa-apple modal-icon-box" style={{ color: '#333' }}></i>
                        <h2 style={{ marginBottom: '10px' }}>Install AtomARix</h2>
                        <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.5' }}>
                            Add to your home screen for quick access and a full-screen experience!<br/>
                            <br/>
                            Tap Share 
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'sub', margin: '0 4px' }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg> 
                            in Safari, then select <br/><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'sub', margin: '0 4px' }}><rect x="4" y="4" width="16" height="16" rx="3" ry="3" /><line x1="12" y1="9" x2="12" y2="15" /><line x1="9" y1="12" x2="15" y2="12" /></svg><strong>Add to Home Screen</strong> .
                        </p>
                        <div className="modal-actions" style={{ justifyContent: 'center', width: '100%' }}>
                            <button className="btn-cancel" style={{ minWidth: '200px' }} onClick={() => { setShowIosInstallPrompt(false); localStorage.setItem('iosInstallDismissed', 'true'); }}>Got it!</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}