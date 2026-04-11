import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Achievements.css';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export default function Achievements() {
    const navigate = useNavigate();
    
    const [stats, setStats] = useState({
        learned: 0,
        compounds: 0,
        timeAttack: 0,
        matching: 999
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

        setStats({ learned: learnedCount, compounds: discoveredCompoundsCount, timeAttack: timeAttackScore, matching: matchingGameScore });

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

                setStats({ learned: learnedCount, compounds: discoveredCompoundsCount, timeAttack: timeAttackScore, matching: matchingGameScore });
                
                // Update local storage to match cloud
                if (data.learnedElements) localStorage.setItem(`learnedElements_${userName}`, JSON.stringify(data.learnedElements));
                if (data.discoveredCompounds) localStorage.setItem(`discoveredCompounds_${userName}`, JSON.stringify(data.discoveredCompounds));
                if (data.timeAttackBestCorrect !== undefined) localStorage.setItem(`timeAttackBestCorrect_${userName}`, timeAttackScore.toString());
                if (data.matchingGameBestScore !== undefined && data.matchingGameBestScore > 0) localStorage.setItem(`matchingGameBestScore_${userName}`, matchingGameScore.toString());
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
        { id: 'demon', title: 'Speed Demon', desc: 'Answer 10 or more questions correctly in a single round of Time Attack.', icon: 'fa-stopwatch', bg: 'bg-red', unlocked: stats.timeAttack >= 10 }
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

    return (
        <div>
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

            <main className="dashboard-container">
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