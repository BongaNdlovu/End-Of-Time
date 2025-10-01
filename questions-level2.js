/**
 * Level 2: True or False Questions
 * Binary true/false format
 * Focus: Biblical facts and statements
 */

const level2Questions = [
    {
        "id": "L2Q001",
        "question": "True or False: The Bible identifies the forbidden fruit eaten by Adam and Eve as an apple.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "The Fall",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Genesis 3 simply refers to it as 'the fruit of the tree which is in the midst of the garden.' The specific type of fruit is not mentioned."
    },
    {
        "id": "L2Q002",
        "question": "True or False: Adam and Eve's only children were Cain and Abel.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Genesis 5:4 states that after Seth was born, Adam lived 800 years and 'had sons and daughters.'"
    },
    {
        "id": "L2Q003",
        "question": "True or False: The first bird Noah sent out from the ark was a dove.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "The Flood",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Genesis 8:7 says Noah first sent out a raven, which flew back and forth until the waters had dried."
    },
    {
        "id": "L2Q004",
        "question": "True or False: Noah took exactly two of every kind of animal onto the ark.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "The Flood",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "Genesis 7:2 specifies that Noah was to take seven pairs of every 'clean' animal and birds, but only one pair of every 'unclean' animal."
    },
    {
        "id": "L2Q005",
        "question": "True or False: On the day of creation, God created the sun before He created light.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Creation",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "God created light on the first day (Genesis 1:3), but He created the sun, moon, and stars on the fourth day (Genesis 1:14-16)."
    },
    {
        "id": "L2Q006",
        "question": "True or False: Jacob worked for Laban for seven years and then immediately married Rachel, his first wife.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "After seven years, Laban tricked Jacob into marrying Leah, his older daughter. Jacob then had to work another seven years for Rachel (Genesis 29:21-28)."
    },
    {
        "id": "L2Q007",
        "question": "True or False: Lot was Abraham's son.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "easy",
        "type": "true_false",
        "explanation": "Lot was Abraham's nephew, the son of his brother Haran (Genesis 12:5)."
    },
    {
        "id": "L2Q008",
        "question": "True or False: Jacob's name was changed to Israel before he met his brother Esau on his return to Canaan.",
        "options": [
            "True",
            "False"
        ],
        "answer": "True",
        "category": "People",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "Jacob wrestled with the angel and had his name changed to Israel the night before he was scheduled to meet Esau (Genesis 32:24-30)."
    },
    {
        "id": "L2Q009",
        "question": "True or False: The Tower of Babel was destroyed by God with fire from heaven.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Events",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "God did not destroy the tower. He stopped its construction by confusing the languages of the people, causing them to scatter (Genesis 11:7-8)."
    },
    {
        "id": "L2Q010",
        "question": "True or False: Abraham paid a tithe of ten percent to the wicked king of Sodom after rescuing him.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "Abraham gave a tenth of the spoils to Melchizedek, king of Salem and priest of God Most High. He refused to take any reward from the king of Sodom (Genesis 14:18-23)."
    },
    {
        "id": "L2Q011",
        "question": "True or False: When Joseph's brothers first came to Egypt, he immediately and joyfully revealed his identity to them.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Joseph concealed his identity, accused them of being spies, and put them through a series of tests over two visits before revealing himself (Genesis 42-44)."
    },
    {
        "id": "L2Q012",
        "question": "True or False: Jacob was buried in Egypt, where he died.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Before he died, Jacob made Joseph swear to carry his body out of Egypt and bury him in the family tomb in the cave of Machpelah in Canaan (Genesis 49:29-30, 50:13)."
    },
    {
        "id": "L2Q013",
        "question": "True or False: God created land animals and sea creatures on the same day.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Creation",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "God created sea creatures and birds on the fifth day (Genesis 1:21) and land animals on the sixth day (Genesis 1:24)."
    },
    {
        "id": "L2Q014",
        "question": "True or False: Rebekah gave birth to Jacob first, and then Esau.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "easy",
        "type": "true_false",
        "explanation": "Esau was born first, and Jacob came out second, grasping his brother's heel (Genesis 25:25-26)."
    },
    {
        "id": "L2Q015",
        "question": "True or False: Joseph was put in prison with Pharaoh's chief baker and chief guard.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "He was imprisoned with Pharaoh's chief cupbearer (or butler) and chief baker (Genesis 40:1-3)."
    },
    {
        "id": "L2Q016",
        "question": "True or False: All twelve of Jacob's sons were born in Haran, before he returned to Canaan.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "Benjamin, the youngest son, was born in the land of Canaan, near Bethlehem, during which his mother Rachel died (Genesis 35:16-18)."
    },
    {
        "id": "L2Q017",
        "question": "True or False: Sarah was 70 years old when she gave birth to Isaac.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Sarah was 90 years old when Isaac was born (Genesis 17:17, 21:5)."
    },
    {
        "id": "L2Q018",
        "question": "True or False: The covenant of circumcision was given to Abraham after the birth of his son, Isaac.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Covenants",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "The covenant of circumcision was established in Genesis 17, before Isaac was conceived. Abraham was 99 and Ishmael was 13 when they were circumcised."
    },
    {
        "id": "L2Q019",
        "question": "True or False: Jacob's favorite wife, Rachel, gave him his firstborn son, Reuben.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Leah, Jacob's first wife, gave birth to his firstborn, Reuben. Rachel was barren for many years (Genesis 29:31-32)."
    },
    {
        "id": "L2Q020",
        "question": "True or False: The rainbow was created for the first time as the sign of God's covenant with Noah.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "The Flood",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "The wording in Genesis 9:13, 'I have set my bow in the cloud,' suggests the rainbow already existed as a natural phenomenon. God gave it a new meaning as a sign of His covenant."
    },
    {
        "id": "L2Q021",
        "question": "True or False: Enoch, the man who 'walked with God,' was Noah's father.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Enoch was Noah's great-grandfather. Enoch's son was Methuselah, and Methuselah's son was Lamech, who was Noah's father (Genesis 5)."
    },
    {
        "id": "L2Q022",
        "question": "True or False: Pharaoh gave Joseph a wife who was the daughter of an Egyptian priest.",
        "options": [
            "True",
            "False"
        ],
        "answer": "True",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Genesis 41:45 states, 'And Pharaoh... gave him to wife Asenath the daughter of Potipherah priest of On.'"
    },
    {
        "id": "L2Q023",
        "question": "True or False: When fleeing from a famine, Abraham told the Egyptian Pharaoh that Sarah was his cousin.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Abraham told Pharaoh that Sarah was his sister (Genesis 12:13, 19). While she was technically his half-sister, he did not call her his cousin."
    },
    {
        "id": "L2Q024",
        "question": "True or False: Cain was a shepherd and Abel was a farmer.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "easy",
        "type": "true_false",
        "explanation": "It was the other way around. Genesis 4:2 says, 'Abel was a keeper of sheep, but Cain was a tiller of the ground.'"
    },
    {
        "id": "L2Q025",
        "question": "True or False: After selling Joseph, his brothers immediately regretted their decision and went to Egypt to find him.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Events",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "They deceived their father and did not see Joseph again until they were forced to go to Egypt for food during a famine many years later (Genesis 37 and 42)."
    },
    {
        "id": "L2Q026",
        "question": "True or False: God commanded Adam and Eve not to touch the fruit of the tree of knowledge.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "The Fall",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "God's original command to Adam was 'you shall not eat' (Genesis 2:17). It was Eve who added 'neither shall ye touch it' when speaking to the serpent (Genesis 3:3)."
    },
    {
        "id": "L2Q027",
        "question": "True or False: The ark came to rest on Mount Sinai after the flood.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "The Flood",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Genesis 8:4 states that the ark came to rest 'upon the mountains of Ararat.'"
    },
    {
        "id": "L2Q028",
        "question": "True or False: Laban was Rebekah's father.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Laban was Rebekah's brother. Her father was Bethuel (Genesis 24:29, 50)."
    },
    {
        "id": "L2Q029",
        "question": "True or False: The blessing Jacob stole from Esau was rightfully his because Esau had already sold him the birthright.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Events",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "The birthright and the father's blessing were two separate things. While Esau sold his birthright (inheritance rights), the paternal blessing was to be given by Isaac and was stolen by Jacob through deception."
    },
    {
        "id": "L2Q030",
        "question": "True or False: Joseph's silver cup was found in the sack of Reuben, the eldest brother.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Events",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Joseph instructed that the cup be placed in the sack of the youngest brother, Benjamin (Genesis 44:12)."
    },
    {
        "id": "L2Q031",
        "question": "True or False: Both Abraham and Isaac passed their wives off as their sisters to foreign kings.",
        "options": [
            "True",
            "False"
        ],
        "answer": "True",
        "category": "Events",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "Abraham did it twice with Sarah (Genesis 12 and 20), and Isaac did it with Rebekah (Genesis 26). Both feared being killed for their beautiful wives."
    },
    {
        "id": "L2Q032",
        "question": "True or False: The serpent was the only animal that could speak in the Garden of Eden.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "The Fall",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "The Bible does not state this. The serpent is the only animal recorded as speaking, but there is no information to confirm it was the *only* one that could."
    },
    {
        "id": "L2Q033",
        "question": "True or False: Melchizedek, king of Salem, was one of Pharaoh's priests.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Melchizedek was the king of Salem (Jerusalem) and a 'priest of the most high God.' He met Abraham in Canaan, not Egypt (Genesis 14:18)."
    },
    {
        "id": "L2Q034",
        "question": "True or False: Jacob showed his favoritism for Joseph's sons, Manasseh and Ephraim, by giving the greater blessing to the younger son, Ephraim.",
        "options": [
            "True",
            "False"
        ],
        "answer": "True",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Jacob intentionally crossed his hands to place his right hand on Ephraim (the younger) and his left hand on Manasseh (the firstborn), giving the greater blessing to the younger son (Genesis 48:14-19)."
    },
    {
        "id": "L2Q035",
        "question": "True or False: God regretted creating humanity before the flood because they were lazy and unproductive.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "The Flood",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Genesis 6:5-6 states God saw 'that the wickedness of man was great in the earth' and that 'every imagination of the thoughts of his heart was only evil continually.' It was their wickedness, not laziness."
    },
    {
        "id": "L2Q036",
        "question": "True or False: Adam named all the animals, including the fish of the sea.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Creation",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "Genesis 2:19-20 specifies that God brought 'every beast of the field, and every fowl of the air' to Adam to be named. It does not mention sea creatures."
    },
    {
        "id": "L2Q037",
        "question": "True or False: In Pharaoh's dream, the seven thin cows ate the seven fat cows.",
        "options": [
            "True",
            "False"
        ],
        "answer": "True",
        "category": "Events",
        "difficulty": "easy",
        "type": "true_false",
        "explanation": "Genesis 41:4 describes the dream where 'the ill favoured and leanfleshed kine did eat up the seven well favoured and fat kine.'"
    },
    {
        "id": "L2Q038",
        "question": "True or False: Abraham bargained with God to spare Sodom if as few as five righteous people could be found there.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Events",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Abraham bargained with God, starting at 50 righteous people and ending at 10. He did not go as low as five (Genesis 18:23-32)."
    },
    {
        "id": "L2Q039",
        "question": "True or False: Esau became a peaceful farmer while Jacob became a skillful hunter.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "easy",
        "type": "true_false",
        "explanation": "The roles were reversed. Genesis 25:27 says, 'Esau was a cunning hunter, a man of the field; and Jacob was a plain man, dwelling in tents.'"
    },
    {
        "id": "L2Q040",
        "question": "True or False: After being cast out, Hagar and Ishmael died of thirst in the wilderness.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "God heard Ishmael's cry, and an angel showed Hagar a well of water, saving them. Ishmael grew up to become an archer (Genesis 21:17-20)."
    },
    {
        "id": "L2Q041",
        "question": "True or False: One of the four rivers flowing from the Garden of Eden was the Nile.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Places",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "The four rivers mentioned are Pison, Gihon, Hiddekel (Tigris), and Euphrates (Genesis 2:10-14)."
    },
    {
        "id": "L2Q042",
        "question": "True or False: Before offering Isaac, Abraham sacrificed a lamb that he brought with him from home.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Events",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Abraham told Isaac that 'God will provide himself a lamb.' After God stopped him from sacrificing Isaac, Abraham saw a ram caught in a thicket, which he then sacrificed instead (Genesis 22:8, 13)."
    },
    {
        "id": "L2Q043",
        "question": "True or False: The two angels who visited Sodom were killed by the wicked men of the city.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Events",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "The angels struck the men of the city with blindness and then led Lot and his family out before the city was destroyed (Genesis 19:11-16)."
    },
    {
        "id": "L2Q044",
        "question": "True or False: God's command to humanity in Genesis 1 was to 'be fruitful, and multiply, and subdue the earth'.",
        "options": [
            "True",
            "False"
        ],
        "answer": "True",
        "category": "Creation",
        "difficulty": "easy",
        "type": "true_false",
        "explanation": "This command is explicitly stated in Genesis 1:28, giving humanity dominion over creation."
    },
    {
        "id": "L2Q045",
        "question": "True or False: Dinah was the only daughter of Jacob mentioned by name in Genesis.",
        "options": [
            "True",
            "False"
        ],
        "answer": "True",
        "category": "People",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "Dinah, the daughter of Leah, is the only one of Jacob's daughters named and featured in a narrative (Genesis 34). While Genesis 46:7 mentions 'his daughters,' they are not named."
    },
    {
        "id": "L2Q046",
        "question": "True or False: Judah, Jacob's son, sold Joseph into slavery all by himself.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "It was Judah who suggested selling Joseph rather than killing him, and his brothers agreed and carried out the act together (Genesis 37:26-28)."
    },
    {
        "id": "L2Q047",
        "question": "True or False: After being expelled from the garden, Adam and Eve were guarded by an angel with a flaming sword to prevent them from eating from the tree of life.",
        "options": [
            "True",
            "False"
        ],
        "answer": "True",
        "category": "The Fall",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Genesis 3:24 states God placed 'Cherubims, and a flaming sword which turned every way, to keep the way of the tree of life.'"
    },
    {
        "id": "L2Q048",
        "question": "True or False: Jacob loved Leah more than Rachel.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "easy",
        "type": "true_false",
        "explanation": "Genesis 29:30 explicitly states that Jacob 'loved also Rachel more than Leah.'"
    },
    {
        "id": "L2Q049",
        "question": "True or False: Joseph's two sons were born after his family moved to Egypt.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "People",
        "difficulty": "hard",
        "type": "true_false",
        "explanation": "Joseph's sons, Manasseh and Ephraim, were born to him in Egypt before the seven years of famine began and before his family arrived (Genesis 41:50-52)."
    },
    {
        "id": "L2Q050",
        "question": "True or False: The book of Genesis covers the time period from Creation until the Israelites enter the promised land.",
        "options": [
            "True",
            "False"
        ],
        "answer": "False",
        "category": "Book Overview",
        "difficulty": "medium",
        "type": "true_false",
        "explanation": "Genesis ends with the death of Joseph in Egypt. The story of the Israelites' exodus from Egypt and their journey to the promised land begins in the book of Exodus."
    }
];