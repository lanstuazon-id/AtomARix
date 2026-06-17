import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { elementData } from './PeriodicTable.jsx';

// Public AR viewer — intentionally NOT wrapped in ProtectedRoute. When a
// student scans the QR code shown on desktop, their phone is a separate,
// unauthenticated browser session, so this page must work without login.
// It only ever shows one element's 3D model, nothing else from the app.
export default function ArViewer() {
    const [searchParams] = useSearchParams();
    const symbol = searchParams.get('element');
    const element = symbol ? elementData[symbol] : null;
    const [modelFailed, setModelFailed] = useState(false);

    // Load Google's <model-viewer> component, same as PeriodicTable.jsx
    useEffect(() => {
        if (!document.getElementById('model-viewer-script')) {
            const script = document.createElement('script');
            script.id = 'model-viewer-script';
            script.type = 'module';
            script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
            document.head.appendChild(script);
        }
    }, []);

    if (!symbol || !element) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <i className="fas fa-flask" style={{ fontSize: '2.5rem', color: '#ccc', marginBottom: '15px' }}></i>
                    <h2 style={{ color: '#2d3436', marginBottom: '8px' }}>Element Not Found</h2>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>This AR link looks invalid or incomplete. Please scan the QR code again from the Periodic Table page.</p>
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
                <h1 style={{ fontSize: '1.8rem', color: '#2d3436', margin: '0 0 4px' }}>{element.name}</h1>
                <p style={{ color: '#888', margin: '0 0 20px', fontSize: '0.95rem' }}>{symbol} · Atomic Number {element.n}</p>

                <div style={styles.modelBox}>
                    {!modelFailed ? (
                        <model-viewer
                            src={`/assets/models/${element.name.toLowerCase()}.glb`}
                            alt={`3D model of ${element.name}`}
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

                {element.fact && (
                    <p style={{ marginTop: '20px', color: '#555', fontSize: '0.9rem', lineHeight: '1.5', background: '#f8f9fa', padding: '14px 16px', borderRadius: '12px', textAlign: 'left' }}>
                        <i className="fas fa-lightbulb" style={{ color: '#f39c12', marginRight: '6px' }}></i>
                        {element.fact}
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
