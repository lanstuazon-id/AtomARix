import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './TimeAttack.css';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const elements = [
    { sym: 'H', name: 'Hydrogen', n: 1 }, { sym: 'He', name: 'Helium', n: 2 }, { sym: 'Li', name: 'Lithium', n: 3 },
    { sym: 'Be', name: 'Beryllium', n: 4 }, { sym: 'B', name: 'Boron', n: 5 }, { sym: 'C', name: 'Carbon', n: 6 },
    { sym: 'N', name: 'Nitrogen', n: 7 }, { sym: 'O', name: 'Oxygen', n: 8 }, { sym: 'F', name: 'Fluorine', n: 9 },
    { sym: 'Ne', name: 'Neon', n: 10 }, { sym: 'Na', name: 'Sodium', n: 11 }, { sym: 'Mg', name: 'Magnesium', n: 12 },
    { sym: 'Al', name: 'Aluminium', n: 13 }, { sym: 'Si', name: 'Silicon', n: 14 }, { sym: 'P', name: 'Phosphorus', n: 15 },
    { sym: 'S', name: 'Sulfur', n: 16 }, { sym: 'Cl', name: 'Chlorine', n: 17 }, { sym: 'Ar', name: 'Argon', n: 18 },
    { sym: 'K', name: 'Potassium', n: 19 }, { sym: 'Ca', name: 'Calcium', n: 20 }, { sym: 'Fe', name: 'Iron', n: 26 },
    { sym: 'Cu', name: 'Copper', n: 29 }, { sym: 'Zn', name: 'Zinc', n: 30 }, { sym: 'Ag', name: 'Silver', n: 47 },
    { sym: 'Au', name: 'Gold', n: 79 }, { sym: 'Hg', name: 'Mercury', n: 80 }, { sym: 'Pb', name: 'Lead', n: 82 },
    { sym: 'U', name: 'Uranium', n: 92 }, { sym: 'Pt', name: 'Platinum', n: 78 }, { sym: 'Ni', name: 'Nickel', n: 28 }
];

