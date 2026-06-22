import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './TimeAttack.css';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const elements = [
    { sym: 'H', name: 'Hydrogen', n: 1, cat: 'nonmetal', fact: 'The most abundant element in the universe' },
    { sym: 'He', name: 'Helium', n: 2, cat: 'noble-gas', fact: 'Inhaling it makes your voice high-pitched' },
    { sym: 'Li', name: 'Lithium', n: 3, cat: 'alkali-metal', fact: 'The lightest metal, used in phone batteries' },
    { sym: 'Be', name: 'Beryllium', n: 4, cat: 'alkaline-earth', fact: 'Used in aerospace and high-tech equipment' },
    { sym: 'B', name: 'Boron', n: 5, cat: 'metalloid', fact: 'Used in heat-resistant glass like Pyrex' },
    { sym: 'C', name: 'Carbon', n: 6, cat: 'nonmetal', fact: 'The basic building block for all life on Earth' },
    { sym: 'N', name: 'Nitrogen', n: 7, cat: 'nonmetal', fact: 'Makes up about 78% of the air we breathe' },
    { sym: 'O', name: 'Oxygen', n: 8, cat: 'nonmetal', fact: 'The gas essential for humans to breathe' },
    { sym: 'F', name: 'Fluorine', n: 9, cat: 'nonmetal', fact: 'The most reactive element, found in toothpaste' },
    { sym: 'Ne', name: 'Neon', n: 10, cat: 'noble-gas', fact: 'Glows reddish-orange in bright advertising signs' },
    { sym: 'Na', name: 'Sodium', n: 11, cat: 'alkali-metal', fact: 'A soft metal that explodes when it touches water' },
    { sym: 'Mg', name: 'Magnesium', n: 12, cat: 'alkaline-earth', fact: 'Burns with a blindingly bright white light' },
    { sym: 'Al', name: 'Aluminium', n: 13, cat: 'post-transition', fact: 'Lightweight metal used in soda cans and foil' },
    { sym: 'Si', name: 'Silicon', n: 14, cat: 'metalloid', fact: 'The main ingredient in computer chips and sand' },
    { sym: 'P', name: 'Phosphorus', n: 15, cat: 'nonmetal', fact: 'Used in match heads and fertilizers' },
    { sym: 'S', name: 'Sulfur', n: 16, cat: 'nonmetal', fact: 'A yellow element that smells like rotten eggs' },
    { sym: 'Cl', name: 'Chlorine', n: 17, cat: 'nonmetal', fact: 'Used to keep swimming pools clean' },
    { sym: 'Ar', name: 'Argon', n: 18, cat: 'noble-gas', fact: 'An inert gas used inside incandescent light bulbs' },
    { sym: 'K', name: 'Potassium', n: 19, cat: 'alkali-metal', fact: 'Vital nutrient found in bananas' },
    { sym: 'Ca', name: 'Calcium', n: 20, cat: 'alkaline-earth', fact: 'Essential for strong bones and teeth' },
    { sym: 'Fe', name: 'Iron', n: 26, cat: 'transition-metal', fact: 'Main ingredient in steel and found in blood' },
    { sym: 'Cu', name: 'Copper', n: 29, cat: 'transition-metal', fact: 'Red metal used in electrical wiring' },
    { sym: 'Zn', name: 'Zinc', n: 30, cat: 'transition-metal', fact: 'Used to galvanize steel to prevent rust' },
    { sym: 'Ag', name: 'Silver', n: 47, cat: 'transition-metal', fact: 'The best conductor of electricity' },
    { sym: 'Au', name: 'Gold', n: 79, cat: 'transition-metal', fact: 'The most malleable metal, valued for jewelry' },
    { sym: 'Hg', name: 'Mercury', n: 80, cat: 'transition-metal', fact: 'A liquid metal used in old thermometers' },
    { sym: 'Pb', name: 'Lead', n: 82, cat: 'post-transition', fact: 'Dense metal effective at blocking radiation' },
    { sym: 'U', name: 'Uranium', n: 92, cat: 'actinide', fact: 'Fuel used in nuclear power plants' },
    { sym: 'Pt', name: 'Platinum', n: 78, cat: 'transition-metal', fact: 'Rare metal used in catalytic converters' },
    { sym: 'Ni', name: 'Nickel', n: 28, cat: 'transition-metal', fact: 'Commonly used in stainless steel and coins' }
];

