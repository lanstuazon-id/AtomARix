import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Laboratory.css';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const baseElements = [
    { sym: 'H', color: '#48dbfb', name: 'Hydrogen' }, { sym: 'He', color: '#1dd1a1', name: 'Helium' },
    { sym: 'Li', color: '#ff9f43', name: 'Lithium' }, { sym: 'C', color: '#a29bfe', name: 'Carbon' },
    { sym: 'N', color: '#48dbfb', name: 'Nitrogen' }, { sym: 'O', color: '#1dd1a1', name: 'Oxygen' },
    { sym: 'F', color: '#48dbfb', name: 'Fluorine' }, { sym: 'Na', color: '#ff9f43', name: 'Sodium' },
    { sym: 'Mg', color: '#ff6b6b', name: 'Magnesium' }, { sym: 'S', color: '#48dbfb', name: 'Sulfur' },
    { sym: 'Cl', color: '#48dbfb', name: 'Chlorine' }, { sym: 'K', color: '#ff9f43', name: 'Potassium' },
    { sym: 'Ca', color: '#ff6b6b', name: 'Calcium' }, { sym: 'Fe', color: '#ffe066', name: 'Iron' },
    { sym: 'Cu', color: '#ffe066', name: 'Copper' }, { sym: 'Zn', color: '#ffe066', name: 'Zinc' },
    { sym: 'Ag', color: '#ffe066', name: 'Silver' }, { sym: 'Au', color: '#ffe066', name: 'Gold' },
    { sym: 'Al', color: '#ced4da', name: 'Aluminium' }, { sym: 'P', color: '#48dbfb', name: 'Phosphorus' },
    { sym: 'Br', color: '#48dbfb', name: 'Bromine' }
];

