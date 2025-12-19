
import { Course, Comment, Badge } from "./types";

export const RANKS = [
  "Initiate",       // Lv 1-2
  "Novice",         // Lv 3-4
  "Acolyte",        // Lv 5-9
  "Operative",      // Lv 10-19
  "Scholar",        // Lv 20-29
  "Theologian",     // Lv 30-49
  "Apologist",      // Lv 50-74
  "Dogmatician",    // Lv 75-99
  "Grandmaster"     // Lv 100+
];

export const AVAILABLE_BADGES: Badge[] = [
  { id: 'b1', label: 'First Blood', icon: 'zap', description: 'Complete your first lesson.' },
  { id: 'b2', label: 'Bookworm', icon: 'book', description: 'Read 10,000 words of theology.' },
  { id: 'b3', label: 'Sharpshooter', icon: 'target', description: 'Score 100% on a tactical assessment.' },
  { id: 'b4', label: 'Faithful', icon: 'shield', description: 'Maintain a 7-day streak.' },
  { id: 'b5', label: 'Scholar', icon: 'award', description: 'Complete 3 full courses.' }
];

const COURSE_THUMBNAILS = {
  c1: new URL('./assets/covers/cover-1.svg', import.meta.url).href,
  c2: new URL('./assets/covers/cover-2.svg', import.meta.url).href,
  c3: new URL('./assets/covers/cover-3.svg', import.meta.url).href,
  c4: new URL('./assets/covers/cover-4.svg', import.meta.url).href,
  c5: new URL('./assets/covers/cover-5.svg', import.meta.url).href,
  c6: new URL('./assets/covers/cover-6.svg', import.meta.url).href,
  c7: new URL('./assets/covers/cover-7.svg', import.meta.url).href,
  c8: new URL('./assets/covers/cover-8.svg', import.meta.url).href,
  c9: new URL('./assets/covers/cover-9.svg', import.meta.url).href,
  c10: new URL('./assets/covers/cover-10.svg', import.meta.url).href,
};