export default function TimeAttack() {
    const navigate = useNavigate();
    const currentUser = sessionStorage.getItem('loggedInUser') || 'Scientist';
    const containerRef = useRef(null);
    const highScoreKey = `timeAttackBestCorrect_${currentUser}`;
    const srsKey = `timeAttackSRS_${currentUser}`;

    // Game State
    const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'end'
    const [timeLeft, setTimeLeft] = useState(60);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [wrongAnswers, setWrongAnswers] = useState(0);
    const [isNewHighScore, setIsNewHighScore] = useState(false);
    
    // Question State
    const [currentElement, setCurrentElement] = useState(null);
    const [question, setQuestion] = useState({ text: '', subject: '', correct: '' });
    const [options, setOptions] = useState([]);
    const [lastElementSym, setLastElementSym] = useState('');
    const [answeredState, setAnsweredState] = useState({ selected: null, isAnswering: false });
    
    // Tracking State
    const [elementsToReview, setElementsToReview] = useState(new Set());
    const [srsData, setSrsData] = useState({});

    const createDefaultSrsCard = () => ({
        interval: 0,
        easeFactor: 2.5,
        dueDate: Date.now(),
        repetitions: 0
    });

    // Load SRS data on mount
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem(srsKey)) || {};
        const initData = { ...saved };
        elements.forEach(el => {
            if (!initData[el.sym]) initData[el.sym] = createDefaultSrsCard();
        });
        setSrsData(initData);
    }, [srsKey]);

    // Handle Scroll Locking and Fullscreen cleanup
    useEffect(() => {
        if (gameState === 'playing') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [gameState]);

    // Sync high score and SRS progress from cloud in real-time
    useEffect(() => {
        const userRef = doc(db, "users", currentUser);
        const unsubscribe = onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists()) {
                const data = userSnap.data();
                
                // Sync High Score
                if (data.timeAttackBestCorrect !== undefined) {
                    const cloudScore = data.timeAttackBestCorrect;
                    const localScore = parseInt(localStorage.getItem(highScoreKey) || '0', 10);
                    if (cloudScore > localScore) {
                        localStorage.setItem(highScoreKey, cloudScore.toString());
                    }
                }

                // Sync SRS Data
                if (data.timeAttackSRS) {
                    localStorage.setItem(srsKey, JSON.stringify(data.timeAttackSRS));
                    setSrsData(data.timeAttackSRS);
                }
            }
        }, (e) => console.error("Error syncing time attack data:", e));
        return () => unsubscribe();
    }, [currentUser, highScoreKey, srsKey]);

    // Timer Logic
    useEffect(() => {
        let timer;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && gameState === 'playing') {
            endGame();
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    // Selects the next element using SRS principles: most "overdue" elements
    // (where now - dueDate is largest) are prioritized, since they're the ones
    // most at risk of being forgotten. Elements not yet due are still eligible
    // (so the question pool doesn't go stale), but are picked with lower priority.
    const getNextElementBySRS = (data) => {
        const now = Date.now();

        // overdueAmount: how many ms past its due date this element is.
        // Elements not yet due get a small positive floor instead of a negative
        // number, so they can still occasionally appear as filler.
        const weighted = elements.map(el => {
            const card = data[el.sym] || createDefaultSrsCard();
            const overdueMs = now - card.dueDate;
            const priority = overdueMs > 0 ? overdueMs : 1000; // 1s floor for not-yet-due items
            return { el, priority };
        });

        const totalPriority = weighted.reduce((sum, w) => sum + w.priority, 0);
        let random = Math.random() * totalPriority;
        for (let i = 0; i < weighted.length; i++) {
            random -= weighted[i].priority;
            if (random <= 0) return weighted[i].el;
        }
        return weighted[0].el;
    };

    const generateQuestion = (data) => {
        let el = getNextElementBySRS(data);
        
        // Avoid immediate repetition of the same element
        if (el.sym === lastElementSym && elements.length > 1) {
            el = getNextElementBySRS(data);
        }
        setCurrentElement(el);
        setLastElementSym(el.sym);
        
        const qTypes = [
            { text: "What is the symbol for", subject: el.name, correct: el.sym, field: 'sym' },
            { text: "Which element has the symbol", subject: el.sym, correct: el.name, field: 'name' },
            { text: "What is the atomic number of", subject: el.name, correct: el.n.toString(), field: 'n' },
            { text: "Which element has atomic number", subject: el.n.toString(), correct: el.name, field: 'name' },
            { text: "Identify the element described:", subject: el.fact, correct: el.name, field: 'name' },
            { text: "Identify the category of this element:", subject: el.name, correct: el.cat.replace('-', ' '), field: 'cat' }
        ];
        
        const qType = qTypes[Math.floor(Math.random() * qTypes.length)];
        setQuestion(qType);

        let newOptions = [{ value: qType.correct, name: el.name }];
        while (newOptions.length < 4) {
            const randomEl = elements[Math.floor(Math.random() * elements.length)];
            let rVal = randomEl[qType.field].toString();
            if (qType.field === 'cat') rVal = rVal.replace('-', ' ');
            
            if (!newOptions.find(o => o.value === rVal)) {
                newOptions.push({ value: rVal, name: randomEl.name });
            }
        }

        // Shuffle options
        for (let i = newOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
        }
        setOptions(newOptions);
    };

    const startGame = () => {
        setCorrectAnswers(0);
        setWrongAnswers(0);
        setElementsToReview(new Set());
        setTimeLeft(60);
        setIsNewHighScore(false);
        setGameState('playing');
        generateQuestion(srsData);

        // Attempt to go Fullscreen for focus
        if (containerRef.current?.requestFullscreen) {
            containerRef.current.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        }
    };

    // Updates a single element's SRS card using SM-2-style rules, adapted to
    // minutes instead of days so progress is visible within one game session.
    const updateSrsCard = (card, isCorrect) => {
        let { interval, easeFactor, repetitions } = card;

        if (isCorrect) {
            repetitions += 1;
            // Graduating intervals: first correct answer -> short recheck,
            // second -> longer, subsequent -> interval grows by easeFactor.
            if (repetitions === 1) {
                interval = 10; // 10 minutes
            } else if (repetitions === 2) {
                interval = 30; // 30 minutes
            } else {
                interval = Math.round(interval * easeFactor);
            }
            // Ease factor nudges up slightly on success (SM-2 convention), capped at 3.0
            easeFactor = Math.min(3.0, easeFactor + 0.1);
        } else {
            // Wrong answer: reset progress and bring the element back soon
            repetitions = 0;
            interval = 2; // back in 2 minutes
            // Ease factor drops on failure, floored at 1.3 (standard SM-2 minimum)
            easeFactor = Math.max(1.3, easeFactor - 0.2);
            setElementsToReview(prev => new Set(prev).add(currentElement.sym));
        }

        return {
            interval,
            easeFactor,
            repetitions,
            dueDate: Date.now() + interval * 60 * 1000
        };
    };

    const checkAnswer = (selectedAns) => {
        if (answeredState.isAnswering) return;
        setAnsweredState({ selected: selectedAns, isAnswering: true });
        
        const newSrsData = { ...srsData };
        let isCorrect = selectedAns === question.correct;

        if (isCorrect) {
            setCorrectAnswers(prev => prev + 1);
        } else {
            setWrongAnswers(prev => prev + 1);
        }

        const currentCard = newSrsData[currentElement.sym] || createDefaultSrsCard();
        newSrsData[currentElement.sym] = updateSrsCard(currentCard, isCorrect);
        
        setSrsData(newSrsData);
        localStorage.setItem(srsKey, JSON.stringify(newSrsData));

        setTimeout(() => {
            if (gameState === 'playing') {
                generateQuestion(newSrsData);
                setAnsweredState({ selected: null, isAnswering: false });
            }
        }, 800);
    };

    const endGame = () => {
        setGameState('end');
        const existingHighScore = parseInt(localStorage.getItem(highScoreKey) || '0');
        
        const updateData = {
            timeAttackSRS: srsData
        };

        if (correctAnswers > existingHighScore) {
            localStorage.setItem(highScoreKey, correctAnswers);
            updateData.timeAttackBestCorrect = correctAnswers;
            setIsNewHighScore(true);
        }

        setDoc(doc(db, "users", currentUser), updateData, { merge: true }).catch(e => console.error(e));
        
        // Exit Fullscreen on game end
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(e => console.warn(e));
        }
    };

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
        <div ref={containerRef} style={{ position: 'relative', background: '#f8faff', minHeight: '100vh' }}>
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
                    
                    /* Fix sticky outline/highlight on mobile touch */
                    .option-btn {
                        outline: none !important;
                        -webkit-tap-highlight-color: transparent !important;
                    }
                    .option-btn:focus { outline: none !important; }
                `}
            </style>
            {gameState !== 'playing' && (
                <nav className="navbar">
                    <div className="nav-brand" style={{ width: '130px' }}><i className="fas fa-atom"></i> <span>AtomARix</span></div>
                    <ul className="nav-links">
                        <li onClick={() => navigate('/home')}><i className="fas fa-home"></i> <span>Home</span></li>
                        <li onClick={() => navigate('/periodic-table')}><i className="fas fa-th"></i> <span>Periodic Table</span></li>
                        <li onClick={() => navigate('/laboratory')}><i className="fas fa-flask"></i> <span>Laboratory</span></li>
                        <li onClick={() => navigate('/matchinggame')}><i className="fas fa-puzzle-piece"></i> <span>Matching Game</span></li>
                        <li className="active"><i className="fas fa-stopwatch"></i> <span>Time Attack</span></li>
                        <li onClick={() => navigate('/achievements')}><i className="fas fa-trophy"></i> <span>Achievements</span></li>
                    </ul>
                    <div style={{ width: '130px' }}></div>
                </nav>
            )}

            <main className="timeattack-container" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: gameState === 'playing' ? '100vh' : 'auto' }}>
                {gameState !== 'playing' && (
                    <div className="hero-banner timeattack-banner">
                        <div className="hero-text">
                            <h1>Time Attack ⏱️</h1>
                            <p>Answer as many chemistry questions as you can in 60 seconds!</p>
                        </div>
                        <div className="hero-icon"><i className="fas fa-bolt"></i></div>
                    </div>
                )}

                {gameState !== 'end' && (
                    <div className="game-header">
                        <div className="stats" style={{ width: '120px' }}>
                            <i className="fas fa-clock"></i> <span>{timeLeft}s</span>
                        </div>
                        <div className="stats-container" style={{ justifyContent: 'center', flex: 1 }}>
                            <div className="stats" style={{ color: '#1dd1a1' }}><i className="fas fa-check-circle"></i> Correct: <span>{correctAnswers}</span></div>
                            <div className="stats" style={{ color: '#ff6b6b' }}><i className="fas fa-times-circle"></i> Wrong: <span>{wrongAnswers}</span></div>
                        </div>
                        <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end' }}>
                            {gameState === 'playing' && (
                                <button className="btn-restart" onClick={startGame}><i className="fas fa-redo"></i> Restart</button>
                            )}
                        </div>
                    </div>
                )}

                <div className="game-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                    {gameState === 'start' && (
                        <div className="start-screen">
                            <h2 style={{ color: '#2d3436' }}>Ready for the challenge?</h2>
                            <p style={{ color: '#666', marginBottom: '10px' }}>Test your chemistry knowledge under pressure!</p>
                            <button className="btn-start" onClick={startGame}>Start Game</button>
                        </div>
                    )}

                    {gameState === 'playing' && (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="question-box">
                                <p>{question.text}</p>
                                {currentElement && (question.text.includes('atomic number') || (question.field !== 'name' && isNaN(question.subject))) && (
                                    <div className="question-image-container" style={{ width: '140px', height: '140px', margin: '0 auto 15px', borderRadius: '15px', overflow: 'hidden', border: '4px solid #f0f2f5', background: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                        <img 
                                            src={`/assets/elements/${currentElement.name.toLowerCase()}.jpg`} 
                                            alt={currentElement.name} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => e.target.parentElement.style.display = 'none'}
                                        />
                                    </div>
                                )}
                                <h2 style={{ fontSize: question.subject.length > 20 ? '1.8rem' : '3.5rem', lineHeight: '1.2' }}>{question.subject}</h2>
                            </div>
                            <div className="options-grid">
                                {options.map(opt => {
                                    let btnClass = "option-btn";
                                    if (answeredState.isAnswering) {
                                        if (opt.value === question.correct) btnClass += " correct";
                                        else if (opt.value === answeredState.selected) btnClass += " wrong";
                                    }
                                    return (
                                        <button 
                                            key={opt.value} 
                                            disabled={answeredState.isAnswering} 
                                            className={btnClass} 
                                            onClick={() => checkAnswer(opt.value)}
                                        >
                                            {opt.value}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {gameState === 'end' && (() => {
                        const totalAnswered = correctAnswers + wrongAnswers;
                        const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
                        return (
                        <div className="start-screen">
                            <h2 style={{ color: '#2d3436' }}>Time's Up! ⏰</h2>

                            {isNewHighScore && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', color: 'white', padding: '12px 22px', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 6px 15px rgba(253, 160, 133, 0.4)', marginTop: '5px' }}>
                                    <i className="fas fa-trophy" style={{ fontSize: '1.3rem' }}></i> New High Score!
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '500px', marginTop: '15px' }}>
                                <div style={{ flex: '1 1 100px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '16px', padding: '15px 10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1dd1a1' }}>{correctAnswers}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Correct</div>
                                </div>
                                <div style={{ flex: '1 1 100px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '16px', padding: '15px 10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ff6b6b' }}>{wrongAnswers}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Wrong</div>
                                </div>
                                <div style={{ flex: '1 1 100px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '16px', padding: '15px 10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#6e45e2' }}>{accuracy}%</div>
                                    <div style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</div>
                                </div>
                            </div>

                            {elementsToReview.size > 0 && (
                                <div style={{ marginTop: '20px', width: '100%', maxWidth: '500px', background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                                    <h3 style={{ color: '#2d3436', fontSize: '1rem', marginBottom: '10px', textTransform: 'uppercase' }}><i className="fas fa-book-open"></i> Elements to Review</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                        {Array.from(elementsToReview).map(sym => <span key={sym} style={{ background: '#fff0f0', border: '1px solid #ffb8b8', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', color: '#e74c3c', fontSize: '0.9rem' }}>{elements.find(e => e.sym === sym)?.name} ({sym})</span>)}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px', width: '100%' }}>
                                <button className="btn-start" onClick={startGame}>Play Again</button>
                                {elementsToReview.size > 0 && (
                                    <button className="btn-start" style={{ background: '#6e45e2' }} onClick={() => navigate('/periodic-table', { state: { highlightElements: Array.from(elementsToReview) } })}>Review Elements</button>
                                )}
                            </div>
                        </div>
                        );
                    })()}
                </div>
            </main>
        </div>
    );
}