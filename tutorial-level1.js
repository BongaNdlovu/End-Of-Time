/**
 * Tutorial for Level 1: Multiple Choice Questions
 * Displays before starting Level 1
 */

const tutorialLevel1 = {
    level: 1,
    title: "Level 1: The Foundation",
    subtitle: "Multiple Choice Questions",

    // Game mechanics explanation
    mechanics: {
        icon: "🎮",
        title: "How to Play",
        description: [
            "• Read each question carefully",
            "• Choose from 4 possible answers (A, B, C, or D)",
            "• Click your answer before time runs out",
            "• You have 10 seconds per question",
            "• Earn points for correct answers and build your streak!"
        ]
    },

    // Question types and content
    content: {
        icon: "📖",
        title: "What to Expect",
        description: [
            "• <strong>Question Type:</strong> Multiple choice with 4 options",
            "• <strong>Topic Focus:</strong> Basic biblical knowledge from Genesis",
            "• <strong>Difficulty:</strong> Easy - Foundation level",
            "• <strong>Categories:</strong> Creation, People, Places, Events, The Fall, The Flood",
            "• <strong>Examples:</strong> Who was the first man? What did God create on the seventh day?"
        ]
    },

    // Power-ups and tools
    tools: {
        icon: "⚡",
        title: "Power-Ups Available",
        description: [
            "• <strong>Hint (-3 tokens):</strong> Get a helpful clue about the answer",
            "• <strong>Take Away Two (-2 tokens):</strong> Remove two wrong answers",
            "• <strong>Double Points (1 token):</strong> Earn 2x points for this question",
            "• <strong>Freeze Time (1 token):</strong> Pause the timer for 10 seconds"
        ]
    },

    // Tips for success
    tips: {
        icon: "💡",
        title: "Pro Tips",
        description: [
            "• Answer quickly to maximize your score",
            "• Build streaks for bonus points",
            "• Save your power-ups for harder questions",
            "• Read explanations after each answer to learn more",
            "• Earn Faith Tokens by answering correctly"
        ]
    },

    // Styling
    theme: {
        backgroundColor: "rgba(18, 18, 18, 0.95)",
        borderColor: "#6b0000",
        textColor: "#ffffff",
        accentColor: "#8B0000"
    }
};
