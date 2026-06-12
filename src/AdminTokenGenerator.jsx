import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, setDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `TK-${segment()}-${segment()}`;
}

function formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminTokenGenerator() {
    const [generatedToken, setGeneratedToken] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [expiryDays, setExpiryDays] = useState(7);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState('');
    const [tokens, setTokens] = useState([]);
    const [loadingTokens, setLoadingTokens] = useState(true);

    // Load existing tokens on mount
    useEffect(() => {
        fetchTokens();
    }, []);

    const fetchTokens = async () => {
        setLoadingTokens(true);
        try {
            const q = query(collection(db, 'teacherInvites'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setTokens(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Failed to fetch tokens:', err);
        }
        setLoadingTokens(false);
    };

    const handleGenerate = async () => {
        setLoading(true);
        const token = generateToken();
        const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
        const createdAt = new Date().toISOString();
        const link = `${window.location.origin}/register?token=${token}`;

        try {
            await setDoc(doc(db, 'teacherInvites', token), {
                used: false,
                createdAt,
                expiresAt,
                createdBy: 'admin'
            });

            setGeneratedToken(token);
            setGeneratedLink(link);
            await fetchTokens();
        } catch (err) {
            console.error('Failed to generate token:', err);
            alert('Error generating token. Check your Firestore permissions.');
        }
        setLoading(false);
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(label);
            setTimeout(() => setCopied(''), 2000);
        });
    };

    // ── Styles ────────────────────────────────────────────────────────────────
    const s = {
        page:        { fontFamily: 'sans-serif', maxWidth: '720px', margin: '40px auto', padding: '0 20px' },
        card:        { background: '#fff', border: '1px solid #e1e1e1', borderRadius: '16px', padding: '28px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
        heading:     { fontSize: '20px', fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' },
        sub:         { fontSize: '14px', color: '#888', marginBottom: '24px' },
        row:         { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' },
        label:       { fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' },
        select:      { padding: '10px 14px', borderRadius: '10px', border: '1px solid #e1e1e1', fontSize: '14px', color: '#333', background: '#f8f9fa' },
        btn:         { padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#6e45e2', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' },
        btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
        resultBox:   { marginTop: '20px', background: '#f3f0ff', border: '1px solid #d4c7f9', borderRadius: '12px', padding: '20px' },
        resultLabel: { fontSize: '12px', fontWeight: '700', color: '#6e45e2', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
        tokenText:   { fontSize: '22px', fontWeight: '800', color: '#1a1a2e', letterSpacing: '0.08em', fontFamily: 'monospace' },
        copyRow:     { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' },
        linkText:    { flex: 1, fontSize: '13px', color: '#555', background: '#fff', border: '1px solid #e1e1e1', borderRadius: '8px', padding: '8px 12px', fontFamily: 'monospace', wordBreak: 'break-all' },
        copyBtn:     { padding: '8px 16px', borderRadius: '8px', border: '1px solid #6e45e2', background: '#fff', color: '#6e45e2', fontWeight: '600', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
        table:       { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
        th:          { textAlign: 'left', padding: '10px 12px', background: '#f8f9fa', color: '#555', fontWeight: '700', borderBottom: '2px solid #e1e1e1' },
        td:          { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
        badge:       (used, expired) => ({
                        display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                        background: used ? '#fff0f0' : expired ? '#fff7e6' : '#eaffee',
                        color: used ? '#e53e3e' : expired ? '#d97706' : '#16a34a'
                    }),
        mono:        { fontFamily: 'monospace', letterSpacing: '0.05em', fontWeight: '600', color: '#3c2fa0' },
    };

    return (
        <div style={s.page}>
            {/* Generate card */}
            <div style={s.card}>
                <div style={s.heading}>🔑 Generate Teacher Invite Token</div>
                <div style={s.sub}>Create a one-time invite link to share with a teacher.</div>

                <div style={s.row}>
                    <div>
                        <label style={s.label}>Token expires after</label>
                        <select
                            value={expiryDays}
                            onChange={e => setExpiryDays(Number(e.target.value))}
                            style={s.select}
                        >
                            <option value={1}>1 day</option>
                            <option value={3}>3 days</option>
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
                    >
                        {loading ? 'Generating...' : '+ Generate Token'}
                    </button>
                </div>

                {generatedToken && (
                    <div style={s.resultBox}>
                        <div style={s.resultLabel}>Token</div>
                        <div style={s.tokenText}>{generatedToken}</div>

                        <div style={{ marginTop: '16px' }}>
                            <div style={s.resultLabel}>Invite Link — share this with the teacher</div>
                            <div style={s.copyRow}>
                                <div style={s.linkText}>{generatedLink}</div>
                                <button
                                    style={s.copyBtn}
                                    onClick={() => copyToClipboard(generatedLink, 'link')}
                                >
                                    {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
                                </button>
                            </div>
                            <div style={s.copyRow}>
                                <button
                                    style={{ ...s.copyBtn, marginTop: '4px' }}
                                    onClick={() => copyToClipboard(generatedToken, 'token')}
                                >
                                    {copied === 'token' ? '✓ Copied!' : 'Copy Token Only'}
                                </button>
                                <span style={{ fontSize: '12px', color: '#888' }}>
                                    (if sharing manually instead of the link)
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Token history card */}
            <div style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <div style={s.heading}>Token History</div>
                        <div style={{ fontSize: '13px', color: '#888' }}>All generated invite tokens</div>
                    </div>
                    <button onClick={fetchTokens} style={{ ...s.copyBtn, fontSize: '12px' }}>↻ Refresh</button>
                </div>

                {loadingTokens ? (
                    <div style={{ color: '#aaa', fontSize: '14px' }}>Loading tokens...</div>
                ) : tokens.length === 0 ? (
                    <div style={{ color: '#aaa', fontSize: '14px' }}>No tokens generated yet.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={s.table}>
                            <thead>
                                <tr>
                                    <th style={s.th}>Token</th>
                                    <th style={s.th}>Status</th>
                                    <th style={s.th}>Created</th>
                                    <th style={s.th}>Expires</th>
                                    <th style={s.th}>Used by</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map(t => {
                                    const expired = t.expiresAt && new Date(t.expiresAt) < new Date();
                                    return (
                                        <tr key={t.id}>
                                            <td style={s.td}>
                                                <span style={s.mono}>{t.id}</span>
                                            </td>
                                            <td style={s.td}>
                                                <span style={s.badge(t.used, expired)}>
                                                    {t.used ? 'Used' : expired ? 'Expired' : 'Active'}
                                                </span>
                                            </td>
                                            <td style={s.td}>{formatDate(t.createdAt)}</td>
                                            <td style={s.td}>{formatDate(t.expiresAt)}</td>
                                            <td style={s.td}>{t.usedBy || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
