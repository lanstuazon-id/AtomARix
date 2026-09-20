import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import {
    collection, getDocs, doc, setDoc, updateDoc, deleteDoc,
    orderBy, query, onSnapshot
} from 'firebase/firestore';
import emailjs from '@emailjs/browser';

// ── EmailJS credentials ───────────────────────────────────────────────────────
const EJS_SERVICE           = 'service_vofm2hx';
const EJS_APPROVAL_TEMPLATE = 'template_aqh4t0b';  // teacher approval
const EJS_PUBLIC_KEY        = 'D6R6Iv2q_dahXJqDg';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `TK-${seg()}-${seg()}`;
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
    purple:     '#6e45e2',
    purpleLight:'#f3f0ff',
    purpleBorder:'#d4c7f9',
    blue:       '#4facfe',
    blueLight:  '#eaf4ff',
    dark:       '#1a1a2e',
    text:       '#333',
    muted:      '#888',
    border:     '#e8e8e8',
    bg:         '#f5f6fa',
    white:      '#ffffff',
    green:      '#16a34a',
    greenLight: '#eaffee',
    red:        '#e53e3e',
    redLight:   '#fff0f0',
    amber:      '#d97706',
    amberLight: '#fff7e6',
};

const S = {
    layout:     { display: 'flex', height: '100vh', fontFamily: "'Segoe UI', sans-serif", background: C.bg, overflow: 'hidden' },
    sidebar:    { width: '220px', minWidth: '220px', background: C.dark, display: 'flex', flexDirection: 'column', padding: '0' },
    brand:      { padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
    brandTitle: { color: C.white, fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '0.02em' },
    brandSub:   { color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '3px' },
    nav:        { flex: 1, padding: '12px 0' },
    navItem:    (active) => ({
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                    color: active ? C.white : 'rgba(255,255,255,0.55)',
                    background: active ? 'rgba(110,69,226,0.45)' : 'transparent',
                    borderLeft: active ? `3px solid ${C.purple}` : '3px solid transparent',
                    transition: 'all 0.15s',
                }),
    navIcon:    { fontSize: '16px', width: '20px', textAlign: 'center' },
    main:       { flex: 1, overflow: 'auto', padding: '32px' },
    pageTitle:  { fontSize: '22px', fontWeight: '700', color: C.dark, margin: '0 0 4px' },
    pageSub:    { fontSize: '14px', color: C.muted, margin: '0 0 28px' },
    statsRow:   { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' },
    statCard:   (color, bg) => ({
                    background: C.white, borderRadius: '14px', padding: '20px 22px',
                    border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    borderTop: `4px solid ${color}`,
                }),
    statNum:    { fontSize: '28px', fontWeight: '800', color: C.dark, margin: '0 0 4px' },
    statLabel:  { fontSize: '13px', color: C.muted, margin: 0 },
    card:       { background: C.white, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
    cardHead:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' },
    cardTitle:  { fontSize: '16px', fontWeight: '700', color: C.dark, margin: 0 },
    cardSub:    { fontSize: '13px', color: C.muted, margin: '3px 0 0' },
    btn:        { padding: '9px 20px', borderRadius: '9px', border: 'none', background: C.purple, color: C.white, fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
    btnOutline: { padding: '8px 16px', borderRadius: '8px', border: `1px solid ${C.purple}`, background: C.white, color: C.purple, fontWeight: '600', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
    btnSm:      (color = C.red) => ({ padding: '5px 12px', borderRadius: '6px', border: `1px solid ${color}`, background: C.white, color, fontWeight: '600', fontSize: '12px', cursor: 'pointer' }),
    table:      { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th:         { textAlign: 'left', padding: '10px 14px', background: C.bg, color: C.muted, fontWeight: '700', borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap' },
    td:         { padding: '11px 14px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle', color: C.text },
    badge:      (type) => {
                    const map = {
                        teacher:  [C.purpleLight, C.purple],
                        student:  [C.blueLight,   C.blue],
                        active:   [C.greenLight,  C.green],
                        inactive: [C.redLight,    C.red],
                        used:     [C.redLight,    C.red],
                        expired:  [C.amberLight,  C.amber],
                        'Active': [C.greenLight,  C.green],
                    };
                    const [bg, color] = map[type] || [C.bg, C.muted];
                    return { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: bg, color };
                },
    input:      { padding: '9px 13px', borderRadius: '9px', border: `1px solid ${C.border}`, fontSize: '13px', color: C.text, background: C.white, outline: 'none' },
    select:     { padding: '9px 13px', borderRadius: '9px', border: `1px solid ${C.border}`, fontSize: '13px', color: C.text, background: C.white },
    mono:       { fontFamily: 'monospace', fontWeight: '600', color: '#3c2fa0', letterSpacing: '0.04em' },
    resultBox:  { marginTop: '18px', background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: '12px', padding: '18px' },
    linkBox:    { flex: 1, fontSize: '12px', color: C.muted, background: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 12px', fontFamily: 'monospace', wordBreak: 'break-all' },
};

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const NAV = [
    { id: 'overview',    icon: '📊', label: 'Overview'         },
    { id: 'users',       icon: '👥', label: 'Users'            },
    { id: 'requests',    icon: '📨', label: 'Pending Requests' },
    { id: 'tokens',      icon: '🔑', label: 'Invite Tokens'    },
    { id: 'maintenance', icon: '🔧', label: 'Maintenance'      },
];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Overview
// ═════════════════════════════════════════════════════════════════════════════

function Overview({ stats, loading }) {
    const cards = [
        { label: 'Total Students', value: stats.students, color: C.blue   },
        { label: 'Total Teachers', value: stats.teachers, color: C.purple },
        { label: 'Active Tokens',  value: stats.activeTokens,  color: C.green  },
        { label: 'Used Tokens',    value: stats.usedTokens,    color: C.amber  },
    ];

    return (
        <>
            <div style={S.pageTitle}>Overview</div>
            <div style={S.pageSub}>AtomARix</div>
            <div style={S.statsRow}>
                {cards.map(c => (
                    <div key={c.label} style={S.statCard(c.color)}>
                        <div style={S.statNum}>{loading ? '…' : c.value}</div>
                        <div style={S.statLabel}>{c.label}</div>
                    </div>
                ))}
            </div>
            <div style={S.card}>
                <div style={S.cardHead}>
                    <div>
                        <div style={S.cardTitle}>Quick Info</div>
                        <div style={S.cardSub}>How the system works</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {[
                        { icon: '🎓', title: 'Students', desc: 'Register freely with a username and password. No invite needed.' },
                        { icon: '👩‍🏫', title: 'Teachers', desc: 'Require a one-time invite token generated from this admin panel.' },
                        { icon: '🔑', title: 'Invite Tokens', desc: 'Each token can only be used once. Tokens expire based on the expiry you set.' },
                        { icon: '🚫', title: 'Deactivated Accounts', desc: 'Deactivated users are blocked from logging in but their data is kept.' },
                    ].map(item => (
                        <div key={item.title} style={{ background: C.bg, borderRadius: '10px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '22px' }}>{item.icon}</span>
                            <div>
                                <div style={{ fontWeight: '700', color: C.dark, fontSize: '14px', marginBottom: '4px' }}>{item.title}</div>
                                <div style={{ fontSize: '13px', color: C.muted, lineHeight: '1.5' }}>{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Users
// ═════════════════════════════════════════════════════════════════════════════

function Users({ users, loading, onRefresh }) {
    const [search, setSearch]     = useState('');
    const [roleFilter, setRole]   = useState('all');
    const [confirm, setConfirm]   = useState(null); // { uid, name, action }
    const [working, setWorking]   = useState(false);

    const filtered = users.filter(u => {
        const matchRole   = roleFilter === 'all' || u.role === roleFilter;
        const matchSearch = u.fullname?.toLowerCase().includes(search.toLowerCase()) ||
                            u.username?.toLowerCase().includes(search.toLowerCase());
        return matchRole && matchSearch;
    });

    const handleToggle = async () => {
        if (!confirm) return;
        setWorking(true);
        try {
            const userRef = doc(db, 'users', confirm.uid);
            await updateDoc(userRef, { active: confirm.action === 'activate' });
            await onRefresh();
        } catch (err) {
            console.error('Toggle error:', err);
            alert('Failed to update user. Check Firestore permissions.');
        }
        setWorking(false);
        setConfirm(null);
    };

    return (
        <>
            <div style={S.pageTitle}>Users</div>
            <div style={S.pageSub}>All registered students and teachers</div>
            <div style={S.card}>
                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <input
                        style={{ ...S.input, flex: 1, minWidth: '180px' }}
                        placeholder="Search by name or username…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select style={S.select} value={roleFilter} onChange={e => setRole(e.target.value)}>
                        <option value="all">All roles</option>
                        <option value="student">Students</option>
                        <option value="teacher">Teachers</option>
                    </select>
                    <button style={S.btnOutline} onClick={onRefresh}>↻ Refresh</button>
                </div>

                {loading ? (
                    <div style={{ color: C.muted, padding: '20px 0' }}>Loading users…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ color: C.muted, padding: '20px 0' }}>No users found.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={S.table}>
                            <thead>
                                <tr>
                                    <th style={S.th}>Full Name</th>
                                    <th style={S.th}>Username</th>
                                    <th style={S.th}>Role</th>
                                    <th style={S.th}>Status</th>
                                    <th style={S.th}>Registered</th>
                                    <th style={S.th}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => {
                                    const isActive = u.active !== false;
                                    return (
                                        <tr key={u.uid}>
                                            <td style={S.td}><strong>{u.fullname || '—'}</strong></td>
                                            <td style={S.td}><span style={S.mono}>{u.username}</span></td>
                                            <td style={S.td}><span style={S.badge(u.role)}>{u.role}</span></td>
                                            <td style={S.td}>
                                                <span style={S.badge(isActive ? 'active' : 'inactive')}>
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={S.td}>{formatDate(u.createdAt)}</td>
                                            <td style={S.td}>
                                                {isActive ? (
                                                    <button
                                                        style={S.btnSm(C.red)}
                                                        onClick={() => setConfirm({ uid: u.username, name: u.fullname, action: 'deactivate' })}
                                                    >
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <button
                                                        style={S.btnSm(C.green)}
                                                        onClick={() => setConfirm({ uid: u.username, name: u.fullname, action: 'activate' })}
                                                    >
                                                        Activate
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Confirm modal */}
            {confirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: C.white, borderRadius: '16px', padding: '32px', width: '360px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                        <div style={{ fontSize: '36px', marginBottom: '12px' }}>{confirm.action === 'deactivate' ? '🚫' : '✅'}</div>
                        <div style={{ fontSize: '17px', fontWeight: '700', color: C.dark, marginBottom: '8px' }}>
                            {confirm.action === 'deactivate' ? 'Deactivate Account?' : 'Activate Account?'}
                        </div>
                        <div style={{ fontSize: '14px', color: C.muted, marginBottom: '24px', lineHeight: '1.5' }}>
                            {confirm.action === 'deactivate'
                                ? `${confirm.name} will be blocked from logging in. Their data will be kept.`
                                : `${confirm.name} will be able to log in again.`}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button style={{ ...S.btnOutline, flex: 1 }} onClick={() => setConfirm(null)} disabled={working}>Cancel</button>
                            <button
                                style={{ ...S.btn, flex: 1, background: confirm.action === 'deactivate' ? C.red : C.green }}
                                onClick={handleToggle}
                                disabled={working}
                            >
                                {working ? 'Saving…' : confirm.action === 'deactivate' ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Pending Requests
// ═════════════════════════════════════════════════════════════════════════════

function PendingRequests() {
    const [requests, setRequests]     = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [expiryDays, setExpiryDays] = useState(7);
    // After approving, show the generated token + mailto for that request
    const [approvedResult, setApprovedResult] = useState(null); // { requestId, token, link, email, name }
    const [copied, setCopied] = useState('');

    // ── Real-time listener — updates the list the instant a teacher submits ──
    useEffect(() => {
        const q = query(collection(db, 'teacherRequests'), orderBy('requestedAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingList(false);
        }, (err) => {
            console.error('PendingRequests listener error:', err);
            setLoadingList(false);
        });
        return () => unsub();
    }, []);

    const copyText = (text, label) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(label);
            setTimeout(() => setCopied(''), 2000);
        });
    };

    // ── Approve: generate token in Firestore, update request status ───────────
    // No Cloud Function needed — everything happens client-side.
    // When EmailJS is ready, add the send call right after the Firestore writes.
    const handleApprove = async (request) => {
        const confirmed = window.confirm(
            `Approve ${request.fullName} (${request.email})?\n\nA token will be generated. You'll see a copy button and mailto link to send it to them.`
        );
        if (!confirmed) return;

        setProcessingId(request.id);
        try {
            const token = generateToken();
            const link  = `${window.location.origin}/register?token=${token}`;
            const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();

            // 1. Write the token to teacherInvites so Login.jsx can validate it
            await setDoc(doc(db, 'teacherInvites', token), {
                used: false,
                createdAt: new Date().toISOString(),
                expiresAt,
                createdBy: 'admin',
                forEmail:    request.email,
                forName:     request.fullName,
                forUsername: request.username || '',
                forSchool:   request.school   || '',
            });

            // 2. Mark the request as approved
            await updateDoc(doc(db, 'teacherRequests', request.id), {
                status: 'approved',
                reviewedAt: new Date().toISOString(),
                reviewedBy: 'admin',
                tokenGenerated: token,
            });

            // ── EmailJS — send token to teacher ───────────────────────────────
            try {
                const params = {
                    to_name:     request.fullName,
                    to_email:    request.email,
                    token:       token,
                    invite_link: link,
                    expiry_days: String(expiryDays),
                };
                console.log('EmailJS approval params:', params);
                const result = await emailjs.send(
                    EJS_SERVICE,
                    EJS_APPROVAL_TEMPLATE,
                    params,
                    EJS_PUBLIC_KEY
                );
                console.log('EmailJS approval sent:', result.status, result.text);
            } catch (ejsErr) {
                console.error('EmailJS approval failed — status:', ejsErr.status);
                console.error('EmailJS approval failed — text:', ejsErr.text);
                console.error('EmailJS approval full error:', JSON.stringify(ejsErr));
            }
            // ─────────────────────────────────────────────────────────────────

            // Show the copy UI for this approval
            setApprovedResult({ requestId: request.id, token, link, email: request.email, name: request.fullName, expiryDays });

        } catch (err) {
            console.error('Failed to approve request:', err);
            alert(`Error approving request: ${err.message || 'Please try again.'}`);
        }
        setProcessingId(null);
    };

    const handleReject = async (request) => {
        const confirmed = window.confirm(`Reject ${request.fullName}'s request? They will not receive a token.`);
        if (!confirmed) return;

        setProcessingId(request.id);
        try {
            await updateDoc(doc(db, 'teacherRequests', request.id), {
                status: 'rejected',
                reviewedAt: new Date().toISOString(),
                reviewedBy: 'admin',
            });
        } catch (err) {
            console.error('Failed to reject request:', err);
            alert('Error rejecting request. Check Firestore permissions.');
        }
        setProcessingId(null);
    };

    const pendingRequests  = requests.filter(r => r.status === 'pending');
    const reviewedRequests = requests.filter(r => r.status !== 'pending');

    // Pre-build mailto for the approved result
    const buildMailto = (result) => {
        if (!result) return '';
        const expiryDate = new Date(Date.now() + result.expiryDays * 86400000)
            .toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
        const body = [
            `Hi ${result.name},`,
            '',
            'Your teacher access request for AtomARix has been approved!',
            '',
            `Your invite token: ${result.token}`,
            `Or use this direct link: ${result.link}`,
            '',
            `This token expires on: ${expiryDate}`,
            '',
            'Go to the AtomARix registration page, select Teacher, and enter your token to create your account.',
            '',
            'Welcome aboard!'
        ].join('\n');
        return `mailto:${result.email}?subject=${encodeURIComponent('Your AtomARix Teacher Invite Token')}&body=${encodeURIComponent(body)}`;
    };

    return (
        <>
            <div style={S.pageTitle}>Pending Requests</div>
            <div style={S.pageSub}>Review teachers requesting access — approving generates a token you can copy or email directly</div>

            {/* ── Post-approval token panel ── */}
            {approvedResult && (
                <div style={{ ...S.card, border: `1px solid ${C.purpleBorder}`, background: C.purpleLight, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: C.dark }}>
                                ✅ Approved — {approvedResult.name}
                            </div>
                            <div style={{ fontSize: '13px', color: C.muted, marginTop: '3px' }}>
                                Send this token to <strong>{approvedResult.email}</strong>
                            </div>
                        </div>
                        <button
                            onClick={() => setApprovedResult(null)}
                            style={{ background: 'none', border: 'none', fontSize: '18px', color: C.muted, cursor: 'pointer', lineHeight: 1 }}
                        >×</button>
                    </div>

                    {/* Token display */}
                    <div style={{ background: C.white, border: `1px solid ${C.purpleBorder}`, borderRadius: '10px', padding: '14px 18px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Token</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'monospace', color: C.dark, letterSpacing: '0.08em' }}>{approvedResult.token}</div>
                    </div>

                    {/* Invite link */}
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Invite Link</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={S.linkBox}>{approvedResult.link}</div>
                            <button style={S.btnOutline} onClick={() => copyText(approvedResult.link, 'link')}>
                                {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
                            </button>
                        </div>
                    </div>

                    {/* Copy token + mailto */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            style={{ ...S.btnOutline, fontSize: '13px' }}
                            onClick={() => copyText(approvedResult.token, 'token')}
                        >
                            {copied === 'token' ? '✓ Token Copied!' : '📋 Copy Token'}
                        </button>
                        <a
                            href={buildMailto(approvedResult)}
                            style={{ ...S.btn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                        >
                            ✉️ Open Email to {approvedResult.name}
                        </a>
                    </div>
                    <div style={{ fontSize: '12px', color: C.muted, marginTop: '8px' }}>
                        Opens your email app with the token pre-filled — just hit Send.
                        {' '}Once EmailJS is set up, this will send automatically.
                    </div>
                </div>
            )}

            {/* ── Expiry picker ── */}
            <div style={{ ...S.card, marginBottom: '20px' }}>
                <div style={S.cardHead}>
                    <div style={S.cardTitle}>New token expires after</div>
                </div>
                <select style={S.select} value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))}>
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                </select>
                <div style={{ fontSize: '12px', color: C.muted, marginTop: '8px' }}>
                    Applied to the token generated when you approve a request below.
                </div>
            </div>

            {/* ── Awaiting review ── */}
            <div style={S.card}>
                <div style={S.cardHead}>
                    <div>
                        <div style={S.cardTitle}>Awaiting Review</div>
                        <div style={{ fontSize: '13px', color: C.muted }}>
                            {pendingRequests.length} pending — updates in real time
                        </div>
                    </div>
                </div>

                {loadingList ? (
                    <div style={{ color: C.muted, fontSize: '14px' }}>Loading requests...</div>
                ) : pendingRequests.length === 0 ? (
                    <div style={{ color: C.muted, fontSize: '14px' }}>No pending requests right now.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pendingRequests.map(r => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.white, flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                    <div style={{ fontWeight: '700', color: C.dark, fontSize: '14px' }}>{r.fullName}</div>
                                    <div style={{ fontSize: '13px', color: C.muted }}>{r.email}</div>
                                    {r.school && (
                                        <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <i className="fas fa-school" style={{ fontSize: '11px', color: C.purple }}></i> {r.school}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>Requested {formatDate(r.requestedAt)}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleReject(r)}
                                        disabled={processingId === r.id}
                                        style={{ padding: '8px 16px', borderRadius: '9px', border: `1px solid ${C.red}`, background: 'white', color: C.red, fontWeight: '700', fontSize: '13px', cursor: processingId === r.id ? 'not-allowed' : 'pointer', opacity: processingId === r.id ? 0.6 : 1 }}
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(r)}
                                        disabled={processingId === r.id}
                                        style={{ ...S.btn, padding: '8px 16px', fontSize: '13px', cursor: processingId === r.id ? 'not-allowed' : 'pointer', opacity: processingId === r.id ? 0.6 : 1 }}
                                    >
                                        {processingId === r.id ? 'Approving...' : '✓ Approve & Generate Token'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Reviewed history ── */}
            {reviewedRequests.length > 0 && (
                <div style={S.card}>
                    <div style={S.cardHead}>
                        <div style={S.cardTitle}>Reviewed</div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={S.table}>
                            <thead>
                                <tr>
                                    <th style={S.th}>Name</th>
                                    <th style={S.th}>Email</th>
                                    <th style={S.th}>School</th>
                                    <th style={S.th}>Status</th>
                                    <th style={S.th}>Token</th>
                                    <th style={S.th}>Reviewed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviewedRequests.map(r => (
                                    <tr key={r.id}>
                                        <td style={S.td}>{r.fullName}</td>
                                        <td style={S.td}>{r.email}</td>
                                        <td style={S.td}>{r.school || <span style={{ color: C.muted }}>—</span>}</td>
                                        <td style={S.td}>
                                            <span style={S.badge(r.status === 'approved' ? 'active' : 'inactive')}>
                                                {r.status === 'approved' ? 'Approved' : 'Rejected'}
                                            </span>
                                        </td>
                                        <td style={S.td}>
                                            {r.tokenGenerated
                                                ? <span style={S.mono}>{r.tokenGenerated}</span>
                                                : <span style={{ color: C.muted }}>—</span>
                                            }
                                        </td>
                                        <td style={S.td}>{formatDate(r.reviewedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Invite Tokens
// ═════════════════════════════════════════════════════════════════════════════

function Tokens() {
    const [expiryDays, setExpiryDays] = useState(7);
    const [loading, setLoading]       = useState(false);
    const [generatedToken, setGeneratedToken] = useState('');
    const [generatedLink, setGeneratedLink]   = useState('');
    const [teacherEmail, setTeacherEmail]     = useState('');
    const [copied, setCopied]         = useState('');
    const [tokens, setTokens]         = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [deletingTokenId, setDeletingTokenId] = useState(null);

    useEffect(() => { fetchTokens(); }, []);

    const fetchTokens = async () => {
        setLoadingList(true);
        try {
            const q = query(collection(db, 'teacherInvites'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setTokens(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) { console.error(err); }
        setLoadingList(false);
    };

    // Only ever called for unused tokens (active or expired) — the delete
    // button itself is hidden for already-used tokens, so a teacher's
    // registration history via a used token is never lost from this UI.
    const handleDeleteToken = async (tokenId) => {
        const confirmed = window.confirm(`Delete token ${tokenId}? This cannot be undone.`);
        if (!confirmed) return;

        setDeletingTokenId(tokenId);
        try {
            await deleteDoc(doc(db, 'teacherInvites', tokenId));
            setTokens(prev => prev.filter(t => t.id !== tokenId));
        } catch (err) {
            console.error('Failed to delete token:', err);
            alert('Error deleting token. Check your Firestore permissions.');
        }
        setDeletingTokenId(null);
    };

    const handleGenerate = async () => {
        setLoading(true);
        const token = generateToken();
        const link  = `${window.location.origin}/register?token=${token}`;
        try {
            await setDoc(doc(db, 'teacherInvites', token), {
                used: false,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + expiryDays * 86400000).toISOString(),
                createdBy: 'admin'
            });
            setGeneratedToken(token);
            setGeneratedLink(link);
            setTeacherEmail('');
            await fetchTokens();
        } catch (err) {
            console.error(err);
            alert('Error generating token. Check Firestore permissions.');
        }
        setLoading(false);
    };

    const copy = (text, label) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(label);
            setTimeout(() => setCopied(''), 2000);
        });
    };

    // Pre-built the moment a token exists and an email is typed — a plain
    // computed string, not a function only run inside an onClick handler.
    // The link itself does all the work via a real <a href="mailto:...">,
    // with no JavaScript execution needed to actually navigate.
    const mailtoSubject = 'Your AtomARix Teacher Invite';
    const mailtoExpiryDate = new Date(Date.now() + expiryDays * 86400000).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const mailtoBody = [
        'Hello,',
        '',
        "You've been invited to register as a teacher on AtomARix.",
        '',
        `Invite link: ${generatedLink}`,
        `Token (if asked manually): ${generatedToken}`,
        `This invite expires on: ${mailtoExpiryDate}`,
        '',
        'Just click the link above to create your teacher account.',
        '',
        'Thanks!'
    ].join('\n');
    const mailtoHref = teacherEmail
        ? `mailto:${teacherEmail}?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`
        : '';

    return (
        <>
            <div style={S.pageTitle}>Invite Tokens</div>
            <div style={S.pageSub}>Generate one-time tokens for teacher registration</div>

            {/* Generator card */}
            <div style={S.card}>
                <div style={S.cardHead}>
                    <div>
                        <div style={S.cardTitle}>Generate New Token</div>
                        <div style={S.cardSub}>Each token can only be used once</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: C.muted, marginBottom: '6px' }}>Expires after</div>
                        <select style={S.select} value={expiryDays} onChange={e => setExpiryDays(Number(e.target.value))}>
                            <option value={1}>1 day</option>
                            <option value={3}>3 days</option>
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                        </select>
                    </div>
                    <button
                        style={{ ...S.btn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? 'Generating…' : '+ Generate Token'}
                    </button>
                </div>

                {generatedToken && (
                    <div style={S.resultBox}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>New Token</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'monospace', color: C.dark, letterSpacing: '0.08em' }}>{generatedToken}</div>
                        <div style={{ marginTop: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Invite Link</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={S.linkBox}>{generatedLink}</div>
                                <button style={S.btnOutline} onClick={() => copy(generatedLink, 'link')}>{copied === 'link' ? '✓ Copied!' : 'Copy Link'}</button>
                            </div>
                            <button style={{ ...S.btnOutline, marginTop: '8px', fontSize: '12px' }} onClick={() => copy(generatedToken, 'token')}>
                                {copied === 'token' ? '✓ Copied!' : 'Copy Token Only'}
                            </button>
                        </div>

                        <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: `1px solid ${C.purpleBorder}` }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                                Send Directly to Teacher
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <input
                                    type="email"
                                    placeholder="teacher@email.com"
                                    value={teacherEmail}
                                    onChange={e => setTeacherEmail(e.target.value)}
                                    style={{ ...S.input, flex: '1 1 220px' }}
                                />
                                <a
                                    href={mailtoHref || undefined}
                                    style={{
                                        ...S.btn,
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        opacity: teacherEmail ? 1 : 0.5,
                                        pointerEvents: teacherEmail ? 'auto' : 'none',
                                        cursor: teacherEmail ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    ✉️ Send via Email
                                </a>
                            </div>
                            <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px' }}>
                                Opens your email app with the invite pre-filled — just hit Send.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Token history */}
            <div style={S.card}>
                <div style={S.cardHead}>
                    <div>
                        <div style={S.cardTitle}>Token History</div>
                        <div style={S.cardSub}>All generated invite tokens</div>
                    </div>
                    <button style={S.btnOutline} onClick={fetchTokens}>↻ Refresh</button>
                </div>
                {loadingList ? (
                    <div style={{ color: C.muted, padding: '12px 0' }}>Loading…</div>
                ) : tokens.length === 0 ? (
                    <div style={{ color: C.muted, padding: '12px 0' }}>No tokens yet.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={S.table}>
                            <thead>
                                <tr>
                                    <th style={S.th}>Token</th>
                                    <th style={S.th}>Status</th>
                                    <th style={S.th}>Created</th>
                                    <th style={S.th}>Expires</th>
                                    <th style={S.th}>Used by</th>
                                    <th style={S.th}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map(t => {
                                    const expired = t.expiresAt && new Date(t.expiresAt) < new Date();
                                    const status  = t.used ? 'used' : expired ? 'expired' : 'Active';
                                    return (
                                        <tr key={t.id}>
                                            <td style={S.td}><span style={S.mono}>{t.id}</span></td>
                                            <td style={S.td}><span style={S.badge(status)}>{t.used ? 'Used' : expired ? 'Expired' : 'Active'}</span></td>
                                            <td style={S.td}>{formatDate(t.createdAt)}</td>
                                            <td style={S.td}>{formatDate(t.expiresAt)}</td>
                                            <td style={S.td}>{t.usedBy || '—'}</td>
                                            <td style={S.td}>
                                                {!t.used && (
                                                    <button
                                                        onClick={() => handleDeleteToken(t.id)}
                                                        disabled={deletingTokenId === t.id}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: deletingTokenId === t.id ? C.muted : '#e53e3e',
                                                            cursor: deletingTokenId === t.id ? 'not-allowed' : 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            padding: '4px 8px',
                                                        }}
                                                        title="Delete this token"
                                                    >
                                                        {deletingTokenId === t.id ? 'Deleting…' : '🗑 Delete'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN: AdminDashboard
// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Maintenance Mode
// ═════════════════════════════════════════════════════════════════════════════
function Maintenance() {
    const [isOn, setIsOn]       = useState(false);
    const [message, setMessage] = useState('AtomARix is currently under maintenance. Please check back later.');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);
    const [saved, setSaved]     = useState(false);

    useEffect(() => {
        const fetchMaintenance = async () => {
            try {
                const snap = await getDoc(doc(db, 'adminConfig', 'maintenance'));
                if (snap.exists()) {
                    const data = snap.data();
                    setIsOn(data.enabled || false);
                    setMessage(data.message || 'AtomARix is currently under maintenance. Please check back later.');
                }
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchMaintenance();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'adminConfig', 'maintenance'), {
                enabled: isOn,
                message: message.trim() || 'AtomARix is currently under maintenance. Please check back later.',
                updatedAt: new Date().toISOString(),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) { console.error(err); }
        setSaving(false);
    };

    if (loading) return <div style={{ padding: '40px', color: C.muted }}>Loading…</div>;

    return (
        <>
            <div style={S.pageTitle}>Maintenance Mode</div>
            <div style={S.pageSub}>Control app availability for all users</div>

            <div style={{ ...S.card, marginBottom: '20px' }}>
                <div style={S.cardHead}>
                    <div>
                        <div style={S.cardTitle}>Maintenance Status</div>
                        <div style={S.cardSub}>When enabled, all users see a maintenance banner and cannot use the app.</div>
                    </div>
                </div>

                {/* Toggle row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: isOn ? '#fff5f5' : '#f0fdf4', borderRadius: '12px', border: `2px solid ${isOn ? '#fecaca' : '#bbf7d0'}`, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ fontSize: '2rem' }}>{isOn ? '🔧' : '✅'}</span>
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: isOn ? '#c0392b' : '#15803d' }}>
                                {isOn ? 'Maintenance is ON' : 'App is Live'}
                            </div>
                            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
                                {isOn ? 'All users are seeing the maintenance banner.' : 'Students and teachers can use the app normally.'}
                            </div>
                        </div>
                    </div>
                    <div onClick={() => setIsOn(v => !v)}
                        style={{ width: '52px', height: '28px', borderRadius: '14px', background: isOn ? '#e74c3c' : '#1dd1a1', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: '3px', left: isOn ? '26px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', transition: 'left 0.3s' }}></div>
                    </div>
                </div>

                {/* Message editor */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', color: C.dark, marginBottom: '8px' }}>Maintenance Message</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                        placeholder="Message shown to users during maintenance..."
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '14px', color: C.dark, background: C.bg, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: '1.6', boxSizing: 'border-box' }}
                        onFocus={e => e.target.style.borderColor = C.purple}
                        onBlur={e => e.target.style.borderColor = C.border}
                    />
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '5px' }}>This message appears as a banner visible to all students and teachers.</div>
                </div>

                {/* Preview */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Preview</div>
                    <div style={{ background: isOn ? '#7f1d1d' : '#1e3a2f', color: '#fff', padding: '12px 18px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>{isOn ? '🔧' : '✅'}</span>
                        <span>{isOn ? (message || 'AtomARix is currently under maintenance.') : 'App is live — no banner shown to users.'}</span>
                    </div>
                </div>

                {/* Save button */}
                <button onClick={handleSave} disabled={saving}
                    style={{ padding: '11px 28px', borderRadius: '10px', border: 'none', background: saved ? '#1dd1a1' : C.purple, color: '#fff', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}>
                    {saved ? '✓ Saved!' : saving ? 'Saving…' : '💾 Save Changes'}
                </button>
            </div>

            {/* Warning */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
                <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.6' }}>
                    <strong>Important:</strong> When maintenance mode is ON, a full-screen banner blocks all pages for students and teachers. They cannot use the app until you turn maintenance mode OFF and save.
                </div>
            </div>
        </>
    );
}

export default function AdminDashboard() {
    const [page, setPage]     = useState('overview');
    const [users, setUsers]   = useState([]);
    const [stats, setStats]   = useState({ students: 0, teachers: 0, activeTokens: 0, usedTokens: 0 });
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        fetchAll();

        // ── Real-time pending request count for sidebar badge ──────────────────
        // onSnapshot fires immediately on mount and again whenever any
        // teacherRequests document changes, so the badge updates the instant
        // a teacher submits — no refresh needed.
        const q = query(collection(db, 'teacherRequests'), orderBy('requestedAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const count = snap.docs.filter(d => d.data().status === 'pending').length;
            setPendingCount(count);
        }, (err) => console.error('pendingCount listener error:', err));

        return () => unsub();
    }, []);

    const fetchAll = async () => {
        await Promise.all([fetchUsers(), fetchStats()]);
    };

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const snap = await getDocs(collection(db, 'users'));
            setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        } catch (err) { console.error(err); }
        setLoadingUsers(false);
    };

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const usersSnap  = await getDocs(collection(db, 'users'));
            const tokenSnap  = await getDocs(collection(db, 'teacherInvites'));

            let students = 0, teachers = 0, activeTokens = 0, usedTokens = 0;
            usersSnap.forEach(d => {
                const r = d.data().role;
                if (r === 'student') students++;
                if (r === 'teacher') teachers++;
            });
            tokenSnap.forEach(d => {
                const t = d.data();
                const expired = t.expiresAt && new Date(t.expiresAt) < new Date();
                if (t.used) usedTokens++;
                else if (!expired) activeTokens++;
            });
            setStats({ students, teachers, activeTokens, usedTokens });
        } catch (err) { console.error(err); }
        setLoadingStats(false);
    };

    return (
        <div style={S.layout}>
            {/* Sidebar */}
            <div style={S.sidebar}>
                <div style={S.brand}>
                    <div style={S.brandTitle}>⚛ AtomARix</div>
                    <div style={S.brandSub}>Admin Panel</div>
                </div>
                <nav style={S.nav}>
                    {NAV.map(item => (
                        <div
                            key={item.id}
                            style={S.navItem(page === item.id)}
                            onClick={() => setPage(item.id)}
                        >
                            <span style={S.navIcon}>{item.icon}</span>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {item.id === 'requests' && pendingCount > 0 && (
                                <span style={{ background: '#e74c3c', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '2px 7px', borderRadius: '20px', minWidth: '20px', textAlign: 'center' }}>
                                    {pendingCount}
                                </span>
                            )}
                        </div>
                    ))}
                </nav>
                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                    AtomARix Admin v1.0
                </div>
            </div>

            {/* Main content */}
            <main style={S.main}>
                {page === 'overview' && (
                    <Overview stats={stats} loading={loadingStats} />
                )}
                {page === 'users' && (
                    <Users users={users} loading={loadingUsers} onRefresh={fetchUsers} />
                )}
                {page === 'requests' && (
                    <PendingRequests />
                )}
                {page === 'tokens' && (
                    <Tokens />
                )}
                {page === 'maintenance' && (
                    <Maintenance />
                )}
            </main>
        </div>
    );
}
