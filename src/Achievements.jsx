import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Achievements.css';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// XP Levels (mirrors Laboratory.jsx)
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

export default function Achievements() {
    const navigate = useNavigate();
    
    const [stats, setStats] = useState({
        learned: 0,
        compounds: 0,
        timeAttack: 0,
        matching: 999,
        labXp: 0,
        labBadges: [],
        puzzlesCompleted: 0,
        puzzleBadges: [],
    });
    const [progressWidth, setProgressWidth] = useState(0);

    const userName = sessionStorage.getItem('loggedInUser') || 'Scientist';

    useEffect(() => {
        // Initial load from local storage
        let learnedCount = (JSON.parse(localStorage.getItem(`learnedElements_${userName}`)) || []).length;
        let discoveredCompoundsCount = (JSON.parse(localStorage.getItem(`discoveredCompounds_${userName}`)) || []).length;
        let timeAttackScore = parseInt(localStorage.getItem(`timeAttackBestCorrect_${userName}`) || '0');
        let matchingGameScore = parseInt(localStorage.getItem(`matchingGameBestScore_${userName}`), 10);
        if (isNaN(matchingGameScore) || matchingGameScore <= 0) matchingGameScore = 999;
        let puzzlesCompleted = parseInt(localStorage.getItem(`puzzlesCompleted_${userName}`) || '0', 10);
        let puzzleBadges = JSON.parse(localStorage.getItem(`puzzleBadges_${userName}`)) || [];

        setStats(prev => ({ ...prev, learned: learnedCount, compounds: discoveredCompoundsCount, timeAttack: timeAttackScore, matching: matchingGameScore, puzzlesCompleted, puzzleBadges }));

        // Sync with Firestore in real-time
        const userRef = doc(db, "users", userName);
        const unsubscribe = onSnapshot(userRef, (userSnap) => {
            if (userSnap.exists()) {
                const data = userSnap.data();
                learnedCount = data.learnedElements ? data.learnedElements.length : learnedCount;
                discoveredCompoundsCount = data.discoveredCompounds ? data.discoveredCompounds.length : discoveredCompoundsCount;
                timeAttackScore = data.timeAttackBestCorrect !== undefined ? data.timeAttackBestCorrect : timeAttackScore;
                
                const cloudMatching = data.matchingGameBestScore;
                matchingGameScore = (cloudMatching !== undefined && cloudMatching > 0) ? cloudMatching : matchingGameScore;

                puzzlesCompleted = data.puzzlesCompleted !== undefined ? data.puzzlesCompleted : puzzlesCompleted;
                puzzleBadges = data.puzzleBadges || puzzleBadges;

                setStats(prev => ({ ...prev, learned: learnedCount, compounds: discoveredCompoundsCount, timeAttack: timeAttackScore, matching: matchingGameScore, puzzlesCompleted, puzzleBadges }));
                
                // Update local storage to match cloud
                if (data.learnedElements) localStorage.setItem(`learnedElements_${userName}`, JSON.stringify(data.learnedElements));
                if (data.discoveredCompounds) localStorage.setItem(`discoveredCompounds_${userName}`, JSON.stringify(data.discoveredCompounds));
                if (data.timeAttackBestCorrect !== undefined) localStorage.setItem(`timeAttackBestCorrect_${userName}`, timeAttackScore.toString());
                if (data.matchingGameBestScore !== undefined && data.matchingGameBestScore > 0) localStorage.setItem(`matchingGameBestScore_${userName}`, matchingGameScore.toString());
                if (data.puzzlesCompleted !== undefined) localStorage.setItem(`puzzlesCompleted_${userName}`, puzzlesCompleted.toString());
                if (data.puzzleBadges) localStorage.setItem(`puzzleBadges_${userName}`, JSON.stringify(puzzleBadges));
                const labXp = data.labXp || 0;
                const labBadges = data.labBadges || [];
                setStats(prev => ({ ...prev, labXp, labBadges }));
            }
        }, (e) => {
            console.error("Error fetching cloud stats:", e);
        });
        
        return () => unsubscribe();
    }, [userName]);

    // Define the badges and their unlock conditions
    const badges = [
        { id: 'first-steps', title: 'First Steps', desc: 'Created an account and logged into AtomARix for the first time.', icon: 'fa-user-check', bg: 'bg-gold', unlocked: true },
        { id: 'explorer', title: 'Novice Explorer', desc: 'Read about and learn at least 10 different elements in the Periodic Table.', icon: 'fa-search', bg: 'bg-blue', unlocked: stats.learned >= 10 },
        { id: 'scholar', title: 'Dedicated Scholar', desc: 'Read about and learn at least 50 different elements in the Periodic Table.', icon: 'fa-book-open', bg: 'bg-purple', unlocked: stats.learned >= 50 },
        { id: 'brainiac', title: 'Brainiac', desc: 'Complete the Matching Game in 20 moves or less.', icon: 'fa-brain', bg: 'bg-orange', unlocked: stats.matching <= 20 },
        { id: 'scientist', title: 'Mad Scientist', desc: 'Successfully create 5 different chemical compounds in the Virtual Laboratory.', icon: 'fa-vial', bg: 'bg-green', unlocked: stats.compounds >= 5 },
        { id: 'demon', title: 'Speed Demon', desc: 'Answer 10 or more questions correctly in a single round of Time Attack.', icon: 'fa-stopwatch', bg: 'bg-red', unlocked: stats.timeAttack >= 10 },
        // ── Periodic Puzzle badges ──
        { id: 'puzzle-first',      title: 'Puzzle Starter',    desc: 'Complete a category in the Periodic Puzzle for the first time.', icon: 'fa-puzzle-piece', bg: 'bg-blue',   unlocked: (stats.puzzleBadges || []).includes('puzzle-first')      },
        { id: 'puzzle-full-table', title: 'Full Table Champ',  desc: 'Complete the Periodic Puzzle with every element on the table.',  icon: 'fa-th',            bg: 'bg-purple', unlocked: (stats.puzzleBadges || []).includes('puzzle-full-table') },
        { id: 'puzzle-master',     title: 'Category Master',   desc: 'Complete every category at least once in the Periodic Puzzle.',  icon: 'fa-crown',         bg: 'bg-gold',   unlocked: (stats.puzzleBadges || []).includes('puzzle-master')     },
        { id: 'puzzle-veteran',    title: 'Puzzle Veteran',    desc: 'Complete 10 rounds of the Periodic Puzzle.',                      icon: 'fa-trophy',        bg: 'bg-green',  unlocked: (stats.puzzleBadges || []).includes('puzzle-veteran')    },
        // ── Lab badges ──
        { id: 'lab-first',      title: 'First Discovery',   desc: 'Discover your first compound in the Virtual Laboratory.', icon: 'fa-vial', bg: 'bg-blue',   unlocked: (stats.labBadges || []).includes('lab-first')      },
        { id: 'lab-water',      title: 'Hydration Expert',  desc: 'Discover Water (H₂O) in the Laboratory.',                icon: 'fa-tint', bg: 'bg-blue',   unlocked: (stats.labBadges || []).includes('lab-water')      },
        { id: 'lab-toxic',      title: 'Danger Zone',       desc: 'Discover 3 toxic or dangerous compounds.',               icon: 'fa-skull-crossbones', bg: 'bg-red',    unlocked: (stats.labBadges || []).includes('lab-toxic')      },
        { id: 'lab-pyromaniac', title: 'Pyromaniac',        desc: 'Use the Bunsen burner 10 times.',                        icon: 'fa-fire', bg: 'bg-orange', unlocked: (stats.labBadges || []).includes('lab-pyromaniac') },
        { id: 'lab-mad',        title: 'Mad Scientist',     desc: 'Discover 15 different compounds.',                       icon: 'fa-flask', bg: 'bg-purple', unlocked: (stats.labBadges || []).includes('lab-mad')        },
        { id: 'lab-master',     title: 'Master Chemist',    desc: 'Discover all 36 compounds in the Laboratory.',           icon: 'fa-medal', bg: 'bg-gold',   unlocked: (stats.labBadges || []).includes('lab-master')     },
        { id: 'lab-speed',      title: 'Speed Mixer',       desc: 'Discover 5 compounds in a single lab session.',          icon: 'fa-bolt',  bg: 'bg-green',  unlocked: (stats.labBadges || []).includes('lab-speed')      },
        { id: 'lab-recall',     title: 'Recall Master',     desc: 'Score 7 or more out of 8 in the Compound Recall mini-game.', icon: 'fa-brain', bg: 'bg-purple', unlocked: (stats.labBadges || []).includes('lab-recall')     },
    ];

    const unlockedCount = badges.filter(b => b.unlocked).length;
    const progressPercent = Math.round((unlockedCount / badges.length) * 100);

    // Animate progress bar slightly after component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            setProgressWidth(progressPercent);
        }, 300);
        return () => clearTimeout(timer);
    }, [progressPercent]);

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
                    <li onClick={() => navigate('/timeattack')}><i className="fas fa-stopwatch"></i> <span>Time Attack</span></li>
                    <li className="active"><i className="fas fa-trophy"></i> <span>Achievements</span></li>
                </ul>
                <div style={{ width: '130px' }}></div>
            </nav>

            <main className="dashboard-container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="hero-banner achievements-banner">
                    <div className="hero-text">
                        <h1>Trophy Room 🏆</h1>
                        <p>Track your milestones and unlock badges as you explore the world of chemistry!</p>
                    </div>
                    <div className="hero-icon"><i className="fas fa-medal"></i></div>
                </div>

                <div className="progress-section">
                    <div className="progress-header">
                        <h3>Overall Completion</h3>
                        <span>{progressPercent}%</span>
                    </div>
                    <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${progressWidth}%` }}></div>
                    </div>
                </div>

                <div className="achievements-grid">
                    {badges.map(badge => (
                        <div key={badge.id} className={`badge-card ${!badge.unlocked ? 'locked' : ''}`}>
                            <div className={`badge-icon ${badge.bg}`}><i className={`fas ${badge.icon}`}></i></div>
                            <div className="badge-info">
                                <h3>{badge.title}</h3>
                                <p>{badge.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}