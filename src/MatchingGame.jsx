import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './MatchingGame.css';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const categoryData = {
    common: [
        { id: 'H', sym: 'H', name: 'Hydrogen' }, { id: 'O', sym: 'O', name: 'Oxygen' },
        { id: 'Na', sym: 'Na', name: 'Sodium' }, { id: 'Cl', sym: 'Cl', name: 'Chlorine' },
        { id: 'Fe', sym: 'Fe', name: 'Iron' }, { id: 'Au', sym: 'Au', name: 'Gold' },
        { id: 'C', sym: 'C', name: 'Carbon' }, { id: 'Ag', sym: 'Ag', name: 'Silver' }
    ],
    metals: [
        { id: 'Cu', sym: 'Cu', name: 'Copper' }, { id: 'Zn', sym: 'Zn', name: 'Zinc' },
        { id: 'Pt', sym: 'Pt', name: 'Platinum' }, { id: 'Hg', sym: 'Hg', name: 'Mercury' },
        { id: 'Pb', sym: 'Pb', name: 'Lead' }, { id: 'Al', sym: 'Al', name: 'Aluminium' },
        { id: 'Ti', sym: 'Ti', name: 'Titanium' }, { id: 'Co', sym: 'Co', name: 'Cobalt' }
    ],
    nonmetals: [
        { id: 'He', sym: 'He', name: 'Helium' }, { id: 'Ne', sym: 'Ne', name: 'Neon' },
        { id: 'Ar', sym: 'Ar', name: 'Argon' }, { id: 'F', sym: 'F', name: 'Fluorine' },
        { id: 'S', sym: 'S', name: 'Sulfur' }, { id: 'P', sym: 'P', name: 'Phosphorus' },
        { id: 'N', sym: 'N', name: 'Nitrogen' }, { id: 'I', sym: 'I', name: 'Iodine' }
    ]
};

