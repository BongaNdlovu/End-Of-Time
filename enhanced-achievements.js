// ====== ENHANCED ACHIEVEMENT NOTIFICATIONS ======

/**
 * Create particle effects for special achievements
 * @param {HTMLElement} badge - The achievement badge element
 * @param {string} color - The achievement color
 */
function createAchievementParticles(badge, color) {
  const particles = 12;
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
  `;
  
  for (let i = 0; i < particles; i++) {
    const particle = document.createElement('div');
    const angle = (360 / particles) * i;
    const delay = Math.random() * 0.5;
    
    particle.style.cssText = `
      position: absolute;
      width: 6px;
      height: 6px;
      background: ${color};
      border-radius: 50%;
      box-shadow: 0 0 6px ${color};
      animation: particleExplode 1s ease-out ${delay}s forwards;
      transform: rotate(${angle}deg) translateX(0);
    `;
    
    container.appendChild(particle);
  }
  
  badge.appendChild(container);
  
  setTimeout(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }, 2000);
}

/**
 * Create screen flash effect for mythic achievements
 * @param {string} color - The achievement color
 */
function createScreenFlash(color) {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(45deg, transparent, ${color}22, transparent);
    z-index: 9998;
    pointer-events: none;
    animation: screenFlash 0.8s ease-out forwards;
  `;
  
  document.body.appendChild(flash);
  
  setTimeout(() => {
    if (flash.parentNode) {
      flash.parentNode.removeChild(flash);
    }
  }, 800);
}

/**
 * Show milestone celebration overlay
 * @param {string} milestone - The milestone text
 * @param {string} description - Milestone description
 * @param {string} icon - Milestone icon
 */
function showMilestoneCelebration(milestone, description, icon = '🎉') {
  const overlay = document.createElement('div');
  overlay.className = 'milestone-celebration';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    animation: milestoneAppear 0.5s ease-out forwards;
  `;
  
  overlay.innerHTML = `
    <div class="milestone-content" style="
      background: linear-gradient(135deg, #8B0000, #FF4B5C);
      padding: 3rem;
      border-radius: 20px;
      text-align: center;
      color: white;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      max-width: 90vw;
      transform: scale(0);
      animation: milestoneScale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s forwards;
    ">
      <div class="milestone-icon" style="font-size: 4rem; margin-bottom: 1rem; animation: milestoneIconSpin 2s ease-in-out infinite;">${icon}</div>
      <h2 style="font-family: 'Montserrat-BoldItalic', Arial, sans-serif; font-size: 2.5rem; margin: 0 0 1rem 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${milestone}</h2>
      <p style="font-family: 'Montserrat-Regular', Arial, sans-serif; font-size: 1.2rem; margin: 0; opacity: 0.9;">${description}</p>
      <button class="milestone-close" style="
        margin-top: 2rem;
        padding: 0.8rem 2rem;
        background: rgba(255,255,255,0.2);
        border: 2px solid rgba(255,255,255,0.5);
        border-radius: 10px;
        color: white;
        font-family: 'Montserrat-Regular', Arial, sans-serif;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">Continue</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Play celebration sound
  if (typeof playSound === 'function' && typeof audioRiser !== 'undefined') {
    playSound(audioRiser);
    setTimeout(() => {
      if (typeof audioCorrect1 !== 'undefined') {
        playSound(audioCorrect1);
      }
    }, 200);
  }
  
  // Close button event
  overlay.querySelector('.milestone-close').onclick = () => {
    overlay.style.animation = 'milestoneDisappear 0.4s ease-in forwards';
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 400);
  };
  
  // Auto-close after 8 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.querySelector('.milestone-close').click();
    }
  }, 8000);
}

/**
 * Check and celebrate session milestones
 */
