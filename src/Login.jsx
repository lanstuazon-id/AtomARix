import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function Login() {
    const navigate = useNavigate();

    const [isLoginView, setIsLoginView] = useState(true);

    // Form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullname, setFullname] = useState('');
    const [role, setRole] = useState('student');
    const [teacherCode, setTeacherCode] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Token state — tracks whether the token came from a URL invite link
    const [tokenFromUrl, setTokenFromUrl] = useState(false);

    // Modal state
    const [modal, setModal] = useState({ show: false, title: '', message: '', type: 'error' });

    // Clears all form inputs — used after a successful registration so the
    // login screen the user lands on next is blank, not pre-filled with
    // whatever they just typed to create their account.
    const resetFormFields = () => {
        setUsername('');
        setPassword('');
        setFullname('');
        setConfirmPassword('');
        setPasswordError('');
        setTeacherCode('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    // On mount: check for invite token in URL, then check remembered user
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');

        if (urlToken) {
            // Pre-fill token, switch to register view, lock role to teacher
            setTeacherCode(urlToken);
            setTokenFromUrl(true);
            setIsLoginView(false);
            setRole('teacher');
        } else {
            // Normal remembered-user logic
            const savedUser = localStorage.getItem('rememberedUser');
            const savedRole = localStorage.getItem('rememberedRole');
            if (savedUser) {
                if (savedRole === 'teacher') {
                    setFullname(savedUser);
                    setRole('teacher');
                } else {
                    setUsername(savedUser);
                    setRole('student');
                }
                setRememberMe(true);
            }
        }
    }, []);

    // ─── Token validator ───────────────────────────────────────────────────────
    const validateInviteToken = async (token) => {
        const tokenRef = doc(db, 'teacherInvites', token.trim());
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
            return { valid: false, message: 'Invalid invite token. Please request a new one from your admin.' };
        }

        const data = tokenSnap.data();

        if (data.used) {
            return { valid: false, message: 'This invite token has already been used.' };
        }

        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            return { valid: false, message: 'This invite token has expired. Please request a new one.' };
        }

        return { valid: true };
    };

    // ─── Mark token as used after successful registration ─────────────────────
    const markTokenUsed = async (token, usedByUsername) => {
        const tokenRef = doc(db, 'teacherInvites', token.trim());
        await setDoc(tokenRef, {
            used: true,
            usedBy: usedByUsername,
            usedAt: new Date().toISOString()
        }, { merge: true });
    };

    // ─── Form submit ──────────────────────────────────────────────────────────
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const actualUsername = (role === 'teacher' ? fullname : username).trim();
        // Create a dummy email for Firebase Auth since it requires an email format
        const authEmail = `${actualUsername.replace(/\s+/g, '').toLowerCase()}@atomarix.com`;

        if (isLoginView) {
            setModal({ show: true, title: 'Authenticating...', message: 'Checking credentials...', type: 'loading' });
            try {
                await signInWithEmailAndPassword(auth, authEmail, password);

                const userRef = doc(db, "users", actualUsername);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    setModal({ show: true, title: 'Login Failed', message: 'User profile not found in database.', type: 'error' });
                    return;
                }

                const userData = userSnap.data();

                // Block deactivated accounts 
                if (userData.active === false) {
                    setModal({ show: true, title: 'Access Denied', message: 'Your account has been deactivated. Please contact your admin.', type: 'error' });
                    return;
                }
                sessionStorage.setItem('loggedInUser', userData.username);
                sessionStorage.setItem('userRole', userData.role);
                sessionStorage.setItem('userFullname', userData.fullname);

                if (rememberMe) {
                    localStorage.setItem('rememberedUser', userData.username);
                    localStorage.setItem('rememberedRole', userData.role);
                } else {
                    localStorage.removeItem('rememberedUser');
                    localStorage.removeItem('rememberedRole');
                }

                setModal({ show: true, title: 'Success!', message: 'Logging you in...', type: 'loading' });
                setTimeout(() => {
                    navigate(userData.role === 'teacher' ? '/dashboard' : '/home');
                }, 500);
            } catch (error) {
                console.error("Firebase Login Error:", error.code, error.message);
                let errorMessage = `Invalid username or password. (${error.code})`;
                if (error.code === 'auth/network-request-failed') errorMessage = 'Network error. Please check your connection.';
                if (error.code === 'auth/invalid-credential') errorMessage = 'Invalid username or password.';
                if (error.code === 'auth/configuration-not-found') errorMessage = 'Firebase Authentication is not set up. Please click "Get Started" in the Auth tab of your Firebase console.';
                setModal({ show: true, title: 'Login Failed', message: errorMessage, type: 'error' });
            }
        } else {
            // ── Registration ──────────────────────────────────────────────────
            setPasswordError('');

            if (password.length < 8) {
                setPasswordError("Password must be at least 8 characters long.");
                return;
            }
            if (password !== confirmPassword) {
                setPasswordError("Passwords do not match. Please try again.");
                return;
            }

            // Validate invite token for teacher registrations
            if (role === 'teacher') {
                if (!teacherCode.trim()) {
                    setModal({ show: true, title: 'Registration Failed', message: 'Please enter your invite token. Ask your admin for one.', type: 'error' });
                    return;
                }

                setModal({ show: true, title: 'Validating token...', message: 'Checking your invite token...', type: 'loading' });
                const tokenCheck = await validateInviteToken(teacherCode);

                if (!tokenCheck.valid) {
                    setModal({ show: true, title: 'Registration Failed', message: tokenCheck.message, type: 'error' });
                    return;
                }
            }

            setModal({ show: true, title: 'Creating Account...', message: 'Setting up your profile...', type: 'loading' });

            try {
                await createUserWithEmailAndPassword(auth, authEmail, password);

                const userRef = doc(db, "users", actualUsername);
                await setDoc(userRef, {
                    fullname: fullname,
                    username: actualUsername,
                    role: role,
                    createdAt: new Date().toISOString()
                }, { merge: true });

                // Mark the invite token as used so it cannot be reused
                if (role === 'teacher') {
                    await markTokenUsed(teacherCode, actualUsername);
                }

                setModal({ show: true, title: 'Account Created!', message: 'Redirecting to login...', type: 'loading' });

                // Firebase signs the user in automatically right after
                // createUserWithEmailAndPassword. Sign them back out so the
                // login screen they land on actually requires a real login,
                // instead of silently being authenticated already.
                await signOut(auth);

                setTimeout(() => {
                    setModal({ show: false, title: '', message: '', type: '' });
                    resetFormFields();
                    setIsLoginView(true);
                }, 800);
            } catch (error) {
                console.error("Firebase Registration Error:", error.code, error.message);
                let errorMessage = `Error: ${error.message}`;
                if (error.code === 'auth/email-already-in-use') errorMessage = 'This username is already taken. Please choose another one.';
                if (error.code === 'auth/operation-not-allowed') errorMessage = 'Email/Password sign-in is not enabled in Firebase Console.';
                if (error.code === 'permission-denied' || error.message.includes('permissions')) errorMessage = 'Firestore Rules are blocking registration! Set rules to allow read/write.';
                if (error.code === 'auth/configuration-not-found') errorMessage = 'Firebase Authentication is not set up. Please click "Get Started" in the Auth tab of your Firebase console.';
                setModal({ show: true, title: 'Registration Failed', message: errorMessage, type: 'error' });
            }
        }
    };

    // ─── OAuth (Google, etc.) ─────────────────────────────────────────────────
    const handleOAuth = async (provider) => {
        // Validate invite token for teacher OAuth registrations
        if (!isLoginView && role === 'teacher') {
            if (!teacherCode.trim()) {
                setModal({ show: true, title: 'Registration Failed', message: 'Please enter your invite token before signing in with Google.', type: 'error' });
                return;
            }

            setModal({ show: true, title: 'Validating token...', message: 'Checking your invite token...', type: 'loading' });
            const tokenCheck = await validateInviteToken(teacherCode);

            if (!tokenCheck.valid) {
                setModal({ show: true, title: 'Registration Failed', message: tokenCheck.message, type: 'error' });
                return;
            }
        }

        try {
            const result = await signInWithPopup(auth, provider);

            setModal({ show: true, title: 'Authenticating...', message: 'Syncing your profile...', type: 'loading' });
            const user = result.user;

            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            let userData;
            if (!userSnap.exists()) {
                userData = {
                    fullname: user.displayName || 'AtomARix User',
                    username: user.uid,
                    role: role,
                    createdAt: new Date().toISOString()
                };
                await setDoc(userRef, userData);

                // Mark the invite token as used for new OAuth teacher accounts
                if (role === 'teacher') {
                    await markTokenUsed(teacherCode, user.uid);
                }
            } else {
                userData = userSnap.data();
            }

            sessionStorage.setItem('loggedInUser', userData.username);
            sessionStorage.setItem('userRole', userData.role);
            sessionStorage.setItem('userFullname', userData.fullname);

            setModal({ show: true, title: 'Success!', message: 'Logging you in...', type: 'loading' });
            setTimeout(() => {
                navigate(userData.role === 'teacher' ? '/dashboard' : '/home');
            }, 500);
        } catch (error) {
            console.error("OAuth Error:", error.code, error.message);
            let errorMessage = `Authentication failed. (${error.code})`;
            if (error.code === 'auth/popup-closed-by-user') errorMessage = 'Sign-in popup was closed.';
            if (error.code === 'auth/account-exists-with-different-credential') errorMessage = 'An account already exists with the same email address but different sign-in credentials.';
            setModal({ show: true, title: 'Login Failed', message: errorMessage, type: 'error' });
        }
    };

    // ─── Form field renderer ──────────────────────────────────────────────────
    const renderFormFields = () => {
        const roleSelectorJSX = (
            <div className="input-group">
                <label>I am a:</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <button
                        type="button"
                        onClick={() => setRole('student')}
                        style={{ flex: 1, padding: '12px', border: role === 'student' ? '2px solid #4facfe' : '1px solid #e1e1e1', backgroundColor: role === 'student' ? '#eaf4ff' : '#f8f9fa', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: role === 'student' ? '#4facfe' : '#666', transition: 'all 0.2s' }}
                    >
                        <i className="fas fa-user-graduate" style={{ marginRight: '8px' }}></i> Student
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('teacher')}
                        // Lock role selector if token came from an invite URL
                        disabled={tokenFromUrl}
                        style={{ flex: 1, padding: '12px', border: role === 'teacher' ? '2px solid #6e45e2' : '1px solid #e1e1e1', backgroundColor: role === 'teacher' ? '#f3f0ff' : '#f8f9fa', borderRadius: '10px', cursor: tokenFromUrl ? 'default' : 'pointer', fontWeight: '600', color: role === 'teacher' ? '#6e45e2' : '#666', transition: 'all 0.2s' }}
                    >
                        <i className="fas fa-chalkboard-teacher" style={{ marginRight: '8px' }}></i> Teacher
                    </button>
                </div>
            </div>
        );

        // Password strength for registration
        let strengthScore = 0;
        if (password) {
            if (password.length > 5) strengthScore += 1;
            if (password.length > 7) strengthScore += 1;
            if (/\d/.test(password)) strengthScore += 1;
            if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) strengthScore += 1;
        }
        const strengthWidth = password ? `${Math.max(15, (strengthScore / 4) * 100)}%` : '0%';
        const strengthColor = strengthScore <= 1 ? '#ff4b2b' : strengthScore === 2 ? '#feca57' : strengthScore === 3 ? '#1dd1a1' : '#10ac84';

        if (isLoginView) {
            return (
                <>
                    {roleSelectorJSX}
                    {role === 'student' ? (
                        <div className="input-group">
                            <label htmlFor="username">Username</label>
                            <div className="input-icon-wrapper">
                                <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. atomarix123" required />
                                {username && <i className="fas fa-times-circle clear-icon" onClick={() => setUsername('')} title="Clear"></i>}
                            </div>
                        </div>
                    ) : (
                        <div className="input-group">
                            <label htmlFor="fullname">Full Name</label>
                            <div className="input-icon-wrapper">
                                <input type="text" id="fullname" value={fullname} onChange={e => setFullname(e.target.value)} placeholder="e.g. Atomarix User" required />
                                {fullname && <i className="fas fa-times-circle clear-icon" onClick={() => setFullname('')} title="Clear"></i>}
                            </div>
                        </div>
                    )}
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-wrapper">
                            <input type={showPassword ? "text" : "password"} id="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`} onClick={() => setShowPassword(!showPassword)}></i>
                        </div>
                    </div>
                    <div className="remember-me">
                        <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                        <label htmlFor="rememberMe" style={{ display: 'inline', margin: 0, fontWeight: 500, color: '#666' }}>Remember Me</label>
                    </div>
                </>
            );
        }

        // ── Registration fields ───────────────────────────────────────────────
        return (
            <>
                <div className="input-group">
                    <label htmlFor="fullname">Full Name</label>
                    <div className="input-icon-wrapper">
                        <input type="text" id="fullname" value={fullname} onChange={e => setFullname(e.target.value)} placeholder="e.g. Atomarix User" required />
                        {fullname && <i className="fas fa-times-circle clear-icon" onClick={() => setFullname('')} title="Clear"></i>}
                    </div>
                </div>
                {roleSelectorJSX}

                {/* Invite token field — shown only for teacher registration */}
                {role === 'teacher' && (
                    <div className="input-group">
                        <label htmlFor="teacherCode">
                            Invite Token
                            {tokenFromUrl && (
                                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#10ac84', fontWeight: 500 }}>
                                    <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>Token applied from invite link
                                </span>
                            )}
                        </label>
                        <div className="input-icon-wrapper">
                            <input
                                type="text"
                                id="teacherCode"
                                value={teacherCode}
                                onChange={e => setTeacherCode(e.target.value)}
                                placeholder="e.g. TK-A3F9X2"
                                readOnly={tokenFromUrl}
                                style={tokenFromUrl ? { backgroundColor: '#f0fff8', color: '#10ac84', cursor: 'default' } : {}}
                                required
                            />
                            {!tokenFromUrl && teacherCode && (
                                <i className="fas fa-times-circle clear-icon" onClick={() => setTeacherCode('')} title="Clear"></i>
                            )}
                        </div>
                        {!tokenFromUrl && (
                            <small style={{ color: '#999', marginTop: '4px', display: 'block' }}>
                                Ask your admin for an invite token or link.
                            </small>
                        )}
                    </div>
                )}

                {role === 'student' && (
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <div className="input-icon-wrapper">
                            <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. atomarix123" required />
                            {username && <i className="fas fa-times-circle clear-icon" onClick={() => setUsername('')} title="Clear"></i>}
                        </div>
                    </div>
                )}

                <div className="input-group">
                    <label htmlFor="password">Create Password</label>
                    <div className="password-wrapper">
                        <input type={showPassword ? "text" : "password"} id="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`} onClick={() => setShowPassword(!showPassword)}></i>
                    </div>
                    {password && (
                        <div className="strength-meter"><div className="strength-meter-bar" style={{ width: strengthWidth, backgroundColor: strengthColor }}></div></div>
                    )}
                </div>
                <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="password-wrapper">
                        <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}></i>
                    </div>
                    <small className="error-message">{passwordError}</small>
                </div>
            </>
        );
    };

    // ─── Floating chemistry background ────────────────────────────────────────
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
        <div className="container" style={{ position: 'relative' }}>
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
            <div className="left-panel" style={{ position: 'relative', zIndex: 1 }}>
                <div className="brand"><i className="fas fa-atom logo-icon"></i><h1>AtomARix</h1></div>
                <p className="tagline">Master the Periodic Table through Interactive Learning</p>
                <div className="feature-list">
                    <div className="feature-item"><div className="icon-box"><i className="fas fa-flask"></i></div><div><h3>Interactive Elements</h3><p>Explore 118 elements with detailed information</p></div></div>
                    <div className="feature-item"><div className="icon-box"><i className="fas fa-bolt"></i></div><div><h3>Engaging Quizzes</h3><p>Test your knowledge with fun challenges</p></div></div>
                    <div className="feature-item"><div className="icon-box"><i className="fas fa-trophy"></i></div><div><h3>Achievements & Rewards</h3><p>Earn badges and compete on leaderboards</p></div></div>
                </div>
            </div>
            <div className="right-panel" style={{ position: 'relative', zIndex: 1 }}>
                <div className="toggle-container">
                    <button className={`toggle-btn ${isLoginView ? 'active' : ''}`} onClick={() => setIsLoginView(true)}>Login</button>
                    <button className={`toggle-btn ${!isLoginView ? 'active' : ''}`} onClick={() => setIsLoginView(false)}>Register</button>
                </div>
                <div className="form-card">
                    <h2 id="formTitle">{isLoginView ? 'Hi there, Welcome!' : 'Create Account'}</h2>
                    <p id="formSubtitle">{isLoginView ? 'Login to continue your learning journey' : 'Join us and start your learning journey today!'}</p>
                    <form id="authForm" onSubmit={handleFormSubmit}>
                        <div id="dynamicFields">{renderFormFields()}</div>
                        <button type="submit" className="login-submit" id="submitBtn">{isLoginView ? 'Login' : 'Create Account'}</button>
                    </form>
                </div>
            </div>
            {modal.show && (
                <div className="auth-modal-container show">
                    <div className="auth-modal-content">
                        <div className={`modal-icon-wrapper ${modal.type}`}>
                            {modal.type === 'loading' ? (
                                <div className="spinner"></div>
                            ) : (
                                <i className={`fas ${modal.type === 'success' ? 'fa-check' : 'fa-exclamation'}`}></i>
                            )}
                        </div>
                        <h2 className="modal-title">{modal.title}</h2>
                        <p id="modalMessage">{modal.message}</p>
                        {modal.type !== 'loading' && (
                            <button className="modal-close-btn" onClick={() => setModal({ ...modal, show: false })}>Close</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