export default function TimeAttack() {
    const navigate = useNavigate();
    const currentUser = sessionStorage.getItem('loggedInUser') || 'Scientist';
    const highScoreKey = `timeAttackBestCorrect_${currentUser}`;
    const srsKey = `timeAttackSRS_${currentUser}`;

    // Game State
    const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'end'
    const [timeLeft, setTimeLeft] = useState(60);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [wrongAnswers, setWrongAnswers] = useState(0);
    
    // Question State
    const [currentElement, setCurrentElement] = useState(null);
    const [question, setQuestion] = useState({ text: '', subject: '', correct: '' });
    const [options, setOptions] = useState([]);
    const [answeredState, setAnsweredState] = useState({ selected: null, isAnswering: false });
    
    // Tracking State
    const [elementsToReview, setElementsToReview] = useState(new Set());
    const [elementWeights, setElementWeights] = useState({});

    // Load weights on mount
    useEffect(() => {
        const savedWeights = JSON.parse(localStorage.getItem(srsKey)) || {};
        const initWeights = { ...savedWeights };
        elements.forEach(el => {
            if (initWeights[el.sym] === undefined) initWeights[el.sym] = 10;
        });
        setElementWeights(initWeights);
    }, [srsKey]);

    // Sync high score from cloud in real-time
    useEffect(() => {
        const userRef = doc(db, "users", currentUser);
        const unsubscribe = onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists() && userSnap.data().timeAttackBestCorrect !== undefined) {
                const cloudScore = userSnap.data().timeAttackBestCorrect;
                const localScore = parseInt(localStorage.getItem(highScoreKey) || '0', 10);
                if (cloudScore > localScore) {
                    localStorage.setItem(highScoreKey, cloudScore.toString());
                }
            }
        }, (e) => console.error("Error syncing time attack score:", e));
        return () => unsubscribe();
    }, [currentUser, highScoreKey]);

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

    const getNextElementBySRS = (weights) => {
        let totalWeight = elements.reduce((sum, el) => sum + weights[el.sym], 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < elements.length; i++) {
            random -= weights[elements[i].sym];
            if (random <= 0) return elements[i];
        }
        return elements[0];
    };

    const generateQuestion = (weights) => {
        const el = getNextElementBySRS(weights);
        setCurrentElement(el);
        
        const qTypes = [
            { text: "What is the symbol for", subject: el.name, correct: el.sym, field: 'sym' },
            { text: "Which element has the symbol", subject: el.sym, correct: el.name, field: 'name' },
            { text: "What is the atomic number of", subject: el.name, correct: el.n.toString(), field: 'n' },
            { text: "Which element has atomic number", subject: el.n.toString(), correct: el.name, field: 'name' }
        ];
        
        const qType = qTypes[Math.floor(Math.random() * qTypes.length)];
        setQuestion(qType);

        let newOptions = [qType.correct];
        while (newOptions.length < 4) {
            let rVal = elements[Math.floor(Math.random() * elements.length)][qType.field].toString();
            if (!newOptions.includes(rVal)) newOptions.push(rVal);
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
        setGameState('playing');
        generateQuestion(elementWeights);
    };

    const checkAnswer = (selectedAns) => {
        if (answeredState.isAnswering) return;
        setAnsweredState({ selected: selectedAns, isAnswering: true });
        
        const newWeights = { ...elementWeights };
        let isCorrect = selectedAns === question.correct;

        if (isCorrect) {
            setCorrectAnswers(prev => prev + 1);
            newWeights[currentElement.sym] = Math.max(1, newWeights[currentElement.sym] - 3);
        } else {
            setWrongAnswers(prev => prev + 1);
            newWeights[currentElement.sym] += 10;
            setElementsToReview(prev => new Set(prev).add(currentElement.sym));
        }
        
        setElementWeights(newWeights);
        localStorage.setItem(srsKey, JSON.stringify(newWeights));

        setTimeout(() => {
            if (gameState === 'playing') {
                generateQuestion(newWeights);
                setAnsweredState({ selected: null, isAnswering: false });
            }
        }, 800);
    };

    const endGame = () => {
        setGameState('end');
        const existingHighScore = parseInt(localStorage.getItem(highScoreKey) || '0');
        if (correctAnswers > existingHighScore) {
            localStorage.setItem(highScoreKey, correctAnswers);
            setDoc(doc(db, "users", currentUser), { timeAttackBestCorrect: correctAnswers }, { merge: true }).catch(e => console.error(e));
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
        <div style={{ position: 'relative' }}>
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
                    <li onClick={() => navigate('/laboratory')}><i className="fas fa-flask"></i> <span>Laboratory</span></li>
                    <li onClick={() => navigate('/matchinggame')}><i className="fas fa-puzzle-piece"></i> <span>Matching Game</span></li>
                    <li className="active"><i className="fas fa-stopwatch"></i> <span>Time Attack</span></li>
                    <li onClick={() => navigate('/achievements')}><i className="fas fa-trophy"></i> <span>Achievements</span></li>
                </ul>
                <div style={{ width: '130px' }}></div>
            </nav>

            <main className="timeattack-container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="hero-banner timeattack-banner">
                    <div className="hero-text">
                        <h1>Time Attack ⏱️</h1>
                        <p>Answer as many chemistry questions as you can in 60 seconds!</p>
                    </div>
                    <div className="hero-icon"><i className="fas fa-bolt"></i></div>
                </div>

                <div className="game-header">
                    <div className="stats" style={{ width: '120px' }}>
                        <i className="fas fa-clock"></i> <span>{timeLeft}s</span>
                    </div>
                    <div className="stats-container" style={{ justifyContent: 'center', flex: 1 }}>
                        <div className="stats" style={{ color: '#1dd1a1' }}><i className="fas fa-check-circle"></i> Correct: <span>{correctAnswers}</span></div>
                        <div className="stats" style={{ color: '#ff6b6b' }}><i className="fas fa-times-circle"></i> Wrong: <span>{wrongAnswers}</span></div>
                    </div>
                    <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end' }}>
                        {gameState !== 'start' && (
                            <button className="btn-restart" onClick={startGame}><i className="fas fa-redo"></i> Restart</button>
                        )}
                    </div>
                </div>

                <div className="game-area">
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
                                <h2>{question.subject}</h2>
                            </div>
                            <div className="options-grid">
                                {options.map(opt => {
                                    let btnClass = "option-btn";
                                    if (answeredState.isAnswering) {
                                        if (opt === question.correct) btnClass += " correct";
                                        else if (opt === answeredState.selected) btnClass += " wrong";
                                    }
                                    return <button key={opt} disabled={answeredState.isAnswering} className={btnClass} onClick={() => checkAnswer(opt)}>{opt}</button>;
                                })}
                            </div>
                        </div>
                    )}

                    {gameState === 'end' && (
                        <div className="start-screen">
                            <h2 style={{ color: '#2d3436' }}>Time's Up! ⏰</h2>
                            {elementsToReview.size > 0 && (
                                <div style={{ marginTop: '10px', width: '100%', maxWidth: '500px', background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                                    <h3 style={{ color: '#2d3436', fontSize: '1rem', marginBottom: '10px', textTransform: 'uppercase' }}><i className="fas fa-book-open"></i> Elements to Review</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                        {Array.from(elementsToReview).map(sym => <span key={sym} style={{ background: '#fff0f0', border: '1px solid #ffb8b8', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', color: '#e74c3c', fontSize: '0.9rem' }}>{elements.find(e => e.sym === sym)?.name} ({sym})</span>)}
                                    </div>
                                </div>
                            )}
                            <button className="btn-start" style={{ marginTop: '20px' }} onClick={startGame}>Play Again</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}