function checkSessionMilestones() {
  // Ensure sessionStats exists
  if (typeof sessionStats === 'undefined') {
    return;
  }

  // First game milestone
  if (sessionStats.gamesPlayed === 1) {
    setTimeout(() => {
      showMilestoneCelebration(
        "Welcome to End of Time!",
        "You've completed your first game. Keep playing to unlock more achievements!",
        "🌟"
      );
    }, 1000); // Delay to avoid conflicts with other celebrations
  }
  
  // Games played milestones
  const gamesMilestones = [5, 10, 25, 50, 100];
  if (gamesMilestones.includes(sessionStats.gamesPlayed)) {
    setTimeout(() => {
      showMilestoneCelebration(
        `${sessionStats.gamesPlayed} Games Completed!`,
        `You're becoming a true scholar of the Word! Keep up the excellent work.`,
        "📚"
      );
    }, 1500);
  }
  
  // Score milestones
  const scoreMilestones = [1000, 5000, 10000, 25000, 50000];
  if (scoreMilestones.includes(sessionStats.totalScore)) {
    setTimeout(() => {
      showMilestoneCelebration(
        `${sessionStats.totalScore.toLocaleString()} Total Points!`,
        "Your knowledge of scripture continues to grow. Well done!",
        "🏆"
      );
    }, 2000);
  }
  
  // Perfect games milestone
  if (sessionStats.perfectGames === 5) {
    setTimeout(() => {
      showMilestoneCelebration(
        "5 Perfect Games!",
        "Exceptional! Your mastery of biblical knowledge is truly impressive.",
        "👑"
      );
    }, 2500);
  }
  
  // Consecutive games milestone
  if (sessionStats.consecutiveGames === 3) {
    setTimeout(() => {
      showMilestoneCelebration(
        "3 Games in a Row!",
        "You're on fire! Your dedication to learning is inspiring.",
        "🔥"
      );
    }, 3000);
  }
}

/**
 * Update session statistics and check for milestones
 * @param {Object} gameResults - Results from the completed game
 */
function updateSessionStats(gameResults) {
  if (typeof sessionStats === 'undefined') {
    window.sessionStats = {
      gamesPlayed: 0,
      totalCorrectAnswers: 0,
      totalScore: 0,
      streakRecord: 0,
      consecutiveGames: 0,
      perfectGames: 0,
      dailyPlayTime: 0,
      startTime: Date.now()
    };
  }
  
  // Update stats
  sessionStats.gamesPlayed++;
  sessionStats.totalCorrectAnswers += gameResults.correctAnswers || 0;
  sessionStats.totalScore += gameResults.score || 0;
  sessionStats.streakRecord = Math.max(sessionStats.streakRecord, gameResults.longestStreak || 0);
  
  // Track consecutive games (if player played recently)
  const timeSinceLastGame = Date.now() - (sessionStats.lastGameTime || 0);
  if (timeSinceLastGame < 300000) { // Within 5 minutes
    sessionStats.consecutiveGames++;
  } else {
    sessionStats.consecutiveGames = 1;
  }
  sessionStats.lastGameTime = Date.now();
  
  // Track perfect games
  if (gameResults.correctAnswers === gameResults.totalQuestions) {
    sessionStats.perfectGames++;
  }
  
  // Check for milestones
  checkSessionMilestones();
}

/**
 * Test milestone celebrations
 */
function testMilestoneCelebration() {
    showMilestoneCelebration(
        "Test Milestone!",
        "This is a test of the milestone celebration system.",
        "🧪"
    );
}

/**
 * Test all milestone types
 */
function testAllMilestones() {
    console.log('🎯 Testing all milestone celebrations...');
    
    const milestones = [
        { title: "Welcome Test!", desc: "Testing welcome milestone", icon: "🌟" },
        { title: "5 Games Completed!", desc: "Testing games milestone", icon: "📚" },
        { title: "1,000 Total Points!", desc: "Testing score milestone", icon: "🏆" },
        { title: "5 Perfect Games!", desc: "Testing perfect games milestone", icon: "👑" },
        { title: "3 Games in a Row!", desc: "Testing consecutive games milestone", icon: "🔥" }
    ];
    
    milestones.forEach((milestone, index) => {
        setTimeout(() => {
            showMilestoneCelebration(milestone.title, milestone.desc, milestone.icon);
        }, index * 3000);
    });
}