export const MOCK_COMMENTS: Comment[] = [
  { id: '1', user: 'Sarah Miller', text: 'This perspective on justification changed my entire understanding of Romans 3.', date: '2 hours ago', likes: 12 },
  // Fixed: Added missing quotes for 'user' and 'text' properties on line 37
  { id: '2', user: 'David Kim', text: 'Could you clarify the difference between imputation and infusion mentioned at 12:30?', date: '5 hours ago', likes: 8 },
  { id: '3', user: 'Pastor John', text: 'Excellent point. R.C. Sproul often made a similar distinction.', date: '1 day ago', likes: 24 },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: "c1",
    title: "Foundations of Revival: The Church's Greatest Need",
    description: "An intensive analysis of the prerequisite conditions for spiritual awakening, focusing on the mechanics of individual repentance and corporate restoration.",
    instructor: "Dr. Alistair Vance",
    thumbnail: COURSE_THUMBNAILS.c1,
    difficulty: "Beginner",
    sequence: 1,
    totalProgress: 0,
    tags: ["Revival", "Pneumatology"],
    modules: [
      {
        id: "m1",
        title: "Module 1: The Urgent Prerequisite",
        lessons: [
          {
            id: "l1",
            title: "The Priority of Spiritual Awakening",
            type: "text",
            content: `I am tired of playing strong when I know I am dry. I can show up, sing loud, and still leave with a hollow chest. Revival is not another event on my calendar. It is the Spirit of God doing real work inside the places I keep hidden.

Zechariah 4:6 keeps confronting me: it is not by might, nor by power, but by His Spirit. I can manufacture motion, but I cannot manufacture breath. When I try to push my way back to life, I end up exhausted and unchanged. 2 Chronicles 7:14 is not a slogan to quote; it is a doorway I must walk through.

The Hebrew word for confession is "yadah." It comes from "yad," the word for hand. That image is simple and painful for me. Confession is not just talking. It is opening my fist. It is admitting what I am gripping at 3 AM when no one is watching.

Psalm 51:10 is a prayer I now whisper instead of rushing past: "Create in me a clean heart, O God." I am learning that 1 John 1:9 is not about hiding my mess behind religious language, but letting God cleanse what I finally bring into the light.

Revival begins when I stop performing and start surrendering. It begins when I ask for the Spirit to do what I cannot. If God is willing and I am willing, the dry ground softens. If God is willing and I am hiding, nothing changes. So today I open my hand and ask Him to breathe again.`,
            durationMinutes: 25,
            scriptureReference: "Zechariah 4:6",
            supports: {
              keyIdeas: [
                "Revival begins with surrender, not performance.",
                "The Spirit gives life that effort cannot create.",
                "Confession is opening the hand to the light.",
                "God cleanses what I stop hiding."
              ],
              reflectionPrompts: [
                "Where am I performing instead of surrendering?",
                "What am I gripping that God is asking me to open?",
                "What would change if I asked the Spirit for breath today?",
                "What part of my story am I still hiding from the light?"
              ],
              practiceSteps: [
                "Write a one sentence confession that you have avoided.",
                "Pray Zechariah 4:6 aloud each morning this week.",
                "Share one honest struggle with a trusted believer."
              ],
              prayerFocus: "Holy Spirit, expose what I am hiding and give me courage to open my hands."
            },
            isCompleted: false,
            quiz: [
              {
                id: "q1",
                question: "According to the text, what prevents God from bestowing His blessing upon the church?",
                options: ["God's unwillingness to act", "Lack of theological knowledge", "Human lack of preparation and unfulfilled conditions", "The absence of a qualified preacher"],
                correctIndex: 2,
                explanation: "The text explicitly states that God is willing to give, but the people are 'unprepared to receive it.'"
              },
              {
                id: "q2",
                question: "What is required before the preaching of the Word can be truly appreciated?",
                options: ["Higher academic training", "Better church acoustics", "The touch of the Spirit's power upon the heart", "Strict adherence to traditional rituals"],
                correctIndex: 2,
                explanation: "The text notes that without the Spirit's power, people 'cannot appreciate the preaching of the Word.'"
              },
              {
                id: "q3",
                question: "What specific actions are listed as 'our work' to fulfill the conditions for revival?",
                options: ["Marketing and fundraising", "Confession, humiliation, repentance, and prayer", "Organizing large-scale events", "Creating new church committees"],
                correctIndex: 1,
                explanation: "The document highlights these spiritual disciplines as the path to meeting God's conditions."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "c2",
    title: "Soteriology: The Anatomy of True Conversion",
    description: "A systematic examination of regeneration, the convicting power of the Spirit, and the subsequent 'New Lifestyle' that results from genuine conversion.",
    instructor: "Prof. Sarah Jenkins",
    thumbnail: COURSE_THUMBNAILS.c2,
    difficulty: "Beginner",
    sequence: 2,
    totalProgress: 0,
    tags: ["Soteriology", "Practical Theology"],
    modules: [
      {
        id: "m1",
        title: "Module 1: The Mechanism of Change",
        lessons: [
          {
            id: "l1",
            title: "Conviction and the Power of the Word",
            type: "text",
            content: `I used to think conversion was a switch I could flip. I could choose the right words, clean up for a week, and call it done. But John 1:9 says the true Light exposes what is actually inside me, not just what I want to show.

When the Word shines on my life, it does not flatter me. Hebrews 4:12 says it is living and powerful, and I feel that power when it cuts through my excuses. Conviction is not God shaming me; it is God refusing to let me hide.

The Greek word for repentance, "metanoia," is more than regret. It is a change of mind that produces a change of direction. 2 Corinthians 7:10 says godly sorrow works repentance. That line keeps me honest. I can feel sorry and still protect my sin. Real repentance turns.

The light is not trying to embarrass me. It is trying to bring me home. When I stop arguing and start agreeing with God, the darkness loses its hiding place. That is when conversion becomes more than a moment. It becomes a new posture.

So I am learning to welcome the light. I do not want to silence the alarm. I want to answer it. I want the Word and the Spirit to do their full work in me.`,
            durationMinutes: 28,
            scriptureReference: "John 1:9",
            supports: {
              keyIdeas: [
                "Conviction is mercy, not cruelty.",
                "Metanoia changes direction, not just feelings.",
                "The Word exposes in order to heal.",
                "Light that reveals can also restore."
              ],
              reflectionPrompts: [
                "Where do I resist the light?",
                "What truth am I avoiding because it makes me uncomfortable?",
                "How is God inviting me to change direction today?",
                "What excuse do I need to lay down to walk in honesty?"
              ],
              practiceSteps: [
                "Read John 1:9 slowly and rewrite it in your own words.",
                "List one habit that needs a turn and plan one concrete step.",
                "Pray for a tender conscience instead of a defended one."
              ],
              prayerFocus: "Lord, let Your light expose and heal what I have hidden."
            },
            isCompleted: false,
            quiz: [
              {
                id: "q1",
                question: "What is the primary role of the Word and the Spirit in initial conversion?",
                options: ["To provide intellectual comfort", "To manifest hidden darkness and quicken the conscience", "To replace the need for repentance", "To entertain the congregation"],
                correctIndex: 1,
                explanation: "The Word illumines the 'secret chambers of the soul' and makes 'hidden things of darkness' manifest."
              },
              {
                id: "q2",
                question: "What sense did sinners gain through this 'deep conviction'?",
                options: ["A sense of superiority", "A sense of the righteousness of Jehovah", "A sense of apathy", "A sense of complete confusion"],
                correctIndex: 1,
                explanation: "Conviction brings a realization of God's righteousness in contrast to human guilt."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "c3",
    title: "The Doctrine of Regeneration: Steps to Spiritual Birth",
    description: "Analyzing the transition from spiritual death to new life in Christ, focusing on the gifts of repentance and the imputed righteousness of the Savior.",
    instructor: "Dean Alistair Vance",
    thumbnail: COURSE_THUMBNAILS.c3,
    difficulty: "Intermediate",
    sequence: 5,
    totalProgress: 0,
    tags: ["Soteriology", "Regeneration"],
    modules: [
      {
        id: "m1",
        title: "Module 1: The Source of Repentance",
        lessons: [
          {
            id: "l1",
            title: "Repentance as a Divine Gift",
            type: "text",
            content: `I used to think repentance was my contribution to the deal. If I felt sorry enough, maybe God would accept me. But Acts 5:31 calls repentance a gift, and that confronts my pride.

I can admit I am wrong and still try to fix myself. But the first real step toward Christ is not my willpower. It is His drawing. When I respond, I am not earning grace; I am receiving it.

Romans 2:4 says the goodness of God leads me to repentance. That flips the story. Repentance is not God glaring at me. It is God extending kindness that finally melts my resistance.

Ezekiel 36:26 promises a new heart and a new spirit. That means my deepest change is not self-made. It is given. I stop thrashing and let Him pull me into new life. The shift from control to trust is the real beginning.

So I pray for a repentant heart, not just a guilty one. I ask God to give me the gift I cannot manufacture. I am learning to respond to grace with open hands.`,
            durationMinutes: 32,
            scriptureReference: "Acts 5:31",
            supports: {
              keyIdeas: [
                "Repentance is a gift, not a performance.",
                "The Spirit draws before I can respond.",
                "Surrender is the first step toward change.",
                "God's kindness leads me home."
              ],
              reflectionPrompts: [
                "Where am I still trying to earn what God gives?",
                "What would it look like to let God pull me in?",
                "Which area of my life needs a deeper yes?",
                "Where am I resisting God's kindness?"
              ],
              practiceSteps: [
                "Write a prayer asking for the gift of repentance.",
                "Confess one pattern without excuse or explanation.",
                "Choose one act of obedience as a response to grace."
              ],
              memoryFocus: "Acts 5:31 - \"Him hath God exalted... to give repentance to Israel, and forgiveness of sins.\"",
              challengeQuestions: [
                "How would you explain repentance as a gift to someone who feels trapped?",
                "Where might religious effort be masking unbelief?"
              ],
              prayerFocus: "Jesus, draw me to You and give me the heart to respond."
            },
            isCompleted: false,
            quiz: [
              {
                id: "q1",
                question: "What common misconception exists regarding repentance?",
                options: ["That it is a gift from God", "That it must follow forgiveness", "That the sinner must work to make themselves fit before coming to Christ", "That repentance is unnecessary for salvation"],
                correctIndex: 2,
                explanation: "The text corrects the idea that a sinner must 'procure for himself a fitness' before seeking Christ."
              },
              {
                id: "q2",
                question: "How is the 'first step' to Christ actually taken?",
                options: ["By human willpower alone", "Through the drawing of the Spirit of God", "By joining a church organization", "Through public confession only"],
                correctIndex: 1,
                explanation: "The document states that the first step is the 'drawing of the Spirit of God' to which the man responds."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "c4",
    title: "Nomology: The Perpetuity of the Divine Law",
    description: "An exploration of the moral law as the standard of righteousness and its unchangeable role in the economy of grace.",
    instructor: "Dr. Alistair Vance",
    thumbnail: COURSE_THUMBNAILS.c4,
    difficulty: "Advanced",
    sequence: 8,
    totalProgress: 0,
    tags: ["Ethics", "Law"],
    modules: [
      {
        id: "m1",
        title: "Module 1: The Perfection of the Law",
        lessons: [
          {
            id: "l1",
            title: "God's Rules and Human Responsibility",
            type: "text",
            content: `I like the idea of freedom until it demands responsibility. The moral law exposes that tension in me. Nature obeys fixed rules without argument, but I can understand what is right and still resist it.

Psalm 19:7 says the law of the Lord is perfect, converting the soul. That means the law is not a cage; it is a mirror and a map. It shows me what love looks like when it is concrete. It also shows me how quickly I reduce obedience to convenience.

Romans 7:12 calls the law holy, just, and good. Jesus did not erase it; Matthew 5:17-18 says He fulfilled it. That pushes me to admit that grace does not lower God's standard. It empowers me to meet it with a changed heart.

When I say God is sovereign and I am accountable, I am standing on two truths at once. That is not easy. It demands a conscience that is awake and a will that is submitted. The law exposes me, but it also protects me from self-deception.

So I am not asking for a softer law. I am asking for a stronger heart. I want obedience that comes from love, not fear, and a conscience trained to see love in God's commands.`,
            durationMinutes: 38,
            scriptureReference: "Psalm 19:7",
            supports: {
              keyIdeas: [
                "Moral law reveals love in action.",
                "Freedom without responsibility becomes rebellion.",
                "Obedience grows from a yielded will."
              ],
              reflectionPrompts: [
                "Where do I justify disobedience under the banner of freedom?",
                "Which command do I obey only when convenient?",
                "How does God's law protect love in my relationships?"
              ],
              practiceSteps: [
                "Read Exodus 20 and write how each command protects love.",
                "Identify one area where conscience is dull and ask God to sharpen it."
              ],
              challengeQuestions: [
                "How do sovereignty and responsibility coexist without contradiction?",
                "What happens to grace when law is ignored?",
                "What is the difference between legalism and obedience?"
              ],
              integrationWork: [
                "Trace how Psalm 19:7 and Matthew 5:17-18 fit together in one paragraph.",
                "List one command and write how it guards love in a real relationship.",
                "Describe how grace empowers obedience without removing accountability."
              ],
              caseTesting: [
                "A friend says, \"Love means we do not need rules.\" How do you respond?",
                "Someone obeys out of fear and resentment. How would you redirect them?",
                "A leader ignores clear commandments but emphasizes grace. What is missing?"
              ],
              prayerFocus: "God, awaken my conscience and align my will with Your law."
            },
            isCompleted: false,
            quiz: [
              {
                id: "q1",
                question: "Unlike nature, which is governed by natural law, what law is man uniquely amenable to?",
                options: ["Biological law", "Civil law", "Moral law", "Scientific law"],
                correctIndex: 2,
                explanation: "Man is an intelligent being specifically accountable to the 'moral law.'"
              },
              {
                id: "q2",
                question: "What quality did God bestow on man to allow for the realization of the law's claims?",
                options: ["Superior intellect", "A conscience", "Immortality", "Economic freedom"],
                correctIndex: 1,
                explanation: "God gave man a 'conscience to realize the sacred claims of the divine law.'"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "c5",
    title: "Faith and Works: The Theology of Balanced Effort",
    description: "Correcting the errors of 'Faith Only' vs 'Works Only'. A study on the cooperative synergy between the believer and the Holy Spirit.",
    instructor: "Prof. Sarah Jenkins",
    thumbnail: COURSE_THUMBNAILS.c5,
    difficulty: "Intermediate",
    sequence: 4,
    totalProgress: 0,
    tags: ["Theology", "Sanctification"],
    modules: [
      {
        id: "m1",
        title: "Module 1: The Two Oars of the Christian Life",
        lessons: [
          {
            id: "l1",
            title: "Harmony in Overcoming",
            type: "text",
            content: `I swing between two extremes. Some days I try to earn my way with frantic effort. Other days I hide behind grace and do nothing. James 2 refuses to let me stay in either ditch.

Faith and works are two oars. If I pull with one and not the other, I go in circles. Philippians 2:12-13 holds the tension: I work out what God works in. My effort is not the source of power, but it is the place where power shows up.

Ephesians 2:8-10 keeps me honest. I am saved by grace, not by my performance, but I am saved for good works prepared ahead of time. Grace gives me a new direction, not a new excuse.

I am learning that obedience is not a substitute for faith. It is the fruit of faith. I do not work to be loved. I work because I am loved. When I trust, my hands move. When I obey, my trust deepens.

This is the balance I want: a heart that trusts and hands that move.`,
            durationMinutes: 30,
            scriptureReference: "James 2:14-24",
            supports: {
              keyIdeas: [
                "Faith without action is inert.",
                "Works without faith become self-salvation.",
                "Grace empowers effort."
              ],
              reflectionPrompts: [
                "Where am I passive and calling it faith?",
                "Where am I striving and calling it holiness?",
                "What would balanced obedience look like this week?"
              ],
              practiceSteps: [
                "Choose one small act of obedience you have postponed.",
                "Ask God for strength, then take the step today.",
                "Review James 2 and journal one insight."
              ],
              memoryFocus: "James 2:17 - \"Faith, if it hath not works, is dead, being alone.\"",
              prayerFocus: "Lord, let my faith move my hands without stealing my trust."
            },
            isCompleted: false,
            quiz: [
              {
                id: "q1",
                question: "What metaphor does the author use to describe the relationship between faith and works?",
                options: ["A tree and its roots", "A master and a slave", "Two oars of a boat", "A mirror and a reflection"],
                correctIndex: 2,
                explanation: "Faith and works are described as 'two oars' that must be used equally."
              },
              {
                id: "q2",
                question: "What is the stated consequence of making no effort to cooperate with God?",
                options: ["God works twice as hard", "God cannot work through us", "Grace covers the lack of effort", "Salvation is lost instantly"],
                correctIndex: 1,
                explanation: "The text states: 'God cannot work through us if we make no effort.'"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "c6",
    title: "Abiding in Christ: The Mystical Union",
    description: "An analysis of the Vine and the Branches metaphor. Understanding real vs. pretended connection and the process of spiritual pruning.",
    instructor: "Dr. Alistair Vance",
    thumbnail: COURSE_THUMBNAILS.c6,
    difficulty: "Intermediate",
    sequence: 6,
    totalProgress: 0,
    tags: ["Christology", "Union"],
    modules: [
      {
        id: "m1",
        title: "Module 1: The Essential Alliance",
        lessons: [
          {
            id: "l1",
            title: "Resting and Working in the Vine",
            type: "text",
            content: `I have been guilty of treating Jesus like a resource instead of a root. I check in for help, but I do not stay connected. John 15 exposes the difference between a real union and a pretend one.

A branch does not try to be alive. It stays attached. The life flows. When I abide, I stop hustling for identity and start receiving it. Galatians 2:20 reminds me that Christ lives in me, not just around me.

Abiding is not passive. It is a daily yes. It is choosing His voice over my impulses and His will over my cravings. Colossians 2:6 says to walk in Him the way I received Him, with trust and dependence.

Pruning still scares me. I like growth without cutting. But the Father loves me enough to remove what blocks the fruit. That means I can trust His hand even when it feels like loss.

I am learning to remain. Not just to visit. Not just to borrow strength. To stay connected and let His life shape mine.`,
            durationMinutes: 30,
            scriptureReference: "John 15:5",
            supports: {
              keyIdeas: [
                "Abiding is staying connected, not visiting.",
                "Life flows from union, not performance.",
                "Yielded will marks real connection."
              ],
              reflectionPrompts: [
                "Where do I treat Jesus as a resource instead of a root?",
                "What competes with daily abiding in my routine?",
                "What would it look like to remain when I feel dry?"
              ],
              practiceSteps: [
                "Spend ten quiet minutes with John 15 and write one sentence prayer.",
                "Name one habit that disconnects you and replace it for a week.",
                "Choose a daily time to remain with God, even if brief."
              ],
              memoryFocus: "John 15:5 - \"He that abideth in me, and I in him, the same bringeth forth much fruit.\"",
              prayerFocus: "Jesus, keep me connected and teach me to remain."
            },
            isCompleted: false,
            quiz: [
              {
                id: "q1",
                question: "What defines a 'real connection' as opposed to a 'pretended union'?",
                options: ["Publicly joining a church", "Intellectual assent to truth", "A vital, unobstructed communication of life via personal faith", "Strict adherence to physical fasting"],
                correctIndex: 2,
                explanation: "The text emphasizes a 'vital connection' where communication of life is constant."
              },
              {
                id: "q2",
                question: "What is required from the believer's will in this relationship?",
                options: ["It must be ignored", "It must be wholly yielded to the divine will", "It must be strengthened through self-assertion", "It remains independent of God"],
                correctIndex: 1,
                explanation: "The document requires that 'Our will must be wholly yielded to the divine will.'"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "c7",
    title: "Apologetics: Identifying Counterfeit Revivals",
    description: "A defensive study in theological discernment. Testing every spirit by the Word and learning to detect the hallmarks of fanaticism.",
    instructor: "Dean Alistair Vance",
    thumbnail: COURSE_THUMBNAILS.c7,
    difficulty: "Advanced",
    sequence: 9,
    totalProgress: 0,
    tags: ["Apologetics", "Discernment"],
    modules: [
      {
        id: "m1",
        title: "Module 1: The Test of Truth",
        lessons: [
          {
            id: "l1",
            title: "To the Law and to the Testimony",
            type: "text",
            content: `I have seen hype that felt like fire and died by Tuesday. I have watched people confuse volume with truth. Isaiah 8:20 keeps bringing me back: to the law and to the testimony.

Counterfeit revivals often borrow the language of God while ignoring the character of God. They promise power without holiness and miracles without obedience. That is not faith. That is manipulation.

1 John 4:1 tells me to test the spirits, and Acts 17:11 praises those who searched the Scriptures daily. Discernment is not suspicion; it is love for the truth. The Spirit never asks me to turn off my mind or bypass Scripture.

Matthew 7:16 says I will know them by their fruits. That means I must look beyond the stage and into the life. Does this movement produce humility, repentance, and obedience, or does it produce pride and noise?

So I test what I hear, even when I like it. I want the real thing, even if it is slower and quieter. I want truth that endures when the music fades.`,
            durationMinutes: 40,
            scriptureReference: "Isaiah 8:20",
            supports: {
              keyIdeas: [
                "Counterfeits borrow language but reject obedience.",
                "Scripture is the test, not emotion.",
                "Discernment is love for truth."
              ],
              reflectionPrompts: [
                "Where do I confuse intensity with truth?",
                "What teachings have I accepted without testing?",
                "How can I grow in humble discernment?"
              ],
              practiceSteps: [
                "Test one recent sermon or teaching against Isaiah 8:20.",
                "Write a simple test grid: Scripture, character, fruit.",
                "Ask a trusted mentor to challenge one of your assumptions."
              ],
              challengeQuestions: [
                "What marks a genuine revival beyond visible miracles?",
                "How do you guard against cynicism while testing spirits?"
              ],
              integrationWork: [
                "Build a two-column test: Isaiah 8:20 and 1 John 4:1. Note what each requires.",
                "Compare a popular teaching with Scripture and summarize the differences.",
                "Write one paragraph on how fruit and doctrine must agree."
              ],
              caseTesting: [
                "A movement has miracles but no repentance. What questions do you ask?",
                "A leader demands loyalty but avoids Scripture. How do you respond?",
                "A friend says, \"God is doing a new thing,\" but refuses correction. What is missing?"
              ],
              prayerFocus: "Spirit of truth, train my heart to love what is real."
            },
            isCompleted: false,
            quiz: [
              {
                id: "q1",
                question: "What is the ultimate standard for testing any miracle or teaching?",
                options: ["Scientific verification", "Emotional response", "The Holy Scriptures (Law and Testimony)", "The reputation of the teacher"],
                correctIndex: 2,
                explanation: "Isaiah 8:20 is cited as the definitive standard for discernment."
              },
              {
                id: "q2",
                question: "Can miracles alone prove that a movement is of God?",
                options: ["Yes, miracles are the supreme proof", "No, because 'healing can be from the devil'", "Only if the miracles happen in a church", "No, unless they are documented on film"],
                correctIndex: 1,
                explanation: "The text warns that the deceiver works miracles to lead people away from God's law."
              },
              {
                id: "q3",
                question: "What is the 'safeguard' against the spirits of darkness?",
                options: ["Isolation from the world", "A knowledge of the Bible", "Trusting in church leadership alone", "Physical protective charms"],
                correctIndex: 1,
                explanation: "A knowledge of the Bible is explicitly called the 'safeguard.'"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "c8",
    title: "Sanctification: The Science of Character Building",
    description: "Understanding the lifelong process of transformation. Character building as a strategic battle and a rigorous spiritual discipline.",
    instructor: "Prof. Sarah Jenkins",
    thumbnail: COURSE_THUMBNAILS.c8,
    difficulty: "Intermediate",
    sequence: 7,
    totalProgress: 0,
    tags: ["Sanctification", "Ethics"],
    modules: [
      {
        id: "m1",
        title: "Module 1: The Lifelong Struggle",
        lessons: [
          {
            id: "l1",
            title: "Perseverance and the Science of Christianity",
            type: "text",
            content: `I keep wishing sanctification were a sprint. But it is a lifelong training program. Character is built the way muscle is built: with repeated effort, honest failure, and steady correction.

The science of Christianity means I cannot drift. My mind must be trained. My habits must be reshaped. The Spirit does not just inspire me; He disciplines me. 1 Corinthians 15:31 says, "I die daily." That is not dramatic language. It is daily surrender.

Romans 12:1-2 keeps reminding me that transformation comes from a renewed mind, not a stronger image. Philippians 1:6 keeps me steady: He who began a good work will complete it. That means slow progress is still progress.

Some days the work feels small. But small obediences stack. They become a new story. I am learning to celebrate steady faithfulness instead of chasing constant novelty.

So I do not despise the slow work. I lean into it. I am being shaped for holiness, not just for moments.`,
            durationMinutes: 34,
            scriptureReference: "1 Corinthians 15:31",
            supports: {
              keyIdeas: [
                "Sanctification is slow, faithful formation.",
                "Habits shape character.",
                "Discipline is grace in motion."
              ],
              reflectionPrompts: [
                "Which small obedience am I tempted to despise?",
                "Where do I want instant change instead of steady growth?",
                "What habit needs retraining this month?"
              ],
              practiceSteps: [
                "Choose one daily practice and commit for 14 days.",
                "Track one temptation and note what triggers it.",
                "Invite a friend to ask you about progress weekly."
              ],
              memoryFocus: "Philippians 1:6 - \"He which hath begun a good work in you will perform it.\"",
              prayerFocus: "God, make me faithful in the slow work of change."
            },
            isCompleted: false,
            quiz: [
              {
                id: "q1",
                question: "How long does the work of character building take?",
                options: ["It is instantaneous upon conversion", "One year of intensive study", "A lifetime", "Until the first level of mastery is reached"],
                correctIndex: 2,
                explanation: "The text emphasizes that it is 'the work... of a lifetime.'"
              },
              {
                id: "q2",
                question: "Why does the document refer to Christianity as a 'science'?",
                options: ["To reconcile it with evolution", "Because it requires disciplined study, education, and training of the mind", "To make it sound more modern", "Because it relies on laboratory experiments"],
                correctIndex: 1,
                explanation: "It is a science because the mind must be disciplined to act against 'inborn inclination.'"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "c9",
    title: "Ecclesiology: Safeguarding the Movement",
    description: "A study on institutional integrity and maintaining the Spirit of God within the community against the distractions of worldliness.",
    instructor: "Dr. Alistair Vance",
    thumbnail: COURSE_THUMBNAILS.c9,
    difficulty: "Beginner",
    sequence: 3,
    totalProgress: 0,
    tags: ["Ecclesiology", "Leadership"],
    modules: [
      {
        id: "m1",
        title: "Module 1: Walking in the Light",
        lessons: [
          {
            id: "l1",
            title: "Avoiding the Eclipse of Truth",
            type: "text",
            content: `I did not expect distractions to be so spiritual, but they are. The small amusements that look harmless can crowd out the voice of God in me. When I am honest, I can scroll for hours and call it "rest" while my soul goes hungry.

John 8:12 says to walk in the light. That means I keep moving toward what is true, even when entertainment pulls me back. 1 John 2:15-17 warns me not to love the world, and I feel that warning in the tug between worship and escape.

The eclipse is not sudden. It is slow. I notice it when prayer feels dull, Scripture feels distant, and the last thing I want is silence. Hebrews 12:1 tells me to lay aside every weight, not just obvious sins. Some weights are just comfortable.

So I am learning to guard my attention. I want to keep the light first, even in the ordinary hours of my week. I want to choose God before the noise, again and again.

This is how movements stay alive: not with hype, but with hearts that keep the light on. I do not want to grieve the Spirit with casual choices. I want to walk in the light, not just talk about it.`,
            durationMinutes: 28,
            scriptureReference: "John 8:12",
            supports: {
              keyIdeas: [
                "Distractions can eclipse the light.",
                "Walking in the light requires active choice.",
                "Attention is spiritual stewardship.",
                "Small compromises create slow darkness."
              ],
              reflectionPrompts: [
                "What amusement most easily dulls my hunger for God?",
                "Where has my schedule pushed God to the edge?",
                "What would first love look like in my week?",
                "What weight do I need to lay aside today?"
              ],
              practiceSteps: [
                "Fast one entertainment habit for 24 hours.",
                "Replace that time with prayer or Scripture.",
                "Set a simple boundary that protects your attention."
              ],
              prayerFocus: "Lord, guard my attention and keep my heart in the light."
            },
            isCompleted: false,
            quiz: [
              {
                id: "q1",
                question: "What is described as a 'corresponding' effect of great spiritual light?",
                options: ["Global peace", "Great spiritual darkness (Satanic counter-effort)", "Economic prosperity", "Universal agreement on doctrine"],
                correctIndex: 1,
                explanation: "The text warns that times of light are met with pressing powers of darkness."
              },
              {
                id: "q2",
                question: "What specific activity in the school context was cited as potentially grieving the Spirit?",
                options: ["Excessive study", "Silent prayer", "Absorption in match games and amusements", "Learning new languages"],
                correctIndex: 2,
                explanation: "The document explicitly points to 'match games and football' as distractions that Satan uses."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "c10",
    title: "Eschatology: The Investigative Judgment",
    description: "Preparing for the final assessment in the heavenly sanctuary. An examination of the High Priest's work and the end of probation.",
    instructor: "Dean Alistair Vance",
    thumbnail: COURSE_THUMBNAILS.c10,
    difficulty: "Advanced",
    sequence: 10,
    totalProgress: 100,
    tags: ["Eschatology", "Sanctuary"],
    modules: [
      {
        id: "m1",
        title: "Module 1: Standing Before the High Priest",
        lessons: [
          {
            id: "l1",
            title: "The Investigative Process",
            type: "text",
            content: `I used to hear the investigative judgment as a threat. Now I hear it as a call to honesty. Romans 14:12 says I will give an account to God. That does not crush me; it sobers me.

Hebrews 4:13 says nothing is hidden from His sight. That used to terrify me. Now it invites me to stop pretending. The light that exposes me is the same light that heals me.

Christ stands as my High Priest, and that changes the tone of the courtroom. 1 John 2:1 says we have an Advocate with the Father. The question is not whether I am perfect, but whether I am willing to be made clean.

The warning is real: probation closes. Daniel 7:9-10 describes the books opened, and Revelation 14:7 calls me to reverence and honesty. This is not panic. It is preparation. The end is near enough to demand integrity now.

So I live awake. I confess quickly. I trust the One who pleads for me and let the coming judgment make me faithful, not fearful.`,
            durationMinutes: 45,
            scriptureReference: "Romans 14:12",
            supports: {
              keyIdeas: [
                "Judgment calls for honest living, not fear.",
                "Christ is Advocate as well as Judge.",
                "Readiness means living in the light now."
              ],
              reflectionPrompts: [
                "What area of my life would I hide if I could?",
                "How does Christ's advocacy change how I face judgment?",
                "What step of repentance is urgent today?"
              ],
              practiceSteps: [
                "Read Romans 14:12 and write what accountability means to you.",
                "Confess one hidden habit to God and a trusted believer.",
                "Choose one act of restitution or reconciliation."
              ],
              challengeQuestions: [
                "How do mercy and justice meet in the judgment?",
                "What does readiness look like without anxiety?"
              ],
              integrationWork: [
                "Summarize how Romans 14:12 and 1 John 2:1 shape your view of judgment.",
                "Trace the sanctuary imagery from Daniel 7:9-10 to Revelation 14:7.",
                "Write one paragraph on how honesty now prepares you for eternity."
              ],
              caseTesting: [
                "A friend is terrified of judgment and avoids God. How do you respond?",
                "Someone feels no urgency because \"grace covers everything.\" What truth do they need?",
                "How would you counsel a believer who hides sin but serves publicly?"
              ],
              prayerFocus: "Jesus, keep me honest and ready as You intercede for me."
            },
            isCompleted: true,
            quiz: [
              {
                id: "q1",
                question: "What event began in 1844 in the heavenly sanctuary?",
                options: ["The building of the Temple", "The start of the investigative judgment", "The end of all sin", "The physical Second Coming"],
                correctIndex: 1,
                explanation: "1844 marks the entry of the High Priest into the most holy place for judgment."
              },
              {
                id: "q2",
                question: "What was required of the people during the 'typical service' (Day of Atonement)?",
                options: ["Feasting and celebration", "Afflicting their souls and confessing sins", "Paying taxes to the sanctuary", "Nothing, as the Priest did all the work"],
                correctIndex: 1,
                explanation: "The people were 'required to afflict their souls' and participate in the confession of sin."
              },
              {
                id: "q3",
                question: "What defines 'enchanted ground' in this context?",
                options: ["A physical location in Jerusalem", "A state of spiritual apathy or false security", "A literal magical forest", "The grounds surrounding the church"],
                correctIndex: 1,
                explanation: "Remaining on 'enchanted ground' implies a failure to recognize the solemnity of the approaching close of probation."
              }
            ]
          }
        ]
      }
    ]
  }
];
