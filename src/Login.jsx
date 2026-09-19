import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

//Schools list 
const SCHOOLS = [
    'Bataan National High School',
    'Bataan Peninsula State University',
    'City of Balanga National High School',
    'Balanga City National Science High School',
    'Bagac National High School',
    'Orani National High School',
    'Pilar National High School',
    'Pablo Roman National High School',
    'Orion National High School',
    'Dinalupihan National High School',
    'Mariveles National High School',
    'Abucay National High School',
    'Tomas del Rosario College',
    'Bonifacio Camacho National High School',
    'Mabatang National High School',
    'Asia Pacific College of Advanced Studies',
    'Eastwoods College of Science & Technology',
    'Eastwoods Academy of Science & Technology'
];

export default function Login() {
    const navigate = useNavigate();

    const [isLoginView, setIsLoginView] = useState(true);

    // Form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullname, setFullname] = useState('');
    const [role, setRole] = useState('student');
    const [teacherCode, setTeacherCode] = useState('');
    const [teacherSchool, setTeacherSchool] = useState('');
    const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [showPasswordReqs, setShowPasswordReqs] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

    
    const [tokenFromUrl, setTokenFromUrl] = useState(false);

    const [showRequestAccess, setShowRequestAccess] = useState(false);
    const [requestFullName, setRequestFullName] = useState('');
    const [requestEmail, setRequestEmail] = useState('');
    const [requestSchool, setRequestSchool] = useState('');
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [requestSubmitted, setRequestSubmitted] = useState(false);

    // Modal state
    const [modal, setModal] = useState({ show: false, title: '', message: '', type: 'error' });

    const resetFormFields = () => {
        setUsername('');
        setPassword('');
        setFullname('');
        setConfirmPassword('');
        setPasswordError('');
        setPasswordTouched(false);
        setSubmitAttempted(false);
        setShowPasswordReqs(false);
        setTeacherCode('');
        setTeacherSchool('');
        setRequestSchool('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');

        if (urlToken) {
            setTeacherCode(urlToken);
            setTokenFromUrl(true);
            setIsLoginView(false);
            setRole('teacher');
        } else {
            const savedUser = localStorage.getItem('rememberedUser');
            if (savedUser) {
                setUsername(savedUser);
                const savedRole = localStorage.getItem('rememberedRole');
                if (savedRole) setRole(savedRole);
                setRememberMe(true);
            }
        }
    }, []);

    // Token validator 
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

    // Mark token as used after successful registration 
    const markTokenUsed = async (token, usedByUsername) => {
        const tokenRef = doc(db, 'teacherInvites', token.trim());
        await setDoc(tokenRef, {
            used: true,
            usedBy: usedByUsername,
            usedAt: new Date().toISOString()
        }, { merge: true });
    };

    const submitAccessRequest = async (e) => {
        e.preventDefault();
        if (!requestFullName.trim() || !requestEmail.trim() || !requestSchool.trim()) {
            setModal({ show: true, title: 'Missing Information', message: 'Please fill in all fields before submitting.', type: 'error' });
            return;
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(requestEmail.trim())) {
            setModal({ show: true, title: 'Invalid Email', message: 'Please enter a valid email address.', type: 'error' });
            return;
        }

        setIsSubmittingRequest(true);
        try {
            await addDoc(collection(db, 'teacherRequests'), {
                fullName: requestFullName.trim(),
                username: username.trim(),
                school:   requestSchool.trim(),
                email:    requestEmail.trim().toLowerCase(),
                status: 'pending',
                requestedAt: new Date().toISOString(),
                reviewedAt: null,
                reviewedBy: null,
                tokenGenerated: null,
            });

            // notify admin of new teacher request
            try {
                const ejsResult = await emailjs.send(
                    'service_vofm2hx',
                    'template_qbpqaca',
                    {
                        from_name:   requestFullName.trim(),
                        from_email:  requestEmail.trim(),
                        from_school: requestSchool.trim(),
                        admin_url:   `${window.location.origin}/admin/tokens`,
                    },
                    'D6R6Iv2q_dahXJqDg'
                );
                console.log('EmailJS sent:', ejsResult.status, ejsResult.text);
            } catch (ejsErr) {
                console.error('EmailJS admin notify failed:', ejsErr);
                console.error('EmailJS error details:', JSON.stringify(ejsErr));
            }

            setRequestSubmitted(true);
        } catch (err) {
            console.error('Failed to submit access request:', err);
            setModal({ show: true, title: 'Something went wrong', message: 'Could not submit your request. Please try again.', type: 'error' });
        }
        setIsSubmittingRequest(false);
    };

    // Form submit 
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const actualUsername = username.trim();
        const authEmail = `${actualUsername.replace(/\s+/g, '').toLowerCase()}@atomarix.com`;

        if (isLoginView) {
            setModal({ show: true, title: 'Authenticating...', message: 'Checking credentials...', type: 'loading' });

            // ── Admin check — runs BEFORE the main try/catch ─────────────────
            // Completely isolated so any Firestore error here never reaches
            // the outer catch that shows "Login Failed" to the user.
            try {
                const adminSnap = await getDoc(doc(db, 'adminConfig', 'credentials'));
                if (adminSnap.exists()) {
                    const adminData = adminSnap.data();
                    if (
                        actualUsername.toLowerCase() === (adminData.username || '').toLowerCase() &&
                        password === adminData.password
                    ) {
                        sessionStorage.setItem('loggedInUser', adminData.username);
                        sessionStorage.setItem('userRole', 'admin');
                        sessionStorage.setItem('userFullname', 'Admin');
                        setModal({ show: false, title: '', message: '', type: '' });
                        navigate('/admin/tokens');
                        return;
                    }
                }
            } catch (adminErr) {
                // adminConfig unreadable or missing — not an admin, continue to normal login
                console.warn('adminConfig check skipped:', adminErr.code);
            }

            try {
                // ── Step 1: Sign in with Firebase Auth first ─────────────────
                // Build the auth email from what the user typed. After auth
                // succeeds the user is authenticated and Firestore reads work.
                const authEmail = `${actualUsername.replace(/\s+/g, '').toLowerCase()}@atomarix.com`;
                await signInWithEmailAndPassword(auth, authEmail, password);

                // ── Step 2: Now fetch their Firestore profile (auth is set) ──
                const userRef = doc(db, "users", actualUsername);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    // Signed into Auth but no Firestore profile — sign out and fail
                    await auth.signOut();
                    setModal({ show: true, title: 'Login Failed', message: 'No account found with that username. Please check your username and try again.', type: 'error' });
                    return;
                }

                const userData = userSnap.data();

                if (userData.active === false) {
                    await auth.signOut();
                    setModal({ show: true, title: 'Access Denied', message: 'Your account has been deactivated. Please contact your admin.', type: 'error' });
                    return;
                }

                // ── Step 3: Store session and redirect ────────────────────────
                sessionStorage.setItem('loggedInUser', userData.username || actualUsername);
                sessionStorage.setItem('userRole', userData.role);
                sessionStorage.setItem('userFullname', userData.fullname);

                if (rememberMe) {
                    localStorage.setItem('rememberedUser', userData.username || actualUsername);
                    localStorage.setItem('rememberedRole', userData.role);
                } else {
                    localStorage.removeItem('rememberedUser');
                    localStorage.removeItem('rememberedRole');
                }

                setModal({ show: true, title: 'Success!', message: 'Logging you in...', type: 'loading' });
                setTimeout(() => {
                    if (userData.role === 'teacher') navigate('/dashboard');
                    else navigate('/home');
                }, 500);
            } catch (error) {
                console.error("Firebase Login Error:", error.code, error.message);
                let errorMessage = 'Invalid username or password.';
                if (error.code === 'auth/network-request-failed') errorMessage = 'Network error. Please check your connection.';
                if (error.code === 'auth/invalid-credential') errorMessage = 'Incorrect password. Please try again.';
                if (error.code === 'auth/configuration-not-found') errorMessage = 'Firebase Authentication is not set up. Please click "Get Started" in the Auth tab of your Firebase console.';
                setModal({ show: true, title: 'Login Failed', message: errorMessage, type: 'error' });
            }
        } else {
            // Registration 
            setPasswordError('');
            setSubmitAttempted(true);
            const ALLOWED_CHARS = /^[A-Za-z0-9!@#$%^&*\-_.]+$/;

            if (password.length < 8) {
                setPasswordError('Password must be at least 8 characters long.');
                return;
            }
            if (password.length > 128) {
                setPasswordError('Password must not exceed 128 characters.');
                return;
            }
            if (!/[A-Z]/.test(password)) {
                setPasswordError('Password must include at least one uppercase letter (A–Z).');
                return;
            }
            if (!/[a-z]/.test(password)) {
                setPasswordError('Password must include at least one lowercase letter (a–z).');
                return;
            }
            if (!/\d/.test(password)) {
                setPasswordError('Password must include at least one number (0–9).');
                return;
            }
            if (!ALLOWED_CHARS.test(password)) {
                setPasswordError('Password contains invalid characters. Only letters, numbers, and ! @ # $ % ^ & * - _ . are allowed.');
                return;
            }
            if (password !== confirmPassword) {
                setPasswordError('Passwords do not match. Please try again.');
                return;
            }

            // Validate invite token for teacher registrations
            if (role === 'teacher') {
                if (!username.trim()) {
                    setModal({ show: true, title: 'Registration Failed', message: 'Please enter a username for your teacher account.', type: 'error' });
                    return;
                }
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
                    fullname: fullname.trim() || actualUsername,
                    username: actualUsername,
                    role: role,
                    ...(role === 'teacher' && teacherSchool && { school: teacherSchool.trim() }),
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
            <div className="input-group" style={{ position: 'relative' }}>
                <label>I am a:</label>

                {/* ── Trigger ── */}
                <div
                    onClick={() => !tokenFromUrl && setRoleDropdownOpen(o => !o)}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', marginTop: '5px',
                        border: roleDropdownOpen ? '2px solid #4facfe' : '1px solid #e1e1e1',
                        borderRadius: '10px', background: '#f8f9fa',
                        cursor: tokenFromUrl ? 'default' : 'pointer',
                        transition: 'border-color 0.2s', userSelect: 'none',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, background: role === 'student' ? '#eaf4ff' : '#f3f0ff', color: role === 'student' ? '#4facfe' : '#6e45e2' }}>
                            <i className={`fas ${role === 'student' ? 'fa-user-graduate' : 'fa-chalkboard-teacher'}`}></i>
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', color: '#2d3436', fontSize: '0.95rem', lineHeight: 1 }}>{role === 'student' ? 'Student' : 'Teacher'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '3px' }}>{role === 'student' ? 'Learn the elements and more' : 'Create and manage classrooms'}</div>
                        </div>
                    </div>
                    {!tokenFromUrl && (
                        <i className="fas fa-chevron-down" style={{ color: '#aaa', fontSize: '0.8rem', transition: 'transform 0.2s', transform: roleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
                    )}
                </div>

                {/* ── Dropdown menu ── */}
                {roleDropdownOpen && !tokenFromUrl && (
                    <>
                        {/* Invisible backdrop to close on outside click */}
                        <div onClick={() => setRoleDropdownOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }}></div>
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e1e1e1', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 20, overflow: 'hidden' }}>
                            {[
                                { value: 'student', icon: 'fa-user-graduate',      label: 'Student', sub: 'Learn the elements and more',        color: '#4facfe', bg: '#eaf4ff' },
                                { value: 'teacher', icon: 'fa-chalkboard-teacher', label: 'Teacher', sub: 'Create and manage classrooms',     color: '#6e45e2', bg: '#f3f0ff' },
                            ].map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => { setRole(opt.value); resetFormFields(); setRoleDropdownOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', background: role === opt.value ? (opt.value === 'student' ? '#f0f8ff' : '#f5f0ff') : '#fff', borderBottom: '1px solid #f0f2f5', transition: 'background 0.15s' }}
                                    onMouseEnter={e => { if (role !== opt.value) e.currentTarget.style.background = '#f8f9fa'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = role === opt.value ? (opt.value === 'student' ? '#f0f8ff' : '#f5f0ff') : '#fff'; }}>
                                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: opt.bg, color: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                        <i className={`fas ${opt.icon}`}></i>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', color: '#2d3436', fontSize: '0.92rem' }}>{opt.label}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>{opt.sub}</div>
                                    </div>
                                    {role === opt.value && (
                                        <i className="fas fa-check-circle" style={{ color: opt.color, fontSize: '1rem', flexShrink: 0 }}></i>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );

        // Password strength for registration
        // Rules: min 8 chars, max 128, requires uppercase, lowercase,
        // number, allowed special chars only (!@#$%^&*), no spaces
        const ALLOWED_SPECIAL = /^[A-Za-z0-9!@#$%^&*\-_.]+$/;
        let strengthScore = 0;
        let strengthLabel = '';
        if (password) {
            if (password.length >= 8)  strengthScore += 1;
            if (password.length >= 12) strengthScore += 1;
            if (/[A-Z]/.test(password)) strengthScore += 1;
            if (/[a-z]/.test(password)) strengthScore += 1;
            if (/\d/.test(password))    strengthScore += 1;
            if (/[!@#$%^&*\-_.]/.test(password)) strengthScore += 1;
        }
        const strengthWidth = password ? `${Math.max(10, (strengthScore / 6) * 100)}%` : '0%';
        const strengthColor = strengthScore <= 2 ? '#ff4b2b' : strengthScore <= 3 ? '#feca57' : strengthScore <= 4 ? '#1dd1a1' : '#10ac84';
        const strengthLabel2 = strengthScore <= 2 ? 'Weak' : strengthScore <= 3 ? 'Fair' : strengthScore <= 4 ? 'Good' : 'Strong';

        if (isLoginView) {
            return (
                <>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <div className="input-icon-wrapper">
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                            />
                            {username && <i className="fas fa-times-circle clear-icon" onClick={() => setUsername('')} title="Clear"></i>}
                        </div>
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-wrapper">
                            <input type={showPassword ? "text" : "password"} id="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`} onClick={() => setShowPassword(!showPassword)}></i>
                        </div>
                    </div>
                    <div className="remember-me" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                            <label htmlFor="rememberMe" style={{ display: 'inline', margin: 0, fontWeight: 500, color: '#666' }}>Remember Me</label>
                        </div>
                    </div>
                </>
            );
        }

        // ── Registration fields ───────────────────────────────────────────────
        return (
            <>
                {/* Role dropdown — always first */}
                {roleSelectorJSX}

                {/* Student registration: full name + username */}
                {role === 'student' && (
                    <>
                        <div className="input-group">
                            <label htmlFor="fullname">Full Name</label>
                            <div className="input-icon-wrapper">
                                <input type="text" id="fullname" value={fullname} onChange={e => setFullname(e.target.value)} placeholder="e.g. Juan Dela Cruz" required />
                                {fullname && <i className="fas fa-times-circle clear-icon" onClick={() => setFullname('')} title="Clear"></i>}
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="username">Username</label>
                            <div className="input-icon-wrapper">
                                <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. juandelacruz123" required />
                                {username && <i className="fas fa-times-circle clear-icon" onClick={() => setUsername('')} title="Clear"></i>}
                            </div>
                        </div>
                    </>
                )}

                {/* Teacher registration: full name + username */}
                {role === 'teacher' && (
                    <>
                        <div className="input-group">
                            <label htmlFor="fullname">Full Name</label>
                            <div className="input-icon-wrapper">
                                <input type="text" id="fullname" value={fullname} onChange={e => setFullname(e.target.value)} placeholder="e.g. Juan Dela Cruz" required />
                                {fullname && <i className="fas fa-times-circle clear-icon" onClick={() => setFullname('')} title="Clear"></i>}
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="username">Username</label>
                            <div className="input-icon-wrapper">
                                <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. juandelacruz123" required />
                                {username && <i className="fas fa-times-circle clear-icon" onClick={() => setUsername('')} title="Clear"></i>}
                            </div>
                        </div>
                    </>
                )}

                {/* Invite token + school — shown only for teacher registration */}
                {role === 'teacher' && !showRequestAccess && (
                    <>
                        <div className="input-group" style={{ position: 'relative' }}>
                            <label htmlFor="teacherSchool">School / Institution</label>
                            <div className="input-icon-wrapper">
                                <input
                                    type="text"
                                    id="teacherSchool"
                                    value={teacherSchool}
                                    onChange={e => {
                                        setTeacherSchool(e.target.value);
                                        setSchoolDropdownOpen(e.target.value.trim().length > 0);
                                    }}
                                    onFocus={() => teacherSchool.trim().length > 0 && setSchoolDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setSchoolDropdownOpen(false), 150)}
                                    placeholder="e.g. Bataan National High School"
                                    autoComplete="off"
                                    required
                                />
                                {teacherSchool && <i className="fas fa-times-circle clear-icon" onClick={() => { setTeacherSchool(''); setSchoolDropdownOpen(false); }} title="Clear"></i>}
                            </div>

                            {/* ── Suggestion dropdown ── */}
                            {schoolDropdownOpen && (() => {
                                const filtered = SCHOOLS.filter(s =>
                                    s.toLowerCase().includes(teacherSchool.toLowerCase().trim())
                                );
                                if (filtered.length === 0) return null;
                                return (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e1e1e1', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                                        {filtered.map((school, i) => (
                                            <div
                                                key={i}
                                                onMouseDown={() => {
                                                    setTeacherSchool(school);
                                                    setSchoolDropdownOpen(false);
                                                }}
                                                style={{ padding: '11px 16px', cursor: 'pointer', fontSize: '0.9rem', color: '#2d3436', borderBottom: i < filtered.length - 1 ? '1px solid #f0f2f5' : 'none', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f3f0ff'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                            >
                                                <i className="fas fa-school" style={{ color: '#6e45e2', fontSize: '0.8rem', flexShrink: 0 }}></i>
                                                {/* Highlight the matched portion */}
                                                {(() => {
                                                    const idx = school.toLowerCase().indexOf(teacherSchool.toLowerCase().trim());
                                                    if (idx === -1) return school;
                                                    return (
                                                        <>
                                                            {school.slice(0, idx)}
                                                            <strong style={{ color: '#6e45e2' }}>{school.slice(idx, idx + teacherSchool.trim().length)}</strong>
                                                            {school.slice(idx + teacherSchool.trim().length)}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
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
                                    Ask your admin for an invite token or link, or{' '}
                                    <span
                                        onClick={() => {
                                            if (!fullname.trim()) {
                                                setModal({ show: true, title: 'Fill in your details first', message: 'Please enter your Full Name before requesting a token.', type: 'error' });
                                                return;
                                            }
                                            if (!username.trim()) {
                                                setModal({ show: true, title: 'Fill in your details first', message: 'Please enter your Username before requesting a token.', type: 'error' });
                                                return;
                                            }
                                            if (!teacherSchool.trim()) {
                                                setModal({ show: true, title: 'Fill in your details first', message: 'Please enter your School / Institution before requesting a token.', type: 'error' });
                                                return;
                                            }
                                            setRequestFullName(fullname.trim());
                                            setRequestSchool(teacherSchool.trim());
                                            setShowRequestAccess(true);
                                        }}
                                        style={{ color: '#4facfe', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        request one here
                                    </span>.
                                </small>
                            )}
                        </div>
                    </>
                )}

                {/* Request-access form — for a teacher with no token yet. Submits a
                    pending request the admin reviews; nothing else happens here
                    until the admin approves it on their end. */}
                {role === 'teacher' && showRequestAccess && (
                    <div className="input-group" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e1e1e1' }}>
                        {requestSubmitted ? (
                            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', color: '#1dd1a1', marginBottom: '12px', display: 'block' }}></i>
                                <p style={{ color: '#2d3436', fontWeight: 700, marginBottom: '8px', fontSize: '1rem' }}>Request submitted!</p>
                                <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '6px' }}>
                                    Your request has been sent to the admin. Once approved, you'll receive an invite token at:
                                </p>
                                <p style={{ color: '#4facfe', fontWeight: 600, fontSize: '0.88rem', marginBottom: '14px' }}>{requestEmail}</p>
                                <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '16px' }}>
                                    Come back here and enter your token in the <strong>Invite Token</strong> field to complete your registration.
                                    Don't forget to check your <strong>spam or junk folder</strong> if you don't see it in your inbox.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setShowRequestAccess(false); setRequestSubmitted(false); setRequestFullName(''); setRequestEmail(''); setRequestSchool(''); }}
                                    style={{ padding: '10px 24px', borderRadius: '50px', border: 'none', background: '#6e45e2', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                                >
                                    Back to Registration
                                </button>
                            </div>
                        ) : (
                            <>
                                <p style={{ color: '#2d3436', fontWeight: 600, marginBottom: '6px', fontSize: '0.95rem' }}>
                                    <i className="fas fa-user-clock" style={{ marginRight: '6px', color: '#4facfe' }}></i>
                                    Request Teacher Access
                                </p>
                                <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '14px' }}>
                                    Your name and school are pre-filled. Just add your email so the admin can send your token.
                                </p>

                                {/* Full Name — read-only pre-filled */}
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#555', fontSize: '0.85rem' }}>Full Name</label>
                                    <div style={{ padding: '11px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '0.95rem', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fas fa-check-circle" style={{ color: '#1dd1a1', flexShrink: 0 }}></i>
                                        {requestFullName}
                                    </div>
                                </div>

                                {/* School — read-only pre-filled */}
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#555', fontSize: '0.85rem' }}>School / Institution</label>
                                    <div style={{ padding: '11px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '0.95rem', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fas fa-check-circle" style={{ color: '#1dd1a1', flexShrink: 0 }}></i>
                                        {requestSchool}
                                    </div>
                                </div>

                                {/* Email — editable */}
                                <div style={{ marginBottom: '0' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#555', fontSize: '0.85rem' }}>Email Address <span style={{ color: '#e74c3c' }}>*</span></label>
                                    <input
                                        type="email"
                                        value={requestEmail}
                                        onChange={e => setRequestEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        style={{ width: '100%', padding: '11px 14px', border: '1px solid #e1e1e1', borderRadius: '10px', fontSize: '0.95rem', background: '#f8f9fa', outline: 'none', boxSizing: 'border-box' }}
                                        required
                                    />
                                    <small style={{ color: '#999', marginTop: '4px', display: 'block' }}>Your token will be sent here once approved.</small>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowRequestAccess(false); setRequestEmail(''); }}
                                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e1e1e1', background: 'white', color: '#666', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submitAccessRequest}
                                        disabled={isSubmittingRequest}
                                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#4facfe', color: 'white', fontWeight: 600, cursor: isSubmittingRequest ? 'not-allowed' : 'pointer', opacity: isSubmittingRequest ? 0.7 : 1 }}
                                    >
                                        {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="input-group">
                    <label htmlFor="password">Create Password</label>

                    {/* Prohibited character warning — only shows when user types a bad char */}
                    {password && !/^[A-Za-z0-9!@#$%^&*\-_.]*$/.test(password) && (
                        <div style={{ marginBottom: '8px', fontSize: '0.75rem', color: '#e74c3c', display: 'flex', alignItems: 'flex-start', gap: '6px', background: '#fff0f0', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            <i className="fas fa-exclamation-triangle" style={{ marginTop: '2px', flexShrink: 0 }}></i>
                            <span>Spaces and other special characters are not allowed. Only letters, numbers, and <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>! @ # $ % ^ &amp; * - _ .</span> are permitted.</span>
                        </div>
                    )}

                    <div className="password-wrapper">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={e => {
                                const val = e.target.value;
                                const hasProhibited = /[^A-Za-z0-9!@#$%^&*\-_.]/.test(val);
                                if (!hasProhibited) setPassword(val);
                                setPasswordTouched(true);
                                if (!showPasswordReqs) setShowPasswordReqs(true);
                            }}
                            onFocus={() => setShowPasswordReqs(true)}
                            onBlur={() => setPasswordTouched(true)}
                            placeholder="Enter your password"
                            required
                        />
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`} onClick={() => setShowPassword(!showPassword)}></i>
                    </div>

                    {/* Strength meter */}
                    {password && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <div className="strength-meter" style={{ flex: 1, marginTop: 0 }}>
                                <div className="strength-meter-bar" style={{ width: strengthWidth, backgroundColor: strengthColor }}></div>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: strengthColor, minWidth: '38px' }}>{strengthLabel2}</span>
                        </div>
                    )}

                    {/* Requirements checklist — appears when field is focused */}
                    {showPasswordReqs && (
                        <div style={{ marginTop: '10px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {[
                                { ok: password.length >= 8,             label: 'At least 8 characters'        },
                                { ok: /\d/.test(password),              label: 'At least 1 number'            },
                                { ok: /[a-z]/.test(password),           label: 'At least 1 lowercase letter'  },
                                { ok: /[A-Z]/.test(password),           label: 'At least 1 uppercase letter'  },
                                { ok: /[!@#$%^&*\-_.]/.test(password), label: 'At least 1 special character' },
                            ].map((req, i) => {
                                const touched = passwordTouched || submitAttempted;
                                const color = req.ok ? '#10ac84' : (touched && !req.ok) ? '#e74c3c' : '#bbb';
                                const icon  = req.ok ? 'fa-check-circle' : (touched && !req.ok) ? 'fa-times-circle' : 'fa-circle';
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.75rem', color }}>
                                        <i className={`fas ${icon}`} style={{ fontSize: '0.72rem' }}></i>
                                        {req.label}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="password-wrapper">
                        <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required />
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle-icon`} onClick={() => setShowConfirmPassword(!showConfirmPassword)}></i>
                    </div>
                    {confirmPassword && (
                        <div style={{ fontSize: '0.75rem', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px', color: password === confirmPassword ? '#10ac84' : '#e74c3c' }}>
                            <i className={`fas ${password === confirmPassword ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                            {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                        </div>
                    )}
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
            <div className="left-panel">
                {/* Floating Chemistry Background — scoped to left panel only */}
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
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            pointer-events: none;
                            z-index: 0;
                            overflow: hidden;
                        }
                        .floating-item {
                            position: absolute;
                            color: rgba(255,255,255,0.15);
                            bottom: -100px;
                            animation: float-up infinite linear;
                        }
                        @keyframes float-up {
                            0% { transform: translateY(0) rotate(0deg); }
                            100% { transform: translateY(-120%) rotate(360deg); }
                        }
                    `}
                </style>
                <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="brand"><i className="fas fa-atom logo-icon"></i><h1>AtomARix</h1></div>
                <p className="tagline">Master the Periodic Table through Interactive Learning</p>
                <div className="feature-list">
                    <div className="feature-item"><div className="icon-box"><i className="fas fa-flask"></i></div><div><h3>Interactive Elements</h3><p>Explore 118 elements with detailed information</p></div></div>
                    <div className="feature-item"><div className="icon-box"><i className="fas fa-bolt"></i></div><div><h3>Engaging Quizzes</h3><p>Test your knowledge with fun challenges</p></div></div>
                    <div className="feature-item"><div className="icon-box"><i className="fas fa-trophy"></i></div><div><h3>Achievements & Rewards</h3><p>Earn badges and compete on leaderboards</p></div></div>
                </div>
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
                        {(() => {
                            // For registration: disable button until all 5 requirements pass
                            const allReqsMet = !isLoginView && (
                                password.length >= 8 &&
                                /\d/.test(password) &&
                                /[a-z]/.test(password) &&
                                /[A-Z]/.test(password) &&
                                /[!@#$%^&*\-_.]/.test(password) &&
                                /^[A-Za-z0-9!@#$%^&*\-_.]*$/.test(password) &&
                                password === confirmPassword
                            );
                            const isDisabled = !isLoginView && !allReqsMet;
                            return (
                                <button
                                    type="submit"
                                    className="login-submit"
                                    id="submitBtn"
                                    disabled={isDisabled}
                                    style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                >
                                    {isLoginView ? 'Login' : 'Create Account'}
                                </button>
                            );
                        })()}
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
