import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { elementData } from './PeriodicTable.jsx';
import { recipes, getModelFilename } from './Laboratory.jsx';

// Public AR viewer — intentionally NOT wrapped in ProtectedRoute. When a
// student scans a QR code shown on desktop (from the Periodic Table or the
// Laboratory), their phone is a separate, unauthenticated browser session,
// so this page must work without login. It only ever shows one item's 3D
// model — either a single element or a single discovered compound — nothing
// else from the app.
export default function ArViewer() {
    const [searchParams] = useSearchParams();
    const elementSymbol = searchParams.get('element');
    const compoundFormula = searchParams.get('compound');

    const element = elementSymbol ? elementData[elementSymbol] : null;

    // Compounds are looked up by their formula (e.g. "H₂O"), since that's
    // what's encoded in the QR code from Laboratory.jsx, not the recipe key.
    const compound = compoundFormula
        ? Object.values(recipes).find(r => r.formula === compoundFormula)
        : null;

    const [modelFailed, setModelFailed] = useState(false);

    // Load Google's <model-viewer> component, same as PeriodicTable.jsx / Laboratory.jsx
    useEffect(() => {
        if (!document.getElementById('model-viewer-script')) {
            const script = document.createElement('script');
            script.id = 'model-viewer-script';
            script.type = 'module';
            script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
            document.head.appendChild(script);
        }
    }, []);

    const title = element ? element.name : compound ? compound.name : null;
    const subtitle = element ? `${elementSymbol} · Atomic Number ${element.n}` : compound ? compound.formula : null;
    const modelSrc = element
        ? `/assets/models/${element.name.toLowerCase()}.glb`
        : compound
            ? `/assets/models/${getModelFilename(compound.name)}.glb`
            : null;
    const noteText = element ? element.fact : compound ? compound.desc : null;

    if (!modelSrc) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <i className="fas fa-flask" style={{ fontSize: '2.5rem', color: '#ccc', marginBottom: '15px' }}></i>
                    <h2 style={{ color: '#2d3436', marginBottom: '8px' }}>Item Not Found</h2>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>This AR link looks invalid or incomplete. Please scan the QR code again from the Periodic Table or Laboratory page.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={{ marginBottom: '15px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6e45e2', background: '#f3f0ff', padding: '4px 12px', borderRadius: '20px' }}>
                        <i className="fas fa-atom"></i> AtomARix AR Viewer
                    </span>
                </div>
                <h1 style={{ fontSize: '1.8rem', color: '#2d3436', margin: '0 0 4px' }}>{title}</h1>
                <p style={{ color: '#888', margin: '0 0 20px', fontSize: '0.95rem' }}>{subtitle}</p>

                <div style={styles.modelBox}>
                    {!modelFailed ? (
                        <model-viewer
                            src={modelSrc}
                            alt={`3D model of ${title}`}
                            auto-rotate
                            rotation-per-second="45deg"
                            camera-controls
                            ar
                            autoplay
                            scale="0.4 0.4 0.4"
                            ar-scale="fixed"
                            ar-modes="webxr scene-viewer quick-look"
                            style={{ width: '100%', height: '100%' }}
                            onError={() => setModelFailed(true)}
                        >
                            <button slot="ar-button" style={styles.arButton}>
                                <i className="fas fa-cube"></i> Tap to View in AR
                            </button>
                            <div slot="poster" style={styles.poster}>
                                <i className="fas fa-cube" style={{ fontSize: '3rem', marginBottom: '10px', color: '#ccc' }}></i>
                                <span>Loading 3D Model...</span>
                            </div>
                        </model-viewer>
                    ) : (
                        <div style={styles.poster}>
                            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#f39c12' }}></i>
                            <span style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', padding: '0 20px' }}>This 3D model couldn't be loaded. Please try again or ask your teacher.</span>
                        </div>
                    )}
                </div>

                {noteText && (
                    <p style={{ marginTop: '20px', color: '#555', fontSize: '0.9rem', lineHeight: '1.5', background: '#f8f9fa', padding: '14px 16px', borderRadius: '12px', textAlign: 'left' }}>
                        <i className="fas fa-lightbulb" style={{ color: '#f39c12', marginRight: '6px' }}></i>
                        {noteText}
                    </p>
                )}

                <p style={{ marginTop: '20px', color: '#aaa', fontSize: '0.78rem' }}>
                    Tap the "View in AR" button above to place this model in your space.
                </p>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f3f0ff 0%, #eaf4ff 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box',
    },
    card: {
        background: 'white',
        borderRadius: '20px',
        padding: '30px 25px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    },
    modelBox: {
        width: '100%',
        height: '320px',
        background: '#f8f9fa',
        borderRadius: '14px',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #eee',
    },
    poster: {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f8f9fa', color: '#888',
    },
    arButton: {
        position: 'absolute', bottom: '15px', right: '15px', background: '#6e45e2', color: 'white',
        border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(110,69,226,0.3)',
    },
};