const recipes = {
    "H,H,O": { name: "Water", formula: "H₂O", icon: "💧", desc: "Essential for all known forms of life.", color: "#74b9ff" },
    "Cl,Na": { name: "Sodium Chloride (Salt)", formula: "NaCl", icon: "🧂", desc: "Commonly used as a condiment and food preservative.", color: "#f1f2f6" },
    "C,O,O": { name: "Carbon Dioxide", formula: "CO₂", icon: "💨", desc: "A greenhouse gas produced by respiration.", color: "#dfe6e9", requiresHeat: true },
    "C,H,H,H,H": { name: "Methane", formula: "CH₄", icon: "🔥", desc: "The main constituent of natural gas.", color: "#ffeaa7" },
    "H,H,O,O": { name: "Hydrogen Peroxide", formula: "H₂O₂", icon: "🫧", desc: "Used as a mild antiseptic and bleaching agent.", color: "#81ecec" },
    "C,O": { name: "Carbon Monoxide", formula: "CO", icon: "☠️", desc: "A toxic, colorless, odorless gas.", color: "#b2bec3", requiresHeat: true },
    "Fe,Fe,O,O,O": { name: "Iron(III) Oxide (Rust)", formula: "Fe₂O₃", icon: "🟫", desc: "Formed when iron oxidizes.", color: "#d35400", requiresHeat: true },
    "N,N,O": { name: "Nitrous Oxide", formula: "N₂O", icon: "😂", desc: "Also known as laughing gas.", color: "#a29bfe" },
    "H,H,S": { name: "Hydrogen Sulfide", formula: "H₂S", icon: "🥚", desc: "A gas with the foul odor of rotten eggs.", color: "#feca57" },
    "H,H,H,N": { name: "Ammonia", formula: "NH₃", icon: "🧽", desc: "Used in fertilizers and cleaning products.", color: "#55efc4" },
    "Cl,H": { name: "Hydrochloric Acid", formula: "HCl", icon: "🧪", desc: "A strong, corrosive acid found in the stomach.", color: "#ff7675" },
    "C,Ca,O,O,O": { name: "Calcium Carbonate", formula: "CaCO₃", icon: "🪨", desc: "Found in rocks, shells, and pearls.", color: "#ecf0f1" },
    "Cl,K": { name: "Potassium Chloride", formula: "KCl", icon: "🧂", desc: "Used as a fertilizer and salt substitute.", color: "#f5f6fa" },
    "Ag,N,O,O,O": { name: "Silver Nitrate", formula: "AgNO₃", icon: "🪙", desc: "An important compound in photography and medicine.", color: "#c8d6e5" },
    "Cu,O,O,O,O,S": { name: "Copper(II) Sulfate", formula: "CuSO₄", icon: "🔵", desc: "Used as a fungicide and in electroplating.", color: "#0984e3" },
    "O,O,O": { name: "Ozone", formula: "O₃", icon: "🛡️", desc: "Protects the Earth from harmful UV radiation.", color: "#00cec9" },
    "F,H": { name: "Hydrogen Fluoride", formula: "HF", icon: "⚠️", desc: "A highly dangerous and corrosive gas.", color: "#fab1a0" },
    "Cl,Li": { name: "Lithium Chloride", formula: "LiCl", icon: "🔋", desc: "Used in the production of lithium metal.", color: "#ffeaa7" },
    "Mg,O": { name: "Magnesium Oxide", formula: "MgO", icon: "💊", desc: "Used to relieve heartburn and indigestion.", color: "#f1f2f6", requiresHeat: true },
    "H,Na,O": { name: "Sodium Hydroxide", formula: "NaOH", icon: "🧼", desc: "Also known as lye, used in soap making.", color: "#dfe6e9" },
    "H,K,O": { name: "Potassium Hydroxide", formula: "KOH", icon: "🔋", desc: "Used in alkaline batteries and soft soaps.", color: "#c8d6e5" },
    "Fe,S": { name: "Iron(II) Sulfide", formula: "FeS", icon: "🪨", desc: "A black solid commonly found in nature.", color: "#2d3436", requiresHeat: true },
    "N,O,O": { name: "Nitrogen Dioxide", formula: "NO₂", icon: "🏭", desc: "A reddish-brown toxic gas and air pollutant.", color: "#e17055" },
    "H,N,O,O,O": { name: "Nitric Acid", formula: "HNO₃", icon: "💥", desc: "A highly corrosive acid used in explosives.", color: "#ff7675" },
    "Ca,O": { name: "Calcium Oxide", formula: "CaO", icon: "🧱", desc: "Known as quicklime, used in making cement.", color: "#ecf0f1" },
    "Al,Al,O,O,O": { name: "Aluminium Oxide", formula: "Al₂O₃", icon: "🛡️", desc: "Used in the production of aluminium metal.", color: "#b2bec3", requiresHeat: true },
    "O,Zn": { name: "Zinc Oxide", formula: "ZnO", icon: "🧴", desc: "Widely used in cosmetics and sunscreens.", color: "#ffffff", requiresHeat: true },
    "O,O,S": { name: "Sulfur Dioxide", formula: "SO₂", icon: "🏭", desc: "A toxic gas responsible for acid rain.", color: "#dfe6e9", requiresHeat: true },
    "H,H,O,O,O,O,S": { name: "Sulfuric Acid", formula: "H₂SO₄", icon: "🧪", desc: "A highly corrosive strong mineral acid.", color: "#feca57" },
    "H,H,H,O,O,O,O,P": { name: "Phosphoric Acid", formula: "H₃PO₄", icon: "🥤", desc: "Used to acidify foods and beverages like colas.", color: "#ffeaa7" },
    "C,H,Na,O,O,O": { name: "Sodium Bicarbonate", formula: "NaHCO₃", icon: "🧁", desc: "Baking soda, commonly used in baking.", color: "#ffffff" },
    "Ag,Cl": { name: "Silver Chloride", formula: "AgCl", icon: "🪙", desc: "A white crystalline chemical compound, well known for its low solubility in water.", color: "#f1f2f6" },
    "Ca,Cl,Cl": { name: "Calcium Chloride", formula: "CaCl₂", icon: "❄️", desc: "A salt used for de-icing roads.", color: "#dfe6e9" },
    "Cl,Cl,Mg": { name: "Magnesium Chloride", formula: "MgCl₂", icon: "🧂", desc: "Used for dust control and soil stabilization.", color: "#f5f6fa" },
    "Al,Cl,Cl,Cl": { name: "Aluminum Chloride", formula: "AlCl₃", icon: "🛡️", desc: "Used in antiperspirants and in the chemical industry.", color: "#e17055" },
    "Br,H": { name: "Hydrogen Bromide", formula: "HBr", icon: "⚠️", desc: "A colorless compound and a strong acid in water.", color: "#fab1a0" },
    "Br,Na": { name: "Sodium Bromide", formula: "NaBr", icon: "💊", desc: "Widely used as an anticonvulsant and a sedative.", color: "#f1f2f6" }
};

