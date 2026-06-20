import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Laboratory.css';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// group: 'nonmetal' | 'metal' | 'noble' | 'metalloid' | 'halogen' | 'alkali' | 'alkaline'
const baseElements = [
    { sym: 'H',  num: 1,  name: 'Hydrogen',   group: 'nonmetal'  },
    { sym: 'He', num: 2,  name: 'Helium',      group: 'noble'     },
    { sym: 'Li', num: 3,  name: 'Lithium',     group: 'alkali'    },
    { sym: 'C',  num: 6,  name: 'Carbon',      group: 'nonmetal'  },
    { sym: 'N',  num: 7,  name: 'Nitrogen',    group: 'nonmetal'  },
    { sym: 'O',  num: 8,  name: 'Oxygen',      group: 'nonmetal'  },
    { sym: 'F',  num: 9,  name: 'Fluorine',    group: 'halogen'   },
    { sym: 'Na', num: 11, name: 'Sodium',      group: 'alkali'    },
    { sym: 'Mg', num: 12, name: 'Magnesium',   group: 'alkaline'  },
    { sym: 'Al', num: 13, name: 'Aluminium',   group: 'metal'     },
    { sym: 'P',  num: 15, name: 'Phosphorus',  group: 'nonmetal'  },
    { sym: 'S',  num: 16, name: 'Sulfur',      group: 'nonmetal'  },
    { sym: 'Cl', num: 17, name: 'Chlorine',    group: 'halogen'   },
    { sym: 'K',  num: 19, name: 'Potassium',   group: 'alkali'    },
    { sym: 'Ca', num: 20, name: 'Calcium',     group: 'alkaline'  },
    { sym: 'Fe', num: 26, name: 'Iron',        group: 'metal'     },
    { sym: 'Cu', num: 29, name: 'Copper',      group: 'metal'     },
    { sym: 'Zn', num: 30, name: 'Zinc',        group: 'metal'     },
    { sym: 'Br', num: 35, name: 'Bromine',     group: 'halogen'   },
    { sym: 'Ag', num: 47, name: 'Silver',      group: 'metal'     },
    { sym: 'Au', num: 79, name: 'Gold',        group: 'metal'     },
];

// Color palette per group — bg, text, accent
const GROUP_COLORS = {
    nonmetal: { bg: '#e6f1fb', text: '#0c447c', accent: '#185fa5' },
    noble:    { bg: '#e1f5ee', text: '#085041', accent: '#0f6e56' },
    alkali:   { bg: '#faeeda', text: '#633806', accent: '#854f0b' },
    alkaline: { bg: '#faece7', text: '#711813', accent: '#993c1d' },
    halogen:  { bg: '#fbeaf0', text: '#4b1528', accent: '#993556' },
    metal:    { bg: '#f1efe8', text: '#2c2c2a', accent: '#5f5e5a' },
    metalloid:{ bg: '#eaf3de', text: '#173404', accent: '#3b6d11' },
};

