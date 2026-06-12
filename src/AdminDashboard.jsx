import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import {
    collection, getDocs, doc, setDoc, updateDoc,
    orderBy, query, getCountFromServer
} from 'firebase/firestore';

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
    { id: 'overview',  icon: '📊', label: 'Overview'       },
    { id: 'users',     icon: '👥', label: 'Users'          },
    { id: 'tokens',    icon: '🔑', label: 'Invite Tokens'  },
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
// SECTION: Invite Tokens
// ═════════════════════════════════════════════════════════════════════════════

function Tokens() {
    const [expiryDays, setExpiryDays] = useState(7);
    const [loading, setLoading]       = useState(false);
    const [generatedToken, setGeneratedToken] = useState('');
    const [generatedLink, setGeneratedLink]   = useState('');
    const [copied, setCopied]         = useState('');
    const [tokens, setTokens]         = useState([]);
    const [loadingList, setLoadingList] = useState(true);

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

export default function AdminDashboard() {
    const [page, setPage]     = useState('overview');
    const [users, setUsers]   = useState([]);
    const [stats, setStats]   = useState({ students: 0, teachers: 0, activeTokens: 0, usedTokens: 0 });
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        fetchAll();
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
                            {item.label}
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
                {page === 'tokens' && (
                    <Tokens />
                )}
            </main>
        </div>
    );
}