export default function Laboratory() {
    const navigate = useNavigate();
    const currentUser = sessionStorage.getItem('loggedInUser') || 'Scientist';
    const discoveredCompoundsKey = `discoveredCompounds_${currentUser}`;

    // State
    const [inventorySearch, setInventorySearch] = useState('');
    const [recipeSearch, setRecipeSearch] = useState('');
    const [currentFlask, setCurrentFlask] = useState([]);
    const [flaskState, setFlaskState] = useState({ height: 0, color: 'transparent', mixed: false });
    const [isHeating, setIsHeating] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [discoveredCompounds, setDiscoveredCompounds] = useState(
        new Set(JSON.parse(localStorage.getItem(discoveredCompoundsKey)) || [])
    );

    // Modals
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [resultData, setResultData] = useState({ type: 'empty', res: null });
    const [showDesktopAr, setShowDesktopAr] = useState(false);
    const [qrUrl, setQrUrl] = useState('');

    // Refs
    const particlesContainerRef = useRef(null);
    const modalEffectsRef = useRef(null);
    const sndDrop = useRef(new Audio('/assets/audio/drop.mp3'));
    const sndSuccess = useRef(new Audio('/assets/audio/success.mp3'));
    const sndError = useRef(new Audio('/assets/audio/error.mp3'));
    const sndClear = useRef(new Audio('/assets/audio/clear.mp3'));
    const sndOpen = useRef(new Audio('/assets/audio/open.mp3'));

    // Fetch discovered compounds from the cloud in real-time
    useEffect(() => {
        const userRef = doc(db, "users", currentUser);
        const unsubscribe = onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists() && userSnap.data().discoveredCompounds) {
                const cloudData = userSnap.data().discoveredCompounds;
                setDiscoveredCompounds(new Set(cloudData));
                localStorage.setItem(discoveredCompoundsKey, JSON.stringify(cloudData));
            }
        }, (e) => console.error("Error syncing compounds:", e));
        return () => unsubscribe();
    }, [currentUser, discoveredCompoundsKey]);

    // Ensure Google's <model-viewer> is loaded for AR
    useEffect(() => {
        if (!document.getElementById('model-viewer-script')) {
            const script = document.createElement('script');
            script.id = 'model-viewer-script';
            script.type = 'module';
            script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
            document.head.appendChild(script);
        }
    }, []);

    // Drag and Drop Logic
    const handleDragStart = (e, sym) => {
        e.dataTransfer.setData('sym', sym);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const sym = e.dataTransfer.getData('sym');
        
        if (sym) {
            sndDrop.current.currentTime = 0; 
            sndDrop.current.play().catch(e => console.warn(e));
            
            setCurrentFlask(prev => {
                const newFlask = [...prev, sym];
                // Update visual level (max 50% before mixing)
                setFlaskState({ height: Math.min(newFlask.length * 10, 50), color: '#e0e4e8', mixed: false });
                return newFlask;
            });
        }
    };

    const clearFlask = () => {
        setCurrentFlask([]);
        setFlaskState({ height: 0, color: 'transparent', mixed: false });
        sndClear.current.currentTime = 0; 
        sndClear.current.play().catch(e => console.warn(e));
        if (isHeating) setIsHeating(false);
    };

    const pourLiquid = () => {
        if (flaskState.mixed) {
            if (flaskState.height > 0) {
                const newHeight = Math.max(0, flaskState.height - 10);
                setFlaskState(prev => ({ ...prev, height: newHeight }));
                sndDrop.current.currentTime = 0; sndDrop.current.play().catch(e => console.warn(e));
                if (newHeight === 0) clearFlask();
            }
        } else {
            if (currentFlask.length > 0) {
                setCurrentFlask(prev => {
                    const newFlask = prev.slice(0, -1);
                    setFlaskState({ height: Math.min(newFlask.length * 10, 50), color: '#e0e4e8', mixed: false });
                    return newFlask;
                });
                sndDrop.current.currentTime = 0; sndDrop.current.play().catch(e => console.warn(e));
            }
        }
    };

    const mixElements = () => {
        if (currentFlask.length === 0) {
            setResultData({ type: 'empty', res: null });
            setShowResultModal(true);
            createParticles('smoke', modalEffectsRef.current);
            return;
        }

        const mixKey = [...currentFlask].sort().join(',');
        
        if (recipes[mixKey]) {
            const res = recipes[mixKey];
            const needsHeat = !!res.requiresHeat;

            if (needsHeat && !isHeating) {
                setResultData({ type: 'needsHeat', res: null });
                setShowResultModal(true);
                createParticles('error', particlesContainerRef.current);
                createParticles('smoke', modalEffectsRef.current);
                sndError.current.currentTime = 0; sndError.current.play().catch(e => console.warn(e));
            } else if (!needsHeat && isHeating) {
                setResultData({ type: 'tooHot', res: null });
                setShowResultModal(true);
                createParticles('error', particlesContainerRef.current);
                createParticles('smoke', modalEffectsRef.current);
                sndError.current.currentTime = 0; sndError.current.play().catch(e => console.warn(e));
            } else {
                // Success
                setResultData({ type: 'success', res });
                setShowResultModal(true);
                createParticles('success', particlesContainerRef.current);
                createParticles('sparkles', modalEffectsRef.current);
                
                // Save discovery
                if (!discoveredCompounds.has(res.formula)) {
                    const newSet = new Set(discoveredCompounds).add(res.formula);
                    setDiscoveredCompounds(newSet);
                    const newArray = [...newSet];
                    localStorage.setItem(discoveredCompoundsKey, JSON.stringify(newArray));
                    setDoc(doc(db, "users", currentUser), { discoveredCompounds: newArray }, { merge: true }).catch(e => console.error(e));
                }
                
                sndSuccess.current.currentTime = 0; sndSuccess.current.play().catch(e => console.warn(e));
                setFlaskState({ height: 60, color: res.color || '#6e45e2', mixed: true });
            }
        } else {
            setResultData({ type: 'failed', res: null });
            setShowResultModal(true);
            createParticles('error', particlesContainerRef.current);
            createParticles('smoke', modalEffectsRef.current);
            sndError.current.currentTime = 0; sndError.current.play().catch(e => console.warn(e));
            setFlaskState(prev => ({ ...prev, height: 0 }));
        }
    };

    const createParticles = (type, container) => {
        if (!container) return;
        container.innerHTML = ''; 
        
        const count = (type === 'success' || type === 'sparkles') ? 30 : 15;
        const colors = ['#1dd1a1', '#48dbfb', '#feca57', '#a29bfe', '#fff'];
        
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            
            if (type === 'sparkles' || type === 'smoke') {
                p.className = type === 'sparkles' ? 'sparkle' : 'smoke';
                p.style.left = '50%';
                p.style.top = '60%';
                if (type === 'sparkles') {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 50 + Math.random() * 150;
                    p.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
                    p.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
                    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    p.style.boxShadow = `0 0 8px ${p.style.backgroundColor}`;
                } else {
                    const angle = (Math.random() - 0.5) * Math.PI; 
                    const distance = 60 + Math.random() * 120;
                    p.style.setProperty('--tx', `${Math.sin(angle) * distance}px`);
                    p.style.setProperty('--ty', `${-Math.cos(angle) * distance}px`);
                }
                p.style.animationDelay = `${Math.random() * 0.4}s`;
            } else {
                p.className = `particle ${type}`;
                const angle = Math.random() * Math.PI * 2;
                const distance = type === 'success' ? 40 + Math.random() * 80 : 30 + Math.random() * 60;
                p.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
                p.style.setProperty('--ty', `${Math.sin(angle) * distance - (type === 'error' ? 50 : 0)}px`);
                if (type === 'success') {
                    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    p.style.boxShadow = `0 0 8px ${p.style.backgroundColor}`;
                }
                p.style.animationDelay = `${Math.random() * 0.2}s`;
            }
            
            container.appendChild(p);
        }
        setTimeout(() => { if (container) container.innerHTML = ''; }, 2000);
    };

    // --- AR Logic ---
    const isMobileDevice = () => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMacTablet = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        return isMobile || isMacTablet;
    };

    const getModelFilename = (name) => {
        // Converts "Sodium Chloride (Salt)" to "sodium_chloride"
        return name.split(' (')[0].toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    };

    const openDesktopAR = () => {
        const arUrl = new URL(window.location.href);
        arUrl.searchParams.set('compound', resultData.res.formula);
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(arUrl.toString())}`);
        setShowDesktopAr(true);
    };

    // Auto-open compound if linked from a QR code
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const compoundFormula = params.get('compound');
        if (compoundFormula) {
            const res = Object.values(recipes).find(r => r.formula === compoundFormula);
            if (res) {
                setTimeout(() => {
                    setResultData({ type: 'success', res });
                    setShowResultModal(true);
                }, 100);
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, []);

    // Array of floating items (icons and text) for the animated background
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
        <div style={{ background: '#f8faff', minHeight: '100vh', position: 'relative' }}>
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
            <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }}><i className="fas fa-atom"></i> <span>AtomARix</span></div>
                <ul className="nav-links">
                    <li onClick={() => navigate('/home')}><i className="fas fa-home"></i> <span>Home</span></li>
                    <li onClick={() => navigate('/periodic-table')}><i className="fas fa-th"></i> <span>Periodic Table</span></li>
                    <li className="active"><i className="fas fa-flask"></i> <span>Laboratory</span></li>
                    <li onClick={() => navigate('/matchinggame')}><i className="fas fa-puzzle-piece"></i> <span>Matching Game</span></li>
                    <li onClick={() => navigate('/timeattack')}><i className="fas fa-stopwatch"></i> <span>Time Attack</span></li>
                    <li onClick={() => navigate('/achievements')}><i className="fas fa-trophy"></i> <span>Achievements</span></li>
                </ul>
                <div style={{ width: '130px' }}></div>
            </nav>

            <main className="dashboard-container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="hero-banner">
                    <div className="hero-text">
                        <h1>Virtual Laboratory ⚗️</h1>
                        <p>Combine elements safely to discover chemical compounds!</p>
                    </div>
                    <div className="hero-icon"><i className="fas fa-vial"></i></div>
                </div>

                <div className="lab-layout">
                    <div className="inventory-panel">
                        <h3 style={{ color: '#2d3436', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Element Inventory</h3>
                        <p style={{ color: '#7f8fa6', fontSize: '0.9rem', marginTop: '10px' }}>Drag elements into the flask</p>
                        <div className="inventory-search">
                            <i className="fas fa-search search-icon"></i>
                            <input type="text" value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} placeholder="Search by name or symbol..." />
                            {inventorySearch && <i className="fas fa-times clear-search-icon" style={{ display: 'block' }} onClick={() => setInventorySearch('')}></i>}
                        </div>
                        <div className="inventory-grid">
                            {baseElements.filter(el => el.name.toLowerCase().includes(inventorySearch.toLowerCase()) || el.sym.toLowerCase().includes(inventorySearch.toLowerCase())).map(el => (
                                <div key={el.sym} className="element-drag" draggable onDragStart={(e) => handleDragStart(e, el.sym)} title={el.name} style={{ borderColor: el.color }}>
                                    {el.sym}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="experiment-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '2px solid #f0f0f0', paddingBottom: '15px' }}>
                            <h2 style={{ color: '#2d3436' }}>Experiment Station</h2>
                            <button className="btn-secondary" onClick={() => { setShowRecipeModal(true); sndOpen.current.currentTime = 0; sndOpen.current.play().catch(e=>e); }}><i className="fas fa-book"></i> Experiment Guide</button>
                        </div>
                        
                        <div className="dropzone-wrapper" style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%', margin: '20px 0' }}>
                            <div className={`flask-dropzone ${isDragOver ? 'dragover' : ''}`} onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} style={{ margin: '0 0 65px 0' }}>
                                <div className={`flask-liquid ${isHeating ? 'boiling' : ''}`} style={{ height: `${flaskState.height}%`, backgroundColor: flaskState.color }}></div>
                                <div className="beaker-markings">
                                    <div className="mark"><span className="mark-text">250</span></div><div className="mark"></div>
                                    <div className="mark"><span className="mark-text">150</span></div><div className="mark"></div>
                                    <div className="mark"><span className="mark-text">50</span></div>
                                </div>
                                <div className="particles-container" ref={particlesContainerRef}></div>
                                <div className="added-elements">
                                    {currentFlask.map((sym, idx) => <div key={idx} className="added-element">{sym}</div>)}
                                </div>
                                <div className="bunsen-burner">
                                    <div className={`flame ${isHeating ? 'active' : ''}`}></div>
                                    <div className="burner-tube"></div>
                                    <div className="burner-base"></div>
                                </div>
                            </div>
                            
                            <button className="pour-toggle-btn" onClick={pourLiquid} title="Pour Liquid / Undo"><i className="fas fa-fill-drip"></i> <span>Pour</span></button>
                            <button className={`heat-toggle-btn ${isHeating ? 'active' : ''}`} onClick={() => setIsHeating(!isHeating)} title="Toggle Bunsen Burner"><i className="fas fa-power-off"></i> <span>Burner: {isHeating ? 'ON' : 'OFF'}</span></button>
                        </div>

                        <div className="controls">
                            <button className="btn-cancel" onClick={clearFlask}><i className="fas fa-trash"></i> Clear</button>
                            <button className="btn-primary" onClick={mixElements}><i className="fas fa-magic"></i> Mix</button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Recipe Modal */}
            {showRecipeModal && (
                <div className="modal-container show">
                    <div className="modal-content modern-modal">
                        <button className="modern-close-btn" onClick={() => setShowRecipeModal(false)}>&times;</button>
                        <div className="modal-sidebar">
                            <h2 className="recipe-title"><i className="fas fa-flask" style={{ color: '#6e45e2', marginRight: '10px' }}></i> Experiment Guide</h2>
                            <p className="recipe-desc">Use this guide to find the right elements and conditions to make new compounds.</p>
                            <div className="inventory-search">
                                <i className="fas fa-search search-icon"></i>
                                <input type="text" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder="Search compounds..." />
                            </div>
                        </div>
                        <div className="modal-main">
                            <div className="recipe-grid">
                                {Object.entries(recipes).filter(([_, res]) => res.name.toLowerCase().includes(recipeSearch.toLowerCase())).map(([key, res]) => {
                                    const isDiscovered = discoveredCompounds.has(res.formula);
                                    return (
                                        <div key={res.formula} className={`recipe-card ${isDiscovered ? '' : 'locked'}`}>
                                            <div className="recipe-icon">
                                                {res.icon}
                                                {!isDiscovered && <i className="fas fa-lock" style={{ position: 'absolute', bottom: '-5px', right: '-5px', fontSize: '0.8rem', color: '#b2bec3', background: '#fff', borderRadius: '50%', padding: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></i>}
                                            </div>
                                            <div className="recipe-card-content">
                                                <h4 style={{ color: '#2d3436', marginBottom: '3px', fontSize: '1.05rem' }}>{res.name}</h4>
                                                <p style={{ fontSize: '0.95rem', color: '#6e45e2', fontWeight: 'bold', marginBottom: '6px' }}>{res.formula}</p>
                                                <p style={{ fontSize: '0.8rem', color: '#636e72' }}>Req: <strong>{key.split(',').join(' + ')}</strong> {res.requiresHeat ? '🔥' : ''}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Modal */}
            {showResultModal && (
                <div className="modal-container show">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px 30px', position: 'relative', overflow: 'hidden' }}>
                        <div ref={modalEffectsRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}></div>
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            {resultData.type === 'empty' && (
                                <>
                                    <i className="fas fa-exclamation-circle" style={{ fontSize: '3.5rem', color: '#feca57', marginBottom: '15px' }}></i>
                                    <h2 style={{ color: '#2d3436', marginBottom: '10px' }}>Empty Flask!</h2>
                                    <p style={{ color: '#666', marginBottom: '25px' }}>Drag elements from the inventory first.</p>
                                    <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowResultModal(false)}>Close</button>
                                </>
                            )}
                            {resultData.type === 'needsHeat' && (
                                <>
                                    <i className="fas fa-snowflake" style={{ fontSize: '3.5rem', color: '#48dbfb', marginBottom: '15px' }}></i>
                                    <h2 style={{ color: '#2d3436', marginBottom: '10px' }}>Reaction Failed!</h2>
                                    <p style={{ color: '#666', marginBottom: '25px' }}>These elements need activation energy to react. Try turning on the Bunsen Burner!</p>
                                    <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowResultModal(false)}>Close</button>
                                </>
                            )}
                            {resultData.type === 'tooHot' && (
                                <>
                                    <i className="fas fa-fire" style={{ fontSize: '3.5rem', color: '#ff6b6b', marginBottom: '15px' }}></i>
                                    <h2 style={{ color: '#2d3436', marginBottom: '10px' }}>Reaction Failed!</h2>
                                    <p style={{ color: '#666', marginBottom: '25px' }}>The mixture got too hot and decomposed! Try mixing them without the burner on.</p>
                                    <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowResultModal(false)}>Close</button>
                                </>
                            )}
                            {resultData.type === 'failed' && (
                                <>
                                    <i className="fas fa-bomb" style={{ fontSize: '3.5rem', color: '#2d3436', marginBottom: '15px' }}></i>
                                    <h2 style={{ color: '#2d3436', marginBottom: '10px' }}>Reaction Failed!</h2>
                                    <p style={{ color: '#666', marginBottom: '25px' }}>These elements didn't form a known stable compound in this lab. Try clearing the flask and mixing a new combination.</p>
                                    <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowResultModal(false)}>Close</button>
                                </>
                            )}
                            {resultData.type === 'success' && resultData.res && (
                                <>
                                    <div className="element-model-box" style={{ width: '100%', height: '220px', margin: '0 auto 20px', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e1e1e1', position: 'relative', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
                                        <model-viewer
                                            src={`/assets/models/${getModelFilename(resultData.res.name)}.glb`}
                                            ios-src={`/assets/models/${getModelFilename(resultData.res.name)}.usdz`}
                                            alt={`3D model of ${resultData.res.name}`}
                                            auto-rotate
                                            rotation-per-second="45deg"
                                            scale="0.05 0.05 0.05"
                                            camera-controls
                                            ar
                                        autoplay
                                            ar-scale="auto"
                                            ar-modes="webxr scene-viewer quick-look"
                                            style={{ width: '100%', height: '100%' }}
                                        >
                                            <button slot="ar-button" style={{ position: 'absolute', bottom: '15px', right: '15px', background: '#6e45e2', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(110,69,226,0.3)' }}>
                                                <i className="fas fa-cube"></i> View in AR
                                            </button>
                                            <div slot="poster" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', color: '#888' }}>
                                                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{resultData.res.icon}</div>
                                                <span>Loading 3D Model...</span>
                                            </div>
                                        </model-viewer>
                                        {!isMobileDevice() && (
                                            <button 
                                                onClick={openDesktopAR}
                                                style={{ position: 'absolute', bottom: '15px', right: '15px', background: '#6e45e2', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(110,69,226,0.3)', zIndex: 10 }}
                                            >
                                                <i className="fas fa-cube"></i> View in AR
                                            </button>
                                        )}
                                    </div>
                                    <h2 style={{ color: '#2d3436', marginBottom: '5px' }}>Success!</h2>
                                    <p style={{ color: '#1dd1a1', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '10px' }}>Created {resultData.res.name} ({resultData.res.formula})</p>
                                    <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.5' }}>{resultData.res.desc}</p>
                                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                                        <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowResultModal(false)}>Close</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop AR Warning */}
            {showDesktopAr && (
                <div className="modal-container show" style={{ zIndex: 10001 }}>
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px 30px' }}>
                        <i className="fas fa-mobile-alt" style={{ fontSize: '3.5rem', color: '#4facfe', marginBottom: '15px' }}></i>
                        <h2 style={{ color: '#2d3436', marginBottom: '10px' }}>View in AR</h2>
                        <p style={{ color: '#666', marginBottom: '15px', lineHeight: '1.5' }}>Scan the QR code with your mobile device's camera to view <strong>{resultData?.res?.name}</strong> in Augmented Reality!</p>
                        <img src={qrUrl} alt="QR Code" style={{ marginBottom: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                        <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowDesktopAr(false)}>Got it</button>
                    </div>
                </div>
            )}
        </div>
    );
}