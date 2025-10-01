/**
 * Level 4: Matching Questions
 * Match biblical figures, places, and events
 * Focus: Relationships and connections
 */

const level4Questions = [
    {
        "id": "L4Q001",
        "question": "Match the son of Jacob to his mother.",
        "pairs": [
            { "left": "Dan", "right": "Bilhah" },
            { "left": "Judah", "right": "Leah" },
            { "left": "Joseph", "right": "Rachel" },
            { "left": "Gad", "right": "Zilpah" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "These are the sons of Jacob, matched with their respective mothers: Leah, Rachel, and their handmaids Bilhah and Rachel (Genesis 30, 35)."
    },
    {
        "id": "L4Q002",
        "question": "Match the creation event to the correct day.",
        "pairs": [
            { "left": "Light was created", "right": "Day 1" },
            { "left": "The expanse (sky) was separated from the waters", "right": "Day 2" },
            { "left": "Sun, moon, and stars were created", "right": "Day 4" },
            { "left": "Sea creatures and birds were created", "right": "Day 5" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This requires knowing the specific order of creation in Genesis 1. A tricky point is that light (Day 1) was created before the sun (Day 4)."
    },
    {
        "id": "L4Q003",
        "question": "Match the metaphorical prophecy from Genesis 49 to the correct son of Jacob.",
        "pairs": [
            { "left": "Judah", "right": "A lion's whelp; the scepter shall not depart" },
            { "left": "Issachar", "right": "A strong donkey lying down between two burdens" },
            { "left": "Dan", "right": "A serpent by the way, a viper by the path" },
            { "left": "Benjamin", "right": "A ravenous wolf; in the morning devouring the prey" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "These are the specific, symbolic blessings or prophecies Jacob gave to his sons before his death in Genesis 49."
    },
    {
        "id": "L4Q004",
        "question": "Match the place to the key event that occurred there.",
        "pairs": [
            { "left": "Land of Moriah", "right": "Abraham was tested to offer Isaac" },
            { "left": "Bethel", "right": "Jacob dreamed of a ladder to heaven" },
            { "left": "Peniel", "right": "Jacob wrestled with God and was renamed Israel" },
            { "left": "Cave of Machpelah", "right": "Abraham purchased a burial plot for Sarah" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "These locations are significant settings for major events in the lives of the patriarchs."
    },
    {
        "id": "L4Q005",
        "question": "Match the name to its meaning or the context of its naming.",
        "pairs": [
            { "left": "Isaac", "right": "Laughter" },
            { "left": "Ishmael", "right": "God hears" },
            { "left": "Babel", "right": "To confuse" },
            { "left": "Moab", "right": "From my father" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "These names were given based on the circumstances of the character's birth or the event's significance. Moab's origin is particularly tricky (Genesis 19:37)."
    },
    {
        "id": "L4Q006",
        "question": "Match the person to their less-common relative.",
        "pairs": [
            { "left": "Lot", "right": "Nephew of Abraham" },
            { "left": "Laban", "right": "Brother of Rebekah" },
            { "left": "Milcah", "right": "Wife of Nahor (Abraham's brother)" },
            { "left": "Bethuel", "right": "Father of Rebekah" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This tests knowledge of Abraham's extended family tree beyond the most immediate figures."
    },
    {
        "id": "L4Q007",
        "question": "Match the 'first' recorded accomplishment to the descendant of Cain.",
        "pairs": [
            { "left": "Cain", "right": "The first to build a city" },
            { "left": "Jubal", "right": "The first of all who play the lyre and pipe" },
            { "left": "Tubal-cain", "right": "The first forger of all instruments of bronze and iron" },
            { "left": "Lamech", "right": "The first man recorded as having two wives" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "These 'firsts' are listed in the genealogy of Cain in Genesis 4, showing the development of civilization."
    },
    {
        "id": "L4Q008",
        "question": "Match the character to the specific item of deception associated with their story.",
        "pairs": [
            { "left": "Rebekah", "right": "Goatskins on her son's hands and neck" },
            { "left": "Jacob's Sons", "right": "A coat dipped in a goat's blood" },
            { "left": "Rachel", "right": "Her father's stolen household idols (teraphim)" },
            { "left": "Tamar", "right": "A veil, hiding her identity from her father-in-law" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Deception is a recurring theme in Genesis. This matches the character to their specific method."
    },
    {
        "id": "L4Q009",
        "question": "Match the well to the event or meaning associated with it.",
        "pairs": [
            { "left": "Beer Lahai Roi", "right": "Where Hagar was found by an angel ('Well of the Living One who sees me')" },
            { "left": "Esek", "right": "A well of contention dug by Isaac's servants" },
            { "left": "Rehoboth", "right": "A well of 'room' or 'broad places' where there was no strife" },
            { "left": "Beersheba", "right": "A well of the oath sworn by Abraham and Abimelech" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "The naming of wells was significant. This requires knowing the specific stories behind the wells dug by the patriarchs in Genesis 21 and 26."
    },
    {
        "id": "L4Q010",
        "question": "Match the person to their age at a key life event.",
        "pairs": [
            { "left": "Noah", "right": "600 years old when the floodwaters came" },
            { "left": "Abraham", "right": "99 years old when God established the covenant of circumcision" },
            { "left": "Joseph", "right": "30 years old when he entered the service of Pharaoh" },
            { "left": "Isaac", "right": "60 years old when his twin sons were born" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Genesis provides specific ages for the patriarchs at major turning points in their lives."
    },
    {
        "id": "L4Q011",
        "question": "Match the person or people group to their ancestor from the Table of Nations (Genesis 10).",
        "pairs": [
            { "left": "Nimrod, the mighty hunter", "right": "Ham" },
            { "left": "The Hebrews (descendants of Eber)", "right": "Shem" },
            { "left": "The island peoples", "right": "Japheth" },
            { "left": "The Canaanites", "right": "Ham" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This matches figures and groups from Genesis 10 to their lineage from Noah's three sons."
    },
    {
        "id": "L4Q012",
        "question": "Match the woman to the son(s) she bore.",
        "pairs": [
            { "left": "Hagar", "right": "Ishmael" },
            { "left": "Keturah", "right": "Zimran, Jokshan, Medan, Midian, Ishbak, Shuah" },
            { "left": "Tamar", "right": "Perez and Zerah" },
            { "left": "Asenath", "right": "Manasseh and Ephraim" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "This tests knowledge of less-central female figures: Abraham's concubine (Keturah), Judah's daughter-in-law (Tamar), and Joseph's Egyptian wife (Asenath)."
    },
    {
        "id": "L4Q013",
        "question": "Match the divine name or title to the context in which it was revealed or used.",
        "pairs": [
            { "left": "El Shaddai (God Almighty)", "right": "When God made his covenant with 99-year-old Abram" },
            { "left": "Jehovah Jireh (The Lord Will Provide)", "right": "The name Abraham gave the place where he was about to sacrifice Isaac" },
            { "left": "El Roi (The God Who Sees)", "right": "The name Hagar used for God in the wilderness" },
            { "left": "Elohim", "right": "The name for God used in the first verse of the Bible" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "Different names and titles for God are used at specific moments in Genesis, each revealing something about His character or actions."
    },
    {
        "id": "L4Q014",
        "question": "Match the king to the patriarch he interacted with.",
        "pairs": [
            { "left": "Melchizedek of Salem", "right": "Abraham" },
            { "left": "Abimelech of Gerar", "right": "Isaac" },
            { "left": "Pharaoh who promoted Joseph", "right": "Jacob" },
            { "left": "Bera of Sodom", "right": "Abraham" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "This links the patriarchs to the various gentile kings and rulers they encountered. Both Abraham and Isaac met a king named Abimelech."
    },
    {
        "id": "L4Q015",
        "question": "Match the food to the story in which it played a key role.",
        "pairs": [
            { "left": "A red stew (pottage)", "right": "What Esau traded his birthright for" },
            { "left": "Mandrakes", "right": "What Rachel desired from Leah's son" },
            { "left": "Savory food made from goat", "right": "What Jacob served to a blind Isaac" },
            { "left": "Unleavened bread", "right": "What Lot served to his angelic guests" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Food is often central to the plot in Genesis stories. This requires knowing the specific food in each context."
    },
    {
        "id": "L4Q016",
        "question": "Match the part of God's judgment in Eden to the one who received it.",
        "pairs": [
            { "left": "Serpent", "right": "Cursed to crawl on its belly and eat dust" },
            { "left": "The Woman (Eve)", "right": "Pain in childbearing and desire for her husband" },
            { "left": "The Man (Adam)", "right": "Cursed is the ground; toil and sweat to eat from it" },
            { "left": "The Ground", "right": "Cursed to bring forth thorns and thistles" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Genesis 3 details the specific consequences for each participant in the first sin, including the ground itself."
    },
    {
        "id": "L4Q017",
        "question": "Match the brother of Joseph to his specific action or role in the story.",
        "pairs": [
            { "left": "Reuben", "right": "Intended to rescue Joseph from the pit but was too late" },
            { "left": "Judah", "right": "Suggested selling Joseph instead of killing him" },
            { "left": "Simeon", "right": "Was held as a prisoner in Egypt between the brothers' visits" },
            { "left": "Benjamin", "right": "The brother whose sack contained Joseph's silver cup" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "This distinguishes the specific roles Joseph's brothers played in the events of Genesis 37 and 42-44."
    },
    {
        "id": "L4Q018",
        "question": "Match the number to its significance in Genesis.",
        "pairs": [
            { "left": "150", "right": "The number of days the floodwaters prevailed on the earth" },
            { "left": "40", "right": "The number of days and nights it rained during the flood" },
            { "left": "20", "right": "The number of pieces of silver for which Joseph was sold" },
            { "left": "8", "right": "The number of people who were saved on the ark" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Numbers in Genesis are often precise and symbolic. This tests knowledge of these specific figures."
    },
    {
        "id": "L4Q019",
        "question": "Match the pledge item to the story of Judah and Tamar.",
        "pairs": [
            { "left": "Signet", "right": "An item Judah gave as a pledge for payment" },
            { "left": "Cord", "right": "An item Judah gave as a pledge for payment" },
            { "left": "Staff", "right": "An item Judah gave as a pledge for payment" },
            { "left": "A young goat", "right": "The promised payment Judah failed to deliver" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This question is tricky because three of the items are part of the same pledge. It tests detailed reading of Genesis 38."
    },
    {
        "id": "L4Q020",
        "question": "Match the dream to the dreamer in Genesis.",
        "pairs": [
            { "left": "A ladder to heaven with angels", "right": "Jacob" },
            { "left": "Sheaves of grain bowing down", "right": "Joseph" },
            { "left": "A vine with three branches squeezed into a cup", "right": "Pharaoh's Chief Butler" },
            { "left": "Seven fat cows consumed by seven lean cows", "right": "Pharaoh" }
        ],
        "category": "Genesis",
        "difficulty": "easy",
        "type": "matching",
        "explanation": "Dreams are a major theme in Genesis. This matches the famous dreams to the person who had them."
    },
    {
        "id": "L4Q021",
        "question": "Match the Hittite character to their role in the narrative.",
        "pairs": [
            { "left": "Ephron", "right": "Sold a field and cave to Abraham for a burial plot" },
            { "left": "Judith, daughter of Beeri", "right": "One of Esau's wives who made life bitter for Isaac and Rebekah" },
            { "left": "Basemath, daughter of Elon", "right": "One of Esau's wives who made life bitter for Isaac and Rebekah" },
            { "left": "The sons of Heth", "right": "The people group Abraham negotiated with to buy land" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "The Hittites are mentioned several times in Genesis, particularly in interactions with Abraham and Esau. This requires distinguishing them."
    },
    {
        "id": "L4Q022",
        "question": "Match the body part to its specific significance in a Genesis story.",
        "pairs": [
            { "left": "Rib", "right": "Taken from Adam to form Eve" },
            { "left": "Heel", "right": "What Jacob was grasping when he was born; prophesied to be bruised" },
            { "left": "Hip/Thigh", "right": "The part of Jacob that was touched and put out of joint" },
            { "left": "Right Hand", "right": "What Jacob deliberately placed on the younger son, Ephraim, to give the greater blessing" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "These body parts are mentioned at key moments and have symbolic importance in their respective narratives."
    },
    {
        "id": "L4Q023",
        "question": "Match the gift to the person who gave it.",
        "pairs": [
            { "left": "A coat of many colors", "right": "Jacob gave to Joseph" },
            { "left": "Gold nose ring and two bracelets", "right": "Abraham's servant gave to Rebekah" },
            { "left": "200 female goats and 20 male goats", "right": "Jacob gave to Esau" },
            { "left": "Fine linen garments and a gold chain", "right": "Pharaoh gave to Joseph" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Gift-giving was an important cultural practice. This matches the specific gifts to the givers and recipients in the stories."
    },
    {
        "id": "L4Q024",
        "question": "Match the material to its use in a Genesis construction.",
        "pairs": [
            { "left": "Gopher wood", "right": "The material God specified for building the ark" },
            { "left": "Pitch", "right": "Used to seal the ark inside and out" },
            { "left": "Brick", "right": "The man-made material used for the Tower of Babel instead of stone" },
            { "left": "Tar (slime)", "right": "The mortar used for the Tower of Babel" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This tests knowledge of the specific building materials mentioned for the two major construction projects in early Genesis."
    },
    {
        "id": "L4Q025",
        "question": "Match the person to the land they came from or are primarily associated with.",
        "pairs": [
            { "left": "Abraham", "right": "Ur of the Chaldees" },
            { "left": "Hagar", "right": "Egypt" },
            { "left": "Eliezer", "right": "Damascus" },
            { "left": "Melchizedek", "right": "Salem" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "This links key characters to their land of origin or the city they ruled, showing the geographic scope of Genesis."
    },
    {
        "id": "L4Q026",
        "question": "Match the phrase to the person who said it.",
        "pairs": [
            { "left": "'Am I my brother's keeper?'", "right": "Cain" },
            { "left": "'Here I am.'", "right": "Abraham (to God on Mt. Moriah)" },
            { "left": "'God will provide for himself the lamb.'", "right": "Abraham (to Isaac)" },
            { "left": "'You meant evil against me, but God meant it for good.'", "right": "Joseph" }
        ],
        "category": "Genesis",
        "difficulty": "easy",
        "type": "matching",
        "explanation": "These are some of the most famous and pivotal quotes from the book of Genesis."
    },
    {
        "id": "L4Q027",
        "question": "Match the person to their final resting place.",
        "pairs": [
            { "left": "Sarah", "right": "Cave of Machpelah in Hebron" },
            { "left": "Rachel", "right": "On the way to Ephrath (that is, Bethlehem)" },
            { "left": "Jacob", "right": "Cave of Machpelah in Hebron" },
            { "left": "Joseph", "right": "In a coffin in Egypt (bones later carried to Canaan)" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "The burial places of the patriarchs and matriarchs were highly significant. Rachel's separate burial is a key detail."
    },
    {
        "id": "L4Q028",
        "question": "Match the person to the non-human being they directly interacted with.",
        "pairs": [
            { "left": "Eve", "right": "A serpent" },
            { "left": "Hagar", "right": "An angel of the Lord (by a spring)" },
            { "left": "Abraham", "right": "Three visitors (two angels and the Lord)" },
            { "left": "Jacob", "right": "A 'man' he wrestled with until daybreak" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Genesis is filled with interactions between humans and supernatural or non-human beings."
    },
    {
        "id": "L4Q029",
        "question": "Match the description of the waters to the day of creation.",
        "pairs": [
            { "left": "The Spirit of God was hovering over the face of the waters", "right": "Before Day 1" },
            { "left": "The waters were separated by a firmament", "right": "Day 2" },
            { "left": "The waters were gathered into one place so dry land could appear", "right": "Day 3" },
            { "left": "The waters were commanded to teem with living creatures", "right": "Day 5" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This question tracks the specific role and state of 'the waters' throughout the creation week."
    },
    {
        "id": "L4Q030",
        "question": "Match the king of the 'cities of the plain' to his city (Genesis 14).",
        "pairs": [
            { "left": "Bera", "right": "Sodom" },
            { "left": "Birsha", "right": "Gomorrah" },
            { "left": "Shinab", "right": "Admah" },
            { "left": "Shemeber", "right": "Zeboiim" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This requires knowledge of the specific names of the kings who fought against Kedorlaomer in Genesis 14."
    },
    {
        "id": "L4Q031",
        "question": "Match the patriarch to his act of building an altar.",
        "pairs": [
            { "left": "Noah", "right": "Built the first altar mentioned after the flood and offered burnt offerings" },
            { "left": "Abraham", "right": "Built an altar at Shechem, the first in the promised land" },
            { "left": "Isaac", "right": "Built an altar at Beersheba after the Lord appeared to him" },
            { "left": "Jacob", "right": "Built an altar called El-Elohe-Israel at Shechem" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Altar building was a significant act of worship for all the patriarchs. This matches them to specific altars they built."
    },
    {
        "id": "L4Q032",
        "question": "Match the content of the sack to its owner on the return from Egypt.",
        "pairs": [
            { "left": "All brothers", "right": "The money for their grain returned on the first trip" },
            { "left": "Benjamin", "right": "The silver cup and the grain money" },
            { "left": "The other ten brothers", "right": "Only the grain money on the second trip" },
            { "left": "No one", "right": "The original grain they had brought from Canaan" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This tests detailed knowledge of what Joseph had placed in his brothers' sacks during their two separate visits."
    },
    {
        "id": "L4Q033",
        "question": "Match the woman with the father of her firstborn son.",
        "pairs": [
            { "left": "Sarah", "right": "Abraham" },
            { "left": "Leah", "right": "Jacob" },
            { "left": "Potiphar's Wife", "right": "Potiphar" },
            { "left": "Lot's older daughter", "right": "Lot" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "A tricky question mixing straightforward answers with the incestuous origin of Moab and the fact Potiphar's wife is not recorded as having a son with Joseph."
    },
    {
        "id": "L4Q034",
        "question": "Match the person to the sin or great mistake associated with them.",
        "pairs": [
            { "left": "Adam", "right": "Ate the forbidden fruit" },
            { "left": "Ham", "right": "Dishonored his father Noah" },
            { "left": "Reuben", "right": "Slept with his father's concubine, Bilhah" },
            { "left": "Lot's Wife", "right": "Looked back at Sodom" }
        ],
        "category": "Genesis",
        "difficulty": "easy",
        "type": "matching",
        "explanation": "This connects key figures in Genesis with the specific transgressions for which they are known."
    },
    {
        "id": "L4Q035",
        "question": "Match the blessing to the correct son of Joseph.",
        "pairs": [
            { "left": "Ephraim", "right": "Received the blessing of the firstborn despite being younger" },
            { "left": "Manasseh", "right": "Received the lesser blessing as the firstborn" },
            { "left": "Jacob's right hand", "right": "Was placed on Ephraim's head" },
            { "left": "Jacob's left hand", "right": "Was placed on Manasseh's head" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "The blessing of Joseph's sons in Genesis 48 is a key event where Jacob deliberately subverts the tradition of the firstborn."
    },
    {
        "id": "L4Q036",
        "question": "Match the feature of the ark to its specification.",
        "pairs": [
            { "left": "Length", "right": "300 cubits" },
            { "left": "Width", "right": "50 cubits" },
            { "left": "Height", "right": "30 cubits" },
            { "left": "Window/Roof", "right": "Finish it to a cubit from the top" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "God gave Noah very specific dimensions for building the ark, as recorded in Genesis 6."
    },
    {
        "id": "L4Q037",
        "question": "Match the patriarch to the foreign land where he lived for a time (not including Egypt).",
        "pairs": [
            { "left": "Abraham", "right": "Gerar" },
            { "left": "Isaac", "right": "Gerar" },
            { "left": "Jacob", "right": "Haran (Paddan Aram)" },
            { "left": "Lot", "right": "Zoar" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This is tricky because both Abraham and Isaac sojourned in Gerar, and Lot only briefly stayed in Zoar before moving to the mountains."
    },
    {
        "id": "L4Q038",
        "question": "Match the promise from God's covenant with Abraham to its description.",
        "pairs": [
            { "left": "Descendants", "right": "As numerous as the stars in the sky and the sand on the seashore" },
            { "left": "Land", "right": "From the river of Egypt to the great river, the Euphrates" },
            { "left": "Blessing", "right": "In you all the families of the earth shall be blessed" },
            { "left": "Sign of the covenant", "right": "Circumcision of every male" }
        ],
        "category": "Genesis",
        "difficulty": "easy",
        "type": "matching",
        "explanation": "This breaks down the Abrahamic Covenant into its key components as detailed throughout Genesis."
    },
    {
        "id": "L4Q039",
        "question": "Match the person to their action during the famine.",
        "pairs": [
            { "left": "Joseph", "right": "Sold grain to the nations and gathered all the money in Egypt" },
            { "left": "Pharaoh", "right": "Authorized Joseph to manage the crisis and save the land" },
            { "left": "Jacob", "right": "Sent his ten sons to Egypt to buy grain" },
            { "left": "The Egyptians", "right": "Sold their livestock and then their land for food" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "This matches the characters to their specific roles and actions during the seven-year famine."
    },
    {
        "id": "L4Q040",
        "question": "Match the person to the age he was when his first son (listed here) was born.",
        "pairs": [
            { "left": "Adam", "right": "130 years old (at the birth of Seth)" },
            { "left": "Shem", "right": "100 years old (at the birth of Arphaxad)" },
            { "left": "Terah", "right": "70 years old (when he began to have Abram, Nahor, and Haran)" },
            { "left": "Abraham", "right": "86 years old (at the birth of Ishmael)" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "The genealogies in Genesis 5 and 11 provide precise ages, requiring careful reading to match correctly."
    },
    {
        "id": "L4Q041",
        "question": "Match the woman to the description of her appearance or state.",
        "pairs": [
            { "left": "Sarah", "right": "Very beautiful, causing her husband to fear" },
            { "left": "Leah", "right": "Had weak or tender eyes" },
            { "left": "Rachel", "right": "Beautiful in form and appearance" },
            { "left": "Rebekah", "right": "Very attractive and a virgin" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Genesis provides brief but significant descriptions of the matriarchs, often contrasting them."
    },
    {
        "id": "L4Q042",
        "question": "Match the animal Noah sent from the ark to its action.",
        "pairs": [
            { "left": "Raven", "right": "Flew to and fro until the waters were dried up" },
            { "left": "Dove (first time)", "right": "Returned after finding no place to rest its foot" },
            { "left": "Dove (second time)", "right": "Returned with a freshly plucked olive leaf" },
            { "left": "Dove (third time)", "right": "Did not return again" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "The story of Noah sending out birds in Genesis 8 involves multiple attempts with different outcomes."
    },
    {
        "id": "L4Q043",
        "question": "Match the patriarch to his primary occupation.",
        "pairs": [
            { "left": "Abel", "right": "Keeper of sheep" },
            { "left": "Cain", "right": "Tiller of the ground" },
            { "left": "Esau", "right": "A skillful hunter" },
            { "left": "Jacob", "right": "A plain man, dwelling in tents (and keeping flocks)" }
        ],
        "category": "Genesis",
        "difficulty": "easy",
        "type": "matching",
        "explanation": "The occupations of the early figures in Genesis often define their character and the conflicts they face."
    },
    {
        "id": "L4Q044",
        "question": "Match the description to the correct person named Lamech.",
        "pairs": [
            { "left": "Descendant of Cain", "right": "Boasted to his two wives of killing a man" },
            { "left": "Descendant of Seth", "right": "Father of Noah" },
            { "left": "Had wives named Adah and Zillah", "right": "Descendant of Cain" },
            { "left": "Lived 777 years", "right": "Descendant of Seth" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "This is very tricky as there are two different men named Lamech in the genealogies of Genesis 4 and 5, with very different stories."
    },
    {
        "id": "L4Q045",
        "question": "Match the term to the group it describes.",
        "pairs": [
            { "left": "Nephilim", "right": "'The mighty men who were of old, the men of renown'" },
            { "left": "Sons of God", "right": "Beings who took the daughters of man as wives" },
            { "left": "Cherubim", "right": "Beings with a flaming sword who guarded the way to the Tree of Life" },
            { "left": "Ishmaelites", "right": "The merchant caravan that bought Joseph" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Genesis mentions several distinct and sometimes mysterious groups of beings."
    },
    {
        "id": "L4Q046",
        "question": "Match the person to the lie they told.",
        "pairs": [
            { "left": "The Serpent", "right": "'You will not surely die.'" },
            { "left": "Abraham", "right": "'She is my sister.'" },
            { "left": "Sarah", "right": "'I did not laugh.'" },
            { "left": "Jacob", "right": "'I am Esau your firstborn.'" }
        ],
        "category": "Genesis",
        "difficulty": "easy",
        "type": "matching",
        "explanation": "This matches characters to famous falsehoods they uttered at critical moments in their stories."
    },
    {
        "id": "L4Q047",
        "question": "Match the clothing item to its role in a Genesis story.",
        "pairs": [
            { "left": "Garments of skin", "right": "What God made to cover Adam and Eve" },
            { "left": "Esau's best garments", "right": "Worn by Jacob to deceive his father Isaac" },
            { "left": "Joseph's outer garment", "right": "Left in the hand of Potiphar's wife as she tried to seduce him" },
            { "left": "Sackcloth", "right": "Worn by Jacob when he mourned for Joseph" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "Clothing is often symbolic or serves as a key plot device in the narratives of Genesis."
    },
    {
        "id": "L4Q048",
        "question": "Match the event to the patriarch's immediate response.",
        "pairs": [
            { "left": "God calls Abram to leave his country", "right": "He went, as the Lord had told him" },
            { "left": "God tells Abraham he will have a son by Sarah", "right": "He fell on his face and laughed" },
            { "left": "Jacob sees Esau coming with 400 men", "right": "He divided his children, wives, and flocks into two groups" },
            { "left": "Joseph's brothers reveal they are alive", "right": "He wept so loudly that the Egyptians heard it" }
        ],
        "category": "Genesis",
        "difficulty": "medium",
        "type": "matching",
        "explanation": "The immediate reactions of the characters to pivotal news reveal their faith, fear, and emotions."
    },
    {
        "id": "L4Q049",
        "question": "Match the tree to its significance in the Garden of Eden.",
        "pairs": [
            { "left": "Tree of the Knowledge of Good and Evil", "right": "The one tree from which Adam and Eve were forbidden to eat" },
            { "left": "Tree of Life", "right": "Access to this was blocked after the Fall to prevent eternal life in a sinful state" },
            { "left": "Fig Tree", "right": "Its leaves were used to make coverings after the Fall" },
            { "left": "Every tree that is pleasant to the sight and good for food", "right": "Freely given by God for man to eat" }
        ],
        "category": "Genesis",
        "difficulty": "easy",
        "type": "matching",
        "explanation": "This distinguishes the roles of the different types of trees mentioned in the Garden of Eden narrative (Genesis 2-3)."
    },
    {
        "id": "L4Q050",
        "question": "Match the person to the one they blessed.",
        "pairs": [
            { "left": "Noah", "right": "Shem and Japheth" },
            { "left": "Melchizedek", "right": "Abram" },
            { "left": "Isaac", "right": "Jacob (and later, Esau)" },
            { "left": "Jacob", "right": "Pharaoh" }
        ],
        "category": "Genesis",
        "difficulty": "hard",
        "type": "matching",
        "explanation": "Blessings are a major theme. This is tricky because it includes the unusual event of Jacob, a shepherd from Canaan, blessing the mighty Pharaoh of Egypt (Genesis 47:7)."
    }
];