export default function MatchingGame() {
    const navigate = useNavigate();
    const currentUser = sessionStorage.getItem('loggedInUser') || 'Scientist';
    const instructionsKey = `matchingGameInstructionsSeen_${currentUser}`;
    const bestScoreKey = `matchingGameBestScore_${currentUser}`;

    // Audio refs (using public folder paths)
    const sndFlip = useRef(new Audio('/assets/audio/drop.mp3'));
    const sndSuccess = useRef(new Audio('/assets/audio/success.mp3'));
    const sndError = useRef(new Audio('/assets/audio/error.mp3'));

    // Modals
    const [showInstructions, setShowInstructions] = useState(!localStorage.getItem(instructionsKey));
    const [showGameOver, setShowGameOver] = useState(false);

    // Game State
    const [gameState, setGameState] = useState('start'); // 'start', 'playing'
    const [currentCategory, setCurrentCategory] = useState([]);
    const [cards, setCards] = useState([]);
    
    // Interaction State
    const [flippedIndices, setFlippedIndices] = useState([]);
    const [matchedIds, setMatchedIds] = useState([]);
    
    // Stats State
    const [moves, setMoves] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [finalStars, setFinalStars] = useState(0);

    // Timer Logic
    useEffect(() => {
        let interval;
        if (gameState === 'playing') {
            interval = setInterval(() => {
                setTimeElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState]);

    // Sync high score from cloud in real-time
    useEffect(() => {
        const userRef = doc(db, "users", currentUser);
        const unsubscribe = onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists()) {
                const score = userSnap.data().matchingGameBestScore;
                if (score !== undefined && score > 0) {
                    let localScore = parseInt(localStorage.getItem(bestScoreKey), 10);
                    if (isNaN(localScore) || localScore <= 0) localScore = 999;
                    if (score < localScore) {
                        localStorage.setItem(bestScoreKey, score.toString());
                    }
                }
            }
        }, (e) => console.error("Error syncing matching game score:", e));
        return () => unsubscribe();
    }, [currentUser, bestScoreKey]);

    const closeInstructions = () => {
        localStorage.setItem(instructionsKey, 'true');
        setShowInstructions(false);
    };

    const startGame = (categoryName) => {
        const category = categoryData[categoryName];
        setCurrentCategory(category);
        initGame(category);
    };

    const initGame = (category = currentCategory) => {
        setFlippedIndices([]);
        setMatchedIds([]);
        setMoves(0);
        setTimeElapsed(0);
        setShowGameOver(false);
        
        // Create pairs
        let newCards = [];
        category.forEach(el => {
            newCards.push({ uniqueId: `${el.id}-sym`, id: el.id, display: el.sym, type: 'sym' });
            newCards.push({ uniqueId: `${el.id}-name`, id: el.id, display: el.name, type: 'name' });
        });

        // Fisher-Yates Shuffle
        for (let i = newCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
        }

        setCards(newCards);
        setGameState('playing');
    };

    const handleCardClick = (index) => {
        // Prevent clicking if 2 cards are already flipping, or if it's already matched/flipped
        if (flippedIndices.length === 2) return;
        if (flippedIndices.includes(index)) return;
        if (matchedIds.includes(cards[index].id)) return;

        // Play flip sound
        sndFlip.current.currentTime = 0;
        sndFlip.current.play().catch(e => console.warn(e));

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setMoves(m => m + 1);
            const card1 = cards[newFlipped[0]];
            const card2 = cards[newFlipped[1]];

            if (card1.id === card2.id) {
                // Match!
                sndSuccess.current.currentTime = 0;
                sndSuccess.current.play().catch(e => console.warn(e));
                
                const newMatchedIds = [...matchedIds, card1.id];
                setMatchedIds(newMatchedIds);
                setFlippedIndices([]);
                
                // Check Win
                if (newMatchedIds.length === currentCategory.length) {
                    handleWin(moves + 1, timeElapsed);
                }
            } else {
                // No match, unflip after delay
                sndError.current.currentTime = 0;
                sndError.current.play().catch(e => console.warn(e));
                setTimeout(() => {
                    setFlippedIndices([]);
                }, 600); // 600ms delay to see the card before it turns back
            }
        }
    };

    const handleWin = (finalMoves, finalTime) => {
        setGameState('end'); // stops timer
        
        // Save high score
        let existingBestScore = parseInt(localStorage.getItem(bestScoreKey), 10);
        if (isNaN(existingBestScore) || existingBestScore <= 0) {
            existingBestScore = 999;
        }

        if (finalMoves < existingBestScore) {
            localStorage.setItem(bestScoreKey, finalMoves);
            setDoc(doc(db, "users", currentUser), { matchingGameBestScore: finalMoves }, { merge: true }).catch(e => console.error(e));
        }

        // Calculate Stars
        let starsEarned = 3;
        if (finalMoves > 24 || finalTime > 90) starsEarned = 1;
        else if (finalMoves > 16 || finalTime > 45) starsEarned = 2;
        
        setFinalStars(starsEarned);
        setTimeout(() => setShowGameOver(true), 500);
    };

    const formatTime = (seconds) => {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div>
            <nav className="navbar">
                <div className="nav-brand" style={{ width: '130px' }}><i className="fas fa-atom"></i> <span>AtomARix</span></div>
                <ul className="nav-links">
                    <li onClick={() => navigate('/home')}><i className="fas fa-home"></i> <span>Home</span></li>
                    <li onClick={() => navigate('/periodic-table')}><i className="fas fa-th"></i> <span>Periodic Table</span></li>
                    <li onClick={() => navigate('/laboratory')}><i className="fas fa-flask"></i> <span>Laboratory</span></li>
                    <li className="active"><i className="fas fa-puzzle-piece"></i> <span>Matching Game</span></li>
                    <li onClick={() => navigate('/timeattack')}><i className="fas fa-stopwatch"></i> <span>Time Attack</span></li>
                    <li onClick={() => navigate('/achievements')}><i className="fas fa-trophy"></i> <span>Achievements</span></li>
                </ul>
                <div style={{ width: '130px' }}></div>
            </nav>

            <main className="matching-container">
                <div className="hero-banner matching-banner">
                    <div className="hero-text">
                        <h1>Memory Match 🧩</h1>
                        <p>Match the element symbol to its correct name in the fewest moves!</p>
                    </div>
                    <div className="hero-icon"><i className="fas fa-brain"></i></div>
                </div>

                {gameState === 'start' ? (
                    <div className="start-screen" style={{ background: 'white', padding: '40px', borderRadius: '20px', border: '1px solid #f0f0f0', textAlign: 'center', minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <h2 style={{ color: '#2d3436', fontSize: '2rem' }}>Select a Category</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>Choose a set of elements to match.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', width: '100%', maxWidth: '800px' }}>
                            <button className="btn-category" onClick={() => startGame('common')} style={{ background: 'white', border: '2px solid #e1e1e1', padding: '20px', borderRadius: '16px', fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3436', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <i className="fas fa-globe" style={{ fontSize: '2.5rem', color: '#6e45e2' }}></i> Common Elements <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 'normal' }}>H, O, C, Na...</span>
                            </button>
                            <button className="btn-category" onClick={() => startGame('metals')} style={{ background: 'white', border: '2px solid #e1e1e1', padding: '20px', borderRadius: '16px', fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3436', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <i className="fas fa-coins" style={{ fontSize: '2.5rem', color: '#6e45e2' }}></i> Metals <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 'normal' }}>Au, Ag, Cu, Zn...</span>
                            </button>
                            <button className="btn-category" onClick={() => startGame('nonmetals')} style={{ background: 'white', border: '2px solid #e1e1e1', padding: '20px', borderRadius: '16px', fontSize: '1.2rem', fontWeight: 'bold', color: '#2d3436', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <i className="fas fa-wind" style={{ fontSize: '2.5rem', color: '#6e45e2' }}></i> Nonmetals <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 'normal' }}>He, Ne, F, S...</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div id="gameBoard">
                        <div className="game-header">
                            <div className="stats-container">
                                <div className="stats">Moves: <span>{moves}</span></div>
                                <div className="stats">Time: <span>{formatTime(timeElapsed)}</span></div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-restart" style={{ borderColor: '#ccc', color: '#666' }} onClick={() => setGameState('start')}><i className="fas fa-list"></i> Categories</button>
                                <button className="btn-restart" onClick={() => initGame()}><i className="fas fa-redo"></i> Restart</button>
                            </div>
                        </div>
                        <div className="game-grid">
                            {cards.map((card, index) => {
                                const isFlipped = flippedIndices.includes(index);
                                const isMatched = matchedIds.includes(card.id);
                                return (
                                    <div key={card.uniqueId} className={`card ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched' : ''}`} onClick={() => handleCardClick(index)}>
                                        <div className="card-inner">
                                            <div className="card-front"><i className="fas fa-atom"></i></div>
                                            <div className="card-back">{card.display}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Instructions Modal */}
            {showInstructions && (
                <div className="modal-container show">
                    <div className="modal-content" style={{ maxWidth: '500px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', color: '#6e45e2', marginBottom: '15px' }}><i className="fas fa-gamepad"></i></div>
                        <h2 style={{ marginBottom: '15px', color: '#2d3436' }}>How to Play</h2>
                        <div style={{ background: '#f8f9fa', border: '1px solid #eee', borderRadius: '12px', padding: '15px', marginBottom: '20px', textAlign: 'left', color: '#555', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            <p><i className="fas fa-check-circle" style={{ color: '#1dd1a1', marginRight: '5px' }}></i> <strong>Match:</strong> Pair the Element Symbol with its correct Name.</p>
                            <p><i className="fas fa-check-circle" style={{ color: '#1dd1a1', marginRight: '5px' }}></i> <strong>Score:</strong> Complete it in the fewest moves and fastest time for 3 stars!</p>
                        </div>
                        <button className="btn-confirm" onClick={closeInstructions} style={{ width: '100%', fontSize: '1.1rem', padding: '15px' }}>Got it!</button>
                    </div>
                </div>
            )}

            {/* Game Over Modal */}
            {showGameOver && (
                <div className="modal-container show">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <div style={{ fontSize: '4rem', color: '#f1c40f', marginBottom: '10px' }}><i className="fas fa-trophy"></i></div>
                        <h2 style={{ color: '#2d3436', marginBottom: '5px' }}>Congratulations! 🎉</h2>
                        <p style={{ color: '#666', marginBottom: '20px' }}>You matched all the elements!</p>
                        
                        <div style={{ background: '#f8f9fa', border: '1px solid #eee', borderRadius: '12px', padding: '20px', marginBottom: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '1.1rem' }}><span style={{ color: '#555', fontWeight: '600' }}>Time:</span><span style={{ color: '#2d3436', fontWeight: 'bold' }}>{formatTime(timeElapsed)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '1.1rem' }}><span style={{ color: '#555', fontWeight: '600' }}>Moves:</span><span style={{ color: '#2d3436', fontWeight: 'bold' }}>{moves}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.1rem', gap: '10px', marginTop: '15px', borderTop: '1px solid #e1e1e1', paddingTop: '15px' }}>
                                <span style={{ color: '#555', fontWeight: '600' }}>Rating:</span>
                                <span style={{ color: '#f1c40f', fontSize: '1.5rem', letterSpacing: '3px' }}>
                                    {[...Array(finalStars)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
                                    {[...Array(3 - finalStars)].map((_, i) => <i key={i} className="far fa-star"></i>)}
                                </span>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn-cancel" onClick={() => { setShowGameOver(false); setGameState('start'); }} style={{ flex: 1, padding: '15px', fontSize: '1.05rem' }}>Categories</button>
                            <button className="btn-confirm" onClick={() => initGame()} style={{ flex: 1, padding: '15px', fontSize: '1.05rem', background: '#1dd1a1' }}>Play Again</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}