export const recipes = {
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

export const getModelFilename = (name) => {
    return name.split(' (')[0].toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

// ── XP & Level config ────────────────────────────────────────────────────────
const LEVELS = [
    { name: 'Apprentice',       minXp: 0    },
    { name: 'Chemist',          minXp: 200  },
    { name: 'Senior Chemist',   minXp: 500  },
    { name: 'Master Chemist',   minXp: 1000 },
    { name: 'Professor',        minXp: 2000 },
];

const getLevel = (xp) => {
    let level = LEVELS[0];
    for (const l of LEVELS) { if (xp >= l.minXp) level = l; }
    return level;
};

const getNextLevel = (xp) => {
    for (const l of LEVELS) { if (xp < l.minXp) return l; }
    return null;
};

// ── Lab badges (extends Achievements page) ───────────────────────────────────
const LAB_BADGES = [
    { id: 'lab-first',     title: 'First Discovery',  icon: '🔬', bg: 'bg-blue',   desc: 'Discover your first compound',          check: (d, s) => d >= 1  },
    { id: 'lab-water',     title: 'Hydration Expert', icon: '💧', bg: 'bg-blue',   desc: 'Discover Water (H₂O)',                  check: (d, s, f) => f.has('H₂O') },
    { id: 'lab-toxic',     title: 'Danger Zone',      icon: '☠️', bg: 'bg-red',    desc: 'Discover 3 toxic/dangerous compounds',  check: (d, s, f) => ['CO','H₂S','HF','HNO₃'].filter(x => f.has(x)).length >= 3 },
    { id: 'lab-pyromaniac',title: 'Pyromaniac',       icon: '🔥', bg: 'bg-orange', desc: 'Use the Bunsen burner 10 times',         check: (d, s, f, b) => b >= 10 },
    { id: 'lab-mad',       title: 'Mad Scientist',    icon: '🧪', bg: 'bg-purple', desc: 'Discover 15 compounds',                  check: (d) => d >= 15 },
    { id: 'lab-master',    title: 'Master Chemist',   icon: '🏅', bg: 'bg-gold',   desc: 'Discover all 36 compounds',              check: (d) => d >= 36 },
    { id: 'lab-speed',     title: 'Speed Mixer',      icon: '⚡', bg: 'bg-green',  desc: 'Discover 5 compounds in one session',    check: (d, sess) => sess >= 5 },
    { id: 'lab-recall',    title: 'Recall Master',    icon: '🧠', bg: 'bg-purple', desc: 'Score 7+ in the Compound Recall game',  check: (d, sess, f, b, recall) => recall >= 7 },
];

// ── Daily challenge pool ─────────────────────────────────────────────────────
const DAILY_CHALLENGES = [
    { key: 'H,H,O',         clue: 'Combine 2 Hydrogen atoms with 1 Oxygen atom',         xp: 150 },
    { key: 'Cl,Na',          clue: 'Mix a halogen with an alkali metal to make a salt',    xp: 150 },
    { key: 'H,H,H,N',        clue: 'A cleaning gas made of Nitrogen and 3 Hydrogens',      xp: 200 },
    { key: 'C,O,O',          clue: 'A greenhouse gas — needs heat! Carbon + 2 Oxygens',    xp: 200 },
    { key: 'H,H,S',          clue: 'Smells like rotten eggs — Sulfur + 2 Hydrogens',       xp: 150 },
    { key: 'Cl,H',           clue: 'A single Chlorine with a single Hydrogen',              xp: 100 },
    { key: 'Fe,Fe,O,O,O',    clue: 'What happens when Iron meets Oxygen? (needs heat)',     xp: 250 },
    { key: 'O,O,O',          clue: '3 Oxygen atoms protect us from UV rays',                xp: 200 },
    { key: 'H,Na,O',         clue: 'An alkali metal + Hydrogen + Oxygen = soap maker',      xp: 200 },
    { key: 'C,H,H,H,H',      clue: 'Natural gas — Carbon with 4 Hydrogens',                xp: 150 },
];


// ── Recipe categories ─────────────────────────────────────────────────────────
const CATEGORIES = [
    { id: 'all',    label: 'All',    icon: '🧪' },
    { id: 'acid',   label: 'Acids',  icon: '⚗️' },
    { id: 'oxide',  label: 'Oxides', icon: '🔵' },
    { id: 'salt',   label: 'Salts',  icon: '🧂' },
    { id: 'gas',    label: 'Gases',  icon: '💨' },
    { id: 'other',  label: 'Other',  icon: '🔬' },
];

const getCategory = (name) => {
    const n = name.toLowerCase();
    if (n.includes('acid'))                          return 'acid';
    if (n.includes('oxide'))                         return 'oxide';
    if (n.includes('chloride') || n.includes('sulfate') || n.includes('nitrate') ||
        n.includes('bromide')  || n.includes('carbonate') || n.includes('hydroxide') ||
        n.includes('bicarbonate') || n.includes('fluoride'))  return 'salt';
    if (n.includes('dioxide') || n.includes('monoxide') || n.includes('gas') ||
        n.includes('ozone')   || n.includes('ammonia') || n.includes('methane') ||
        n.includes('hydrogen sulfide') || n.includes('nitrous') || n.includes('nitrogen dioxide'))
                                                     return 'gas';
    return 'other';
};



export default function Laboratory() {
    const navigate = useNavigate();
    const currentUser = sessionStorage.getItem('loggedInUser') || 'Scientist';
    const discoveredCompoundsKey = `discoveredCompounds_${currentUser}`;

    // State
    const [inventorySearch, setInventorySearch] = useState('');
    const [recipeSearch, setRecipeSearch] = useState('');
    const [recipeCategory, setRecipeCategory] = useState('all');
    const [currentFlask, setCurrentFlask] = useState([]);
    const [flaskState, setFlaskState] = useState({ height: 0, color: 'transparent', mixed: false });
    const [isHeating, setIsHeating] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [discoveredCompounds, setDiscoveredCompounds] = useState(
        new Set(JSON.parse(localStorage.getItem(discoveredCompoundsKey)) || [])
    );

    // ── Gamification state ──────────────────────────────────────────────────
    const [xp, setXp] = useState(0);
    const [xpToast, setXpToast] = useState(null);           // { amount, label }
    const [badgeToast, setBadgeToast] = useState(null);      // { title, icon, bg }
    const [hintsLeft, setHintsLeft] = useState(3);
    const [currentHint, setCurrentHint] = useState(null);
    const [showHint, setShowHint] = useState(false);
    const [dailyChallenge, setDailyChallenge] = useState(null);
    const [dailyDone, setDailyDone] = useState(false);
    const [sessionDiscoveries, setSessionDiscoveries] = useState(0);

    // Modals
    const [showRecipeModal, setShowRecipeModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [resultData, setResultData] = useState({ type: 'empty', res: null });
    const [showDesktopAr, setShowDesktopAr] = useState(false);
    const [qrUrl, setQrUrl] = useState('');

    // ── Compound Recall mini-game state ───────────────────────────────────────
    const [showRecallGame, setShowRecallGame] = useState(false);
    const [recallActive, setRecallActive] = useState(false);
    const [recallRound, setRecallRound] = useState(null);   // { key, compound, choices: [el1, el2, el3, el4] }
    const [recallScore, setRecallScore] = useState(0);
    const [recallStreak, setRecallStreak] = useState(0);
    const [recallRoundsLeft, setRecallRoundsLeft] = useState(0);
    const [recallFeedback, setRecallFeedback] = useState(null); // { correct: bool, sym: string }
    const [recallBestScore, setRecallBestScore] = useState(
        parseInt(localStorage.getItem(`compoundRecallBestScore_${currentUser}`) || '0', 10)
    );
    const [recallGameFinished, setRecallGameFinished] = useState(false);
    const [isNewRecallBest, setIsNewRecallBest] = useState(false);
    const RECALL_TOTAL_ROUNDS = 8;

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

    const addToFlask = (sym) => {
        sndDrop.current.currentTime = 0; 
        sndDrop.current.play().catch(e => console.warn(e));
        
        // Provide haptic feedback for mobile users
        if (navigator.vibrate) {
            navigator.vibrate(40);
        }
        
        setCurrentFlask(prev => {
            const newFlask = [...prev, sym];
            // Update visual level (max 50% before mixing)
            setFlaskState({ height: Math.min(newFlask.length * 10, 50), color: '#e0e4e8', mixed: false });
            return newFlask;
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const sym = e.dataTransfer.getData('sym');
        if (sym) addToFlask(sym);
    };

    const clearFlask = () => {
        setCurrentFlask([]);
        setFlaskState({ height: 0, color: 'transparent', mixed: false });
        sndClear.current.currentTime = 0; 
        sndClear.current.play().catch(e => console.warn(e));
        if (isHeating) setIsHeating(false);
    };

    const removeFromFlask = (idx) => {
        setCurrentFlask(prev => {
            const newFlask = prev.filter((_, i) => i !== idx);
            setFlaskState({ height: Math.min(newFlask.length * 10, 50), color: '#e0e4e8', mixed: false });
            return newFlask;
        });
        sndDrop.current.currentTime = 0;
        sndDrop.current.play().catch(e => console.warn(e));
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


    // ── Add all recipe elements directly to flask ────────────────────────────
    const addRecipeToFlask = (key) => {
        const elements = key.split(',');
        setCurrentFlask([]);
        setFlaskState({ height: 0, color: 'transparent', mixed: false });
        setTimeout(() => {
            elements.forEach((sym, i) => {
                setTimeout(() => addToFlask(sym), i * 80);
            });
        }, 50);
        setShowRecipeModal(false);
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
                
                // Save discovery + gamification
                const isNewDiscovery = !discoveredCompounds.has(res.formula);
                const newSet = new Set(discoveredCompounds);
                if (isNewDiscovery) {
                    newSet.add(res.formula);
                    setDiscoveredCompounds(newSet);
                    const newArray = [...newSet];
                    localStorage.setItem(discoveredCompoundsKey, JSON.stringify(newArray));
                    setDoc(doc(db, "users", currentUser), { discoveredCompounds: newArray }, { merge: true }).catch(e => console.error(e));

                    // XP: heat-required = 150, normal = 100 for new discovery
                    const earnedXp = res.requiresHeat ? 150 : 100;
                    awardXp(earnedXp, `New: ${res.name}!`);

                    // Daily challenge check
                    const mixKey2 = [...currentFlask].sort().join(',');
                    if (dailyChallenge && mixKey2 === dailyChallenge.key && !dailyDone) {
                        const todayKey = new Date().toISOString().slice(0, 10);
                        setDailyDone(true);
                        awardXp(dailyChallenge.xp, '🌟 Daily Challenge Complete!');
                        setDoc(doc(db, 'users', currentUser), { dailyChallengeDate: todayKey }, { merge: true }).catch(e => console.error(e));
                    }

                    const newSession = sessionDiscoveries + 1;
                    setSessionDiscoveries(newSession);
                    checkBadges(newSet, newSession, 0);
                } else {
                    // Repeat discovery = less XP
                    awardXp(10, `${res.name} (already known)`);
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

    const getFlaskFormula = () => {
        if (currentFlask.length === 0) return "";
        const counts = {};
        currentFlask.forEach(s => counts[symToProper(s)] = (counts[symToProper(s)] || 0) + 1);
        return Object.entries(counts).map(([s, c]) => `${s}${c > 1 ? c : ''}`).join('');
    };

    const symToProper = (s) => {
        return baseElements.find(el => el.sym === s)?.sym || s;
    };

    // --- AR Logic ---
    const isMobileDevice = () => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMacTablet = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        return isMobile || isMacTablet;
    };

    const getModelFilename = (name) => {
        return name.split(' (')[0].toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    };

    const openDesktopAR = () => {
        // Point to the public AR viewer route — not the current (login-protected)
        // Laboratory page — so scanning the QR code on a phone opens the 3D
        // model directly instead of bouncing to Login on an unauthenticated device.
        const arUrl = new URL(window.location.origin + '/ar-view');
        arUrl.searchParams.set('compound', resultData.res.formula);
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(arUrl.toString())}`);
        setShowDesktopAr(true);
    };

    // ── Load XP, hints, daily challenge from Firestore on mount ────────────────
    useEffect(() => {
        const loadGamification = async () => {
            try {
                const userSnap = await getDoc(doc(db, 'users', currentUser));
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setXp(data.labXp || 0);
                    // Hints reset daily
                    const today = new Date().toDateString();
                    if (data.hintResetDate === today) {
                        setHintsLeft(data.hintsLeft ?? 3);
                    } else {
                        setHintsLeft(3);
                        setDoc(doc(db, 'users', currentUser), { hintsLeft: 3, hintResetDate: today }, { merge: true });
                    }
                    // Daily challenge
                    const todayKey = new Date().toISOString().slice(0, 10);
                    const challengeIdx = new Date().getDate() % DAILY_CHALLENGES.length;
                    setDailyChallenge(DAILY_CHALLENGES[challengeIdx]);
                    setDailyDone(data.dailyChallengeDate === todayKey);
                }
            } catch (e) { console.error(e); }
        };
        loadGamification();
    }, [currentUser]);

    // ── XP toast auto-dismiss ────────────────────────────────────────────────
    useEffect(() => {
        if (xpToast) {
            const t = setTimeout(() => setXpToast(null), 2500);
            return () => clearTimeout(t);
        }
    }, [xpToast]);

    // ── Badge toast auto-dismiss ─────────────────────────────────────────────
    useEffect(() => {
        if (badgeToast) {
            const t = setTimeout(() => setBadgeToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [badgeToast]);

    // ── Award XP helper ──────────────────────────────────────────────────────
    const awardXp = (amount, label) => {
        setXp(prev => {
            const newXp = prev + amount;
            setDoc(doc(db, 'users', currentUser), { labXp: newXp }, { merge: true }).catch(e => console.error(e));
            return newXp;
        });
        setXpToast({ amount, label });
    };

    // ── Check and award lab badges ───────────────────────────────────────────
    const checkBadges = (newDiscoveredSet, newSessionCount, burnerUses, recallScore = 0) => {
        const earnedKey = `labBadges_${currentUser}`;
        const alreadyEarned = new Set(JSON.parse(localStorage.getItem(earnedKey)) || []);
        const newlyEarned = [];

        LAB_BADGES.forEach(badge => {
            if (!alreadyEarned.has(badge.id) &&
                badge.check(newDiscoveredSet.size, newSessionCount, newDiscoveredSet, burnerUses, recallScore)) {
                alreadyEarned.add(badge.id);
                newlyEarned.push(badge);
            }
        });

        if (newlyEarned.length > 0) {
            localStorage.setItem(earnedKey, JSON.stringify([...alreadyEarned]));
            // Show toast for first newly earned badge
            setBadgeToast(newlyEarned[0]);
            // Save to Firestore
            setDoc(doc(db, 'users', currentUser), {
                labBadges: [...alreadyEarned]
            }, { merge: true }).catch(e => console.error(e));
        }
    };

    // ── Compound Recall mini-game ────────────────────────────────────────────
    // A quick popup quiz: shown a compound's formula/icon, the student picks
    // which element was NOT part of the mixture. Reinforces the same recipes
    // data already used in the main lab, just tested in reverse (recall vs. build).
    const generateRecallRound = () => {
        const recipeEntries = Object.entries(recipes);
        const [key, compound] = recipeEntries[Math.floor(Math.random() * recipeEntries.length)];
        const correctSymbols = [...new Set(key.split(','))];

        // Pick one correct element as the "answer" plus 3 distractor elements
        // that are NOT part of this compound, to test recall of its actual makeup.
        const correctSym = correctSymbols[Math.floor(Math.random() * correctSymbols.length)];
        const wrongPool = baseElements.filter(e => !correctSymbols.includes(e.sym));
        const shuffledWrong = [...wrongPool].sort(() => Math.random() - 0.5).slice(0, 3);

        const choices = [correctSym, ...shuffledWrong.map(e => e.sym)].sort(() => Math.random() - 0.5);

        setRecallRound({ key, compound, correctSym, choices });
        setRecallFeedback(null);
    };

    const startRecallGame = () => {
        setRecallScore(0);
        setRecallStreak(0);
        setRecallRoundsLeft(RECALL_TOTAL_ROUNDS);
        setRecallActive(true);
        setRecallGameFinished(false);
        setIsNewRecallBest(false);
        generateRecallRound();
    };

    const answerRecallRound = (chosenSym) => {
        if (recallFeedback) return; // prevent double-answer during feedback display
        const isCorrect = chosenSym === recallRound.correctSym;

        if (isCorrect) {
            setRecallScore(prev => prev + 1);
            setRecallStreak(prev => prev + 1);
        } else {
            setRecallStreak(0);
        }
        setRecallFeedback({ correct: isCorrect, sym: chosenSym });

        setTimeout(() => {
            const remaining = recallRoundsLeft - 1;
            setRecallRoundsLeft(remaining);
            if (remaining > 0) {
                generateRecallRound();
            } else {
                finishRecallGame();
            }
        }, 900);
    };

    const finishRecallGame = () => {
        setRecallActive(false);
        setRecallGameFinished(true);

        // Save best score (mirrors the matchingGameBestScore / timeAttackBestCorrect pattern)
        setRecallScore(currentScore => {
            const bestKey = `compoundRecallBestScore_${currentUser}`;
            const existingBest = parseInt(localStorage.getItem(bestKey) || '0', 10);
            if (currentScore > existingBest) {
                localStorage.setItem(bestKey, currentScore.toString());
                setRecallBestScore(currentScore);
                setIsNewRecallBest(true);
                setDoc(doc(db, 'users', currentUser), { compoundRecallBestScore: currentScore }, { merge: true }).catch(e => console.error(e));
            }
            // Award XP for participating, scaled by performance
            awardXp(currentScore * 15, `Compound Recall: ${currentScore}/${RECALL_TOTAL_ROUNDS}`);
            // Check for the Recall Master badge using the score just earned
            checkBadges(discoveredCompounds, sessionDiscoveries, 0, currentScore);
            return currentScore;
        });
    };

    const closeRecallGame = () => {
        setShowRecallGame(false);
        setRecallActive(false);
        setRecallRound(null);
        setRecallFeedback(null);
        setRecallGameFinished(false);
    };


    const useHint = () => {
        if (hintsLeft <= 0) return;
        // Find a random undiscovered compound and reveal one element
        const undiscovered = Object.entries(recipes).filter(([key]) => {
            const formula = recipes[key].formula;
            return !discoveredCompounds.has(formula);
        });
        if (undiscovered.length === 0) {
            setCurrentHint("🎉 You've discovered all compounds!");
            setShowHint(true);
            return;
        }
        const [key, rec] = undiscovered[Math.floor(Math.random() * undiscovered.length)];
        const elements = key.split(',');
        const revealed = elements[Math.floor(Math.random() * elements.length)];
        const el = baseElements.find(e => e.sym === revealed);
        setCurrentHint(`Try using ${el?.name || revealed} (${revealed}) — it's part of a compound you haven't found yet!`);
        setShowHint(true);
        const newHints = hintsLeft - 1;
        setHintsLeft(newHints);
        setDoc(doc(db, 'users', currentUser), { hintsLeft: newHints }, { merge: true }).catch(e => console.error(e));
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

                    /* Laboratory Header Height Reduction */
                    .hero-banner {
                        padding: 20px 30px !important;
                        min-height: 110px !important;
                    }
                    .hero-banner h1 { font-size: 1.8rem !important; margin-bottom: 4px !important; }
                    .hero-banner p { font-size: 0.95rem !important; }

                    /* Lab Toolbar Buttons Styling */
                    .lab-toolbar {
                        display: flex;
                        gap: 12px;
                        width: 100%;
                        margin-top: 20px;
                    }
                    .lab-toolbar-btn {
                        flex: 1;
                        padding: 12px 20px;
                        border-radius: 12px;
                        border: none;
                        font-weight: 700;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        font-family: inherit;
                        font-size: 0.95rem;
                    }
                    .lab-toolbar-btn.clear {
                        background: rgba(255, 255, 255, 0.05);
                        color: #ff7675;
                        border: 1px solid rgba(255, 118, 117, 0.2);
                    }
                    .lab-toolbar-btn.clear:hover { background: rgba(255, 118, 117, 0.15); border-color: #ff7675; }
                    .lab-toolbar-btn.mix {
                        background: linear-gradient(135deg, #6e45e2 0%, #4facfe 100%);
                        color: white;
                        box-shadow: 0 4px 15px rgba(110, 69, 226, 0.3);
                    }
                    .lab-toolbar-btn.mix:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(110, 69, 226, 0.4); }
                    .lab-toolbar-btn:active { transform: scale(0.95); }

                    /* Mobile UX Layout Improvements */
                    @media (max-width: 850px) {
                        .lab-layout {
                            display: flex;
                            flex-direction: column;
                            gap: 15px;
                        }
                        
                        /* Keeps the flask and controls at the top while scrolling elements */
                        .experiment-panel {
                            position: sticky;
                            top: 70px; /* Aligned below the navbar */
                            z-index: 100;
                            background: #1e1e2e !important;
                            padding: 15px !important;
                            border-radius: 20px !important;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
                            margin-bottom: 5px !important;
                            border: 1px solid #2d2d3f !important;
                        }

                        .experiment-panel h2 { font-size: 1.1rem !important; }
                        .experiment-panel .btn-secondary { padding: 5px 10px !important; font-size: 0.75rem !important; }
                        
                        /* Compact flask for mobile height constraints */
                        .flask-dropzone {
                            transform: scale(0.7);
                            margin: -35px 0 20px 0 !important;
                        }

                        .dropzone-wrapper { margin: 5px 0 !important; }

                        .heat-toggle-btn, .pour-toggle-btn {
                            padding: 8px 12px !important;
                            font-size: 0.8rem !important;
                        }

                        .inventory-panel {
                            background: #fff;
                            border-radius: 20px;
                            padding: 20px;
                        }

                        .hero-banner {
                            padding: 15px 20px !important;
                            min-height: unset !important;
                            margin-bottom: 10px !important;
                        }
                        .hero-banner h1 { font-size: 1.3rem !important; margin: 0 !important; }
                        .hero-banner p { display: none; }
                        .hero-icon { font-size: 1.5rem !important; }
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

                {/* ── XP Toast ── */}
                {xpToast && (
                    <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999, background: 'linear-gradient(135deg, #6e45e2, #4facfe)', color: '#fff', padding: '12px 20px', borderRadius: '14px', fontWeight: '700', fontSize: '1rem', boxShadow: '0 8px 24px rgba(110,69,226,0.4)', animation: 'popIn 0.3s ease', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.3rem' }}>⭐</span>
                        +{xpToast.amount} XP — {xpToast.label}
                    </div>
                )}

                {/* ── Badge Toast ── */}
                {badgeToast && (
                    <div style={{ position: 'fixed', top: '140px', right: '20px', zIndex: 9999, background: '#fff', border: '2px solid #6e45e2', padding: '14px 20px', borderRadius: '16px', fontWeight: '700', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', animation: 'popIn 0.3s ease', maxWidth: '280px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#6e45e2', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>🏅 Badge Unlocked!</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.8rem' }}>{badgeToast.icon}</span>
                            <div>
                                <div style={{ color: '#1a1a2e', fontSize: '0.95rem' }}>{badgeToast.title}</div>
                                <div style={{ color: '#888', fontSize: '0.75rem', fontWeight: '400' }}>{badgeToast.desc}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Hint modal ── */}
                {showHint && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', maxWidth: '360px', textAlign: 'center', boxShadow: '0 16px 40px rgba(0,0,0,0.2)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💡</div>
                            <h3 style={{ color: '#1a1a2e', marginBottom: '12px' }}>Lab Hint</h3>
                            <p style={{ color: '#555', lineHeight: '1.6', marginBottom: '20px' }}>{currentHint}</p>
                            <button className="btn-primary" onClick={() => setShowHint(false)} style={{ width: '100%' }}>Got it!</button>
                        </div>
                    </div>
                )}

                <div className="hero-banner">
                    <div className="hero-text">
                        <h1>Virtual Laboratory ⚗️</h1>
                        <p>Combine elements safely to discover chemical compounds!</p>
                    </div>
                    <div className="hero-icon"><i className="fas fa-vial"></i></div>
                </div>

                <div className="lab-layout">
                    {/* ── Inventory Panel ── */}
                    <div className="inventory-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px', marginBottom: '14px' }}>
                            <h3 style={{ color: '#2d3436', margin: 0, fontSize: '1rem', fontWeight: '700' }}>Element Inventory</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn-secondary"
                                    style={{ padding: '6px 14px', fontSize: '0.8rem', background: hintsLeft > 0 ? '#fffbea' : '#f0f0f0', borderColor: hintsLeft > 0 ? '#f6c90e' : '#ddd', color: hintsLeft > 0 ? '#856404' : '#aaa' }}
                                    onClick={useHint}
                                    title={hintsLeft > 0 ? `Use a hint (${hintsLeft} left today)` : 'No hints left today'}
                                >
                                    💡 Hint ({hintsLeft})
                                </button>
                                <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => { setShowRecipeModal(true); sndOpen.current.currentTime = 0; sndOpen.current.play().catch(e=>e); }}>
                                    <i className="fas fa-book"></i> Guide
                                </button>
                            </div>
                        </div>

                        {/* Discovery progress bar */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#7f8fa6', fontWeight: '600' }}>Compounds discovered</span>
                                <span style={{ fontSize: '0.8rem', color: '#6e45e2', fontWeight: '700' }}>{discoveredCompounds.size} / {Object.keys(recipes).length}</span>
                            </div>
                            <div style={{ height: '7px', background: '#f0f0f0', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(discoveredCompounds.size / Object.keys(recipes).length) * 100}%`, background: 'linear-gradient(90deg, #6e45e2, #4facfe)', borderRadius: '99px', transition: 'width 0.6s ease' }}></div>
                            </div>
                        </div>

                        {/* Group legend */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                            {Object.entries(GROUP_COLORS).map(([group, c]) => (
                                <span key={group} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '99px', background: c.bg, color: c.accent, fontWeight: '700', textTransform: 'capitalize' }}>{group}</span>
                            ))}
                        </div>

                        <p style={{ color: '#7f8fa6', fontSize: '0.82rem', margin: '0 0 12px' }}>Tap or drag elements into the flask</p>
                        <div className="inventory-search">
                            <i className="fas fa-search search-icon"></i>
                            <input type="text" value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} placeholder="Search by name or symbol..." />
                            {inventorySearch && <i className="fas fa-times clear-search-icon" style={{ display: 'block' }} onClick={() => setInventorySearch('')}></i>}
                        </div>

                        <div className="inventory-grid" style={{ marginTop: '14px' }}>
                            {baseElements
                                .filter(el => el.name.toLowerCase().includes(inventorySearch.toLowerCase()) || el.sym.toLowerCase().includes(inventorySearch.toLowerCase()))
                                .map(el => {
                                    const gc = GROUP_COLORS[el.group] || GROUP_COLORS.metal;
                                    return (
                                        <div
                                            key={el.sym}
                                            className="element-drag"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, el.sym)}
                                            onClick={() => addToFlask(el.sym)}
                                            title={`${el.name} (${el.group})`}
                                            style={{ background: gc.bg, borderColor: gc.accent, width: '62px', height: '70px', flexDirection: 'column', gap: '1px', padding: '4px 2px', position: 'relative', cursor: 'pointer' }}
                                        >
                                            <span style={{ fontSize: '0.6rem', color: gc.accent, alignSelf: 'flex-start', paddingLeft: '4px', lineHeight: 1 }}>{el.num}</span>
                                            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: gc.text, lineHeight: 1 }}>{el.sym}</span>
                                            <span style={{ fontSize: '0.55rem', color: gc.accent, textAlign: 'center', lineHeight: 1.2, maxWidth: '58px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{el.name}</span>
                                        </div>
                                    );
                                })
                            }
                            {inventorySearch && baseElements.filter(el => el.name.toLowerCase().includes(inventorySearch.toLowerCase()) || el.sym.toLowerCase().includes(inventorySearch.toLowerCase())).length === 0 && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#aaa', fontSize: '0.85rem', padding: '20px 0' }}>
                                    <i className="fas fa-search" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '8px', opacity: 0.4 }}></i>
                                    No elements found
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Experiment Panel (dark lab bench) ── */}
                    <div className="experiment-panel" style={{ background: '#1e1e2e', borderColor: '#2d2d3f' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px', marginBottom: '4px' }}>
                            <h2 style={{ color: '#fff', margin: 0, fontSize: '1rem', fontWeight: '700' }}>⚗️ Experiment Station</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>
                                    {currentFlask.length > 0 ? `${currentFlask.length} element${currentFlask.length !== 1 ? 's' : ''} added` : 'Flask is empty'}
                                </span>
                                <button
                                    onClick={() => { setShowRecallGame(true); startRecallGame(); }}
                                    title="Play Compound Recall"
                                    style={{ background: 'linear-gradient(135deg, #6e45e2, #8e44ad)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 3px 10px rgba(110,69,226,0.35)' }}
                                >
                                    <i className="fas fa-brain"></i> Compound Recall
                                </button>
                            </div>
                        </div>


                        <div className="dropzone-wrapper" style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%', margin: '16px 0' }}>
                            <div
                                className={`flask-dropzone ${isDragOver ? 'dragover' : ''} ${resultData.type === 'failed' && showResultModal ? 'shake-animation' : ''}`}
                                onDrop={handleDrop}
                                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                style={{ margin: '0 0 65px 0', boxShadow: isHeating ? '0 0 30px rgba(255,107,107,0.5), 0 0 60px rgba(255,107,107,0.2)' : 'none', transition: 'box-shadow 0.5s ease', borderColor: 'rgba(180,190,200,0.4)' }}
                            >
                                {currentFlask.length > 0 && !flaskState.mixed && (
                                    <div style={{ position: 'absolute', top: '-38px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(110,69,226,0.2)', color: '#a29bfe', padding: '3px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap', border: '1px solid rgba(110,69,226,0.35)' }}>
                                        {getFlaskFormula()}
                                    </div>
                                )}
                                <div className={`flask-liquid ${isHeating ? 'boiling' : ''}`} style={{ height: `${flaskState.height}%`, backgroundColor: flaskState.color }}></div>
                                <div className="beaker-markings">
                                    <div className="mark"><span className="mark-text">250</span></div><div className="mark"></div>
                                    <div className="mark"><span className="mark-text">150</span></div><div className="mark"></div>
                                    <div className="mark"><span className="mark-text">50</span></div>
                                </div>
                                <div className="particles-container" ref={particlesContainerRef}></div>
                                <div className="added-elements" style={{ zIndex: 3, marginBottom: '20px' }}>
                                    {currentFlask.map((sym, idx) => {
                                        const el = baseElements.find(e => e.sym === sym);
                                        const gc = el ? GROUP_COLORS[el.group] : GROUP_COLORS.metal;
                                        return (
                                            <div
                                                key={idx}
                                                className="added-element"
                                                style={{ background: gc.bg, border: `2px solid ${gc.accent}`, color: gc.text, borderRadius: '99px', width: 'auto', padding: '0 10px', gap: '5px', fontSize: '0.85rem', height: '34px', display: 'flex', alignItems: 'center' }}
                                            >
                                                <span style={{ fontWeight: '800' }}>{sym}</span>
                                                {!flaskState.mixed && (
                                                    <span
                                                        onClick={(e) => { e.stopPropagation(); removeFromFlask(idx); }}
                                                        style={{ fontSize: '0.7rem', opacity: 0.6, cursor: 'pointer', lineHeight: 1, marginLeft: '2px' }}
                                                    >✕</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="bunsen-burner">
                                    <div className={`flame ${isHeating ? 'active' : ''}`}></div>
                                    <div className="burner-tube"></div>
                                    <div className="burner-base"></div>
                                </div>
                            </div>

                            <button className="pour-toggle-btn" onClick={pourLiquid} title="Pour / Undo last element"><i className="fas fa-fill-drip"></i> <span>Pour</span></button>
                            <button className={`heat-toggle-btn ${isHeating ? 'active' : ''}`} onClick={() => setIsHeating(!isHeating)} title="Toggle Bunsen Burner"><i className="fas fa-fire"></i> <span>Burner: {isHeating ? 'ON' : 'OFF'}</span></button>
                        </div>

                        <div className="lab-toolbar">
                            <button className="lab-toolbar-btn clear" onClick={clearFlask}>
                                <i className="fas fa-trash"></i> Clear
                            </button>
                            <button className="lab-toolbar-btn mix" onClick={mixElements}>
                                <i className="fas fa-magic"></i> Mix Elements
                            </button>
                        </div>

                        {/* ── Daily Challenge (bottom of experiment panel) ── */}
                        {dailyChallenge && (
                            <div style={{ width: '100%', marginTop: '14px', borderRadius: '10px', padding: '10px 14px', background: dailyDone ? 'rgba(29,209,161,0.15)' : 'rgba(240,147,251,0.12)', border: `1px solid ${dailyDone ? 'rgba(29,209,161,0.3)' : 'rgba(240,147,251,0.3)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{dailyDone ? '✅' : '🌟'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '0.7rem', color: dailyDone ? '#1dd1a1' : '#f093fb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                                        Daily Challenge {dailyDone ? '— Complete!' : `— +${dailyChallenge.xp} XP`}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
                                        {dailyDone ? 'Come back tomorrow for a new challenge!' : dailyChallenge.clue}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Recipe Modal — fully redesigned */}
            {showRecipeModal && (
                <div className="guide-overlay" onClick={() => setShowRecipeModal(false)}>
                    <div className="guide-sheet" onClick={e => e.stopPropagation()}>

                        {/* ── Header ── */}
                        <div className="guide-header">
                            <div>
                                <div className="guide-title">⚗️ Experiment Guide</div>
                                <div className="guide-subtitle">
                                    <span className="guide-discovered-badge">{discoveredCompounds.size} / {Object.keys(recipes).length} discovered</span>
                                    <div className="guide-progress-bar">
                                        <div className="guide-progress-fill" style={{ width: `${(discoveredCompounds.size / Object.keys(recipes).length) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <button className="guide-close-btn" onClick={() => setShowRecipeModal(false)}>✕</button>
                        </div>

                        {/* ── Search ── */}
                        <div className="guide-search-wrap">
                            <i className="fas fa-search guide-search-icon"></i>
                            <input
                                className="guide-search-input"
                                type="text"
                                value={recipeSearch}
                                onChange={e => { setRecipeSearch(e.target.value); setRecipeCategory('all'); }}
                                placeholder="Search compounds..."
                            />
                            {recipeSearch && (
                                <span className="guide-search-clear" onClick={() => setRecipeSearch('')}>✕</span>
                            )}
                        </div>

                        {/* ── Category tabs ── */}
                        {!recipeSearch && (
                            <div className="guide-tabs">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        className={`guide-tab ${recipeCategory === cat.id ? 'active' : ''}`}
                                        onClick={() => setRecipeCategory(cat.id)}
                                    >
                                        <span>{cat.icon}</span> {cat.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Recipe grid ── */}
                        <div className="guide-grid">
                            {Object.entries(recipes)
                                .filter(([_, res]) => {
                                    const matchSearch = res.name.toLowerCase().includes(recipeSearch.toLowerCase()) ||
                                                        res.formula.toLowerCase().includes(recipeSearch.toLowerCase());
                                    const matchCat = recipeCategory === 'all' || getCategory(res.name) === recipeCategory;
                                    return matchSearch && matchCat;
                                })
                                .sort((a, b) => a[1].name.localeCompare(b[1].name))
                                .map(([key, res]) => (
                                    <div key={res.formula} className="guide-card unlocked">
                                        <div className="guide-card-icon">{res.icon}</div>
                                        <div className="guide-card-body">
                                            <div className="guide-card-name">{res.name}</div>
                                            <div className="guide-card-formula">{res.formula}</div>
                                            <div className="guide-card-recipe">
                                                {key.split(',').map((sym, i) => (
                                                    <span key={i} className="guide-element-chip">{sym}</span>
                                                ))}
                                                {res.requiresHeat && <span className="guide-heat-badge">🔥 Heat</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                            {Object.entries(recipes).filter(([_, res]) => {
                                const matchSearch = res.name.toLowerCase().includes(recipeSearch.toLowerCase());
                                const matchCat = recipeCategory === 'all' || getCategory(res.name) === recipeCategory;
                                return matchSearch && matchCat;
                            }).length === 0 && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: '#aaa' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                                    <div style={{ fontWeight: '600' }}>No compounds found</div>
                                </div>
                            )}
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
                                            alt={`3D model of ${resultData.res.name}`}
                                            auto-rotate
                                            rotation-per-second="45deg"
                                            camera-controls
                                            ar
                                        autoplay
                                            ar-scale="fixed"
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
            {/* ── Compound Recall Mini-Game ── */}
            {showRecallGame && (
                <div className="modal-container show" style={{ zIndex: 10002 }} onClick={(e) => { if (e.target === e.currentTarget && !recallActive) closeRecallGame(); }}>
                    <div className="modal-content" style={{ maxWidth: '460px', textAlign: 'center', padding: '30px' }}>
                        {recallActive && recallRound ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6e45e2', background: '#f3f0ff', padding: '4px 12px', borderRadius: '20px' }}>
                                        Round {RECALL_TOTAL_ROUNDS - recallRoundsLeft + 1}/{RECALL_TOTAL_ROUNDS}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1dd1a1' }}>
                                        <i className="fas fa-check-circle"></i> Score: {recallScore}
                                    </span>
                                </div>

                                <div style={{ fontSize: '3rem', marginBottom: '5px' }}>{recallRound.compound.icon}</div>
                                <h2 style={{ color: '#2d3436', marginBottom: '5px' }}>{recallRound.compound.name}</h2>
                                <p style={{ color: '#888', fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>{recallRound.compound.formula}</p>
                                <p style={{ color: '#555', marginBottom: '18px', fontSize: '0.95rem' }}>Which element was used to make this compound?</p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                    {recallRound.choices.map(sym => {
                                        const el = baseElements.find(e => e.sym === sym);
                                        const isThisCorrect = recallFeedback && sym === recallRound.correctSym;
                                        const isThisWrongPick = recallFeedback && recallFeedback.sym === sym && !recallFeedback.correct;
                                        return (
                                            <button
                                                key={sym}
                                                onClick={() => answerRecallRound(sym)}
                                                disabled={!!recallFeedback}
                                                style={{
                                                    padding: '14px 10px', borderRadius: '12px', border: '2px solid',
                                                    borderColor: isThisCorrect ? '#1dd1a1' : isThisWrongPick ? '#ff6b6b' : '#e1e1e1',
                                                    background: isThisCorrect ? '#e3fdf5' : isThisWrongPick ? '#fff0f0' : '#f8f9fa',
                                                    cursor: recallFeedback ? 'default' : 'pointer', transition: 'all 0.2s',
                                                    fontWeight: '700', fontSize: '1rem', color: '#2d3436'
                                                }}
                                            >
                                                {el?.sym} <span style={{ display: 'block', fontSize: '0.7rem', color: '#888', fontWeight: '500' }}>{el?.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {recallStreak >= 3 && !recallFeedback && (
                                    <p style={{ marginTop: '14px', color: '#f39c12', fontWeight: '700', fontSize: '0.85rem' }}>🔥 {recallStreak} in a row!</p>
                                )}
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧠</div>
                                <h2 style={{ color: '#2d3436', marginBottom: '8px' }}>Compound Recall</h2>
                                {recallGameFinished ? (
                                    <>
                                        <p style={{ color: '#666', marginBottom: '15px' }}>Great work! Here's how you did:</p>
                                        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#6e45e2', marginBottom: '5px' }}>{recallScore}/{RECALL_TOTAL_ROUNDS}</div>
                                        {isNewRecallBest && (
                                            <p style={{ color: '#f39c12', fontWeight: '700', marginBottom: '10px' }}><i className="fas fa-trophy"></i> New personal best!</p>
                                        )}
                                        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '20px' }}>Best score: {recallBestScore}/{RECALL_TOTAL_ROUNDS}</p>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            <button className="btn-secondary" onClick={closeRecallGame}>Close</button>
                                            <button className="btn-primary" onClick={startRecallGame}>Play Again</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p style={{ color: '#666', marginBottom: '20px' }}>You'll see a compound's name and formula — pick which element was used to make it. {RECALL_TOTAL_ROUNDS} rounds, test your memory!</p>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                            <button className="btn-secondary" onClick={closeRecallGame}>Cancel</button>
                                            <button className="btn-primary" onClick={startRecallGame}>Start Game</button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}