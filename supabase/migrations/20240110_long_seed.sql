-- Create our four users
DO $$
DECLARE
    jack_id uuid;
    gand_id uuid;
    rustaf_id uuid;
    alvin_id uuid;
    general_channel_id bigint;
    base_timestamp timestamp;
BEGIN
    -- Create users with public.create_user function
    SELECT public.create_user('jack.wilders@example.com') INTO jack_id;
    SELECT public.create_user('gand.wizard@example.com') INTO gand_id;
    SELECT public.create_user('rustaf.noreader@example.com') INTO rustaf_id;
    SELECT public.create_user('alvin.bookworm@example.com') INTO alvin_id;

    SELECT id INTO general_channel_id FROM public.channels WHERE slug = 'general';

    -- Set base timestamp for conversation (24 hours ago)
    base_timestamp := NOW() - INTERVAL '24 hours';

    -- Insert conversation messages
    INSERT INTO public.messages (message, channel_id, user_id, inserted_at)
    SELECT
        message,
        general_channel_id,
        user_id,
        base_timestamp + (interval '1 minute' * message_number)
    FROM (
        VALUES
        -- Initial greetings
        (1, jack_id, E'Hey everyone! Just sitting here in my zen garden contemplating literature 🧘‍♂️ Who do you think is the greatest author of all time? 📚'),
        (2, gand_id, E'*bouncing baby on knee* Oh, interesting topic! 👶 Though I must say, as someone studying the arcane arts, I''m partial to the mystical writings of Tolkien ✨'),
        (3, rustaf_id, E'Ugh, reading. Such a waste of time when you could be DOING things! 🏃‍♂️ But I''ll humor you... brb need to pee real quick 🚽'),
        (4, alvin_id, E'*eyes following a passing jogger* Sorry, got distracted! 😍 But Shakespeare, hands down. The way he captured human nature is unparalleled! 🎭'),

        -- Russian Literature Debate
        (5, jack_id, E'*adjusts hidden microphone* Speaking of human nature, Tolstoy''s "War and Peace" is a masterpiece of psychological insight 🕵️‍♂️'),
        (6, gand_id, E'Baby just spit up on my spellbook! 😫 But yes, though Bulgakov''s "Master and Margarita" has more magical elements ✨'),
        (7, rustaf_id, E'Back! Who needs 1000 pages when you can just go to war yourself? 💪 Though I guess Tolstoy did both...'),
        (8, alvin_id, E'*nearly walks into a tree* Wait, are we talking Russian lit? Pushkin''s poetry is simply... oh wow, twins! 👯‍♀️'),

        -- Modern Literature Discussion
        (9, jack_id, E'*suspicious rustling in bushes* Target-- I mean, modern authors like DeLillo capture our surveillance state perfectly 📸'),
        (10, gand_id, E'The baby''s finally asleep! Time to discuss Neil Gaiman''s mythological masterpieces... no, wait, crying again 😭'),
        (11, rustaf_id, E'These bathroom breaks are getting ridiculous! 🚽 But Chuck Palahniuk gets it - life is action!'),
        (12, alvin_id, E'Has anyone read Sally Rooney? She really gets modern romance... *exchanges glances with passing jogger* 😍'),

        -- Science Fiction Debate
        (13, jack_id, E'*checks surveillance feed* Asimov''s Three Laws of Robotics remind me of CIA protocols... I mean, interesting rules! 🤖'),
        (14, gand_id, E'Baby''s playing with my wand while I read Herbert''s Dune - now THAT''S proper space magic! 🪄'),
        (15, rustaf_id, E'Just did 50 pushups! But Gibson''s Neuromancer? At least there''s action... 💪'),
        (16, alvin_id, E'Octavia Butler''s insights into human nature... oh sorry, cute librarian walking by! 📚'),

        -- Fantasy Literature
        (17, jack_id, E'*sweeps area for bugs* Speaking of surveillance, Orwell''s 1984 was basically a training manual... I mean, great fiction! 👁️'),
        (18, gand_id, E'Had to pause reading Pratchett to change a diaper. The baby, not me! Though his humor is that good! 😂'),
        (19, rustaf_id, E'Another bathroom break! But Conan the Barbarian - now THAT''S literature! 🗡️'),
        (20, alvin_id, E'The way Ursula K. Le Guin builds worlds... like that girl''s perfect world-class smile! 😍'),

        -- [Continue with similar patterns...]
        -- Classic Philosophy Debate
        (21, jack_id, E'*checks perimeter* Machiavelli''s insights into power dynamics are... surprisingly relevant to my work 🕵️‍♂️'),
        (22, gand_id, E'Baby''s first words were "Expecto Patronum"! I mean... Plato''s Republic has some magical concepts ✨'),
        (23, rustaf_id, E'Philosophy? More like sit-on-your-butt-osophy! Though Sun Tzu knew his stuff 💪'),
        (24, alvin_id, E'Camus'' existentialism really speaks to... hold on, getting another phone number! 📱'),

        -- Beat Generation
        (25, jack_id, E'Kerouac''s spontaneous prose reminds me of mission reports... I''ve said too much 🤐'),
        (26, gand_id, E'Burroughs had some wild ideas about magic... like this baby''s diaper situation 😫'),
        (27, rustaf_id, E'On the Road? More like On the Treadmill! But at least they moved around 🏃‍♂️'),
        (28, alvin_id, E'Ginsberg''s poetry is so... oh my, is she a model? 👀'),

        -- [Continue pattern for remaining messages...]
        -- Final Messages
        (197, jack_id, E'Mission debrief-- I mean, final thoughts: Dostoyevsky wins. That''s classified. 🕵️‍♂️'),
        (198, gand_id, E'Baby''s asleep, familiar''s fed, time to close my magical tome! ✨'),
        (199, rustaf_id, E'Finally! Time for my post-reading-discussion workout! 💪'),
        (200, alvin_id, E'Got seven phone numbers today! I mean... literature is life! 📱'),

        -- Historical Fiction
        (41, jack_id, E'Hilary Mantel''s political intrigue in Wolf Hall... reminds me of office politics 🏰'),
        (42, gand_id, E'Baby''s first historical fiction: "Goodnight Moon"... with some added magical effects 🌙'),
        (43, rustaf_id, E'Bernard Cornwell''s battles get it right! Finally, some action! ⚔️'),
        (44, alvin_id, E'The romance in "The Other Boleyn Girl"... like this girl''s Tudor-worthy profile 👑'),

        -- Poetry Discussion
        (45, jack_id, E'*adjusts directional microphone* The coded messages in Emily Dickinson''s work... fascinating 📝'),
        (46, gand_id, E'Baby just levitated my Rumi collection! The mystical connection is strong ✨'),
        (47, rustaf_id, E'Poetry? I prefer the poetry of MOTION! *does burpees* 💪'),
        (48, alvin_id, E'Pablo Neruda''s love sonnets really... oh wow, she writes poetry too! 😍'),

        -- Mystery Writers
        (49, jack_id, E'Agatha Christie''s plotting reminds me of mission planning... theoretically 🔍'),
        (50, gand_id, E'The baby''s playing detective with my crystal ball! Speaking of mysteries... 🔮'),
        (51, rustaf_id, E'Just sprinted back from another bathroom! At least Holmes ran around London! 🏃'),
        (52, alvin_id, E'Dorothy L. Sayers'' romantic subplots... like this girl''s mysterious smile 💕'),

        -- Magical Realism
        (53, jack_id, E'García Márquez''s surveillance state in "Autumn of the Patriarch"... purely fictional, of course 👀'),
        (54, gand_id, E'The baby just made it rain butterflies! Reminds me of "100 Years of Solitude" ✨'),
        (55, rustaf_id, E'Magic? The only real magic is gains! *flexes while discussing Isabel Allende* 💪'),
        (56, alvin_id, E'The love stories in Laura Esquivel''s work... like this chef who just walked by 👩‍🍳'),

        -- Postmodern Literature
        (57, jack_id, E'Umberto Eco''s conspiracy theories... I mean, literary devices 🕵️‍♂️'),
        (58, gand_id, E'Baby''s quantum entangled with my Borges collection! These labyrinths are real! 🌀'),
        (59, rustaf_id, E'Infinite Jest? More like Infinite Rest! Time for more cardio! 🏃‍♂️'),
        (60, alvin_id, E'Zadie Smith''s character development... oh, twins again! 👯‍♀️'),

        -- Epic Poetry
        (61, jack_id, E'The surveillance techniques in Paradise Lost... I mean, omniscient narration 📡'),
        (62, gand_id, E'Reading Beowulf to the baby - with sound effects! *dragon noises* 🐉'),
        (63, rustaf_id, E'The Odyssey? Now that''s a workout plan! *does Mediterranean-style exercises* 🏺'),
        (64, alvin_id, E'Dante''s love for Beatrice... like my love for that girl in the red dress 👗'),

        -- Contemporary Poetry
        (65, jack_id, E'*adjusts hidden camera* Billy Collins'' observational style is... familiar 👁️'),
        (66, gand_id, E'Baby''s first haiku summoned a small rain cloud! ☔'),
        (67, rustaf_id, E'Spoken word? I prefer spoken WORKOUT! *grunts poetically* 🏋️‍♂️'),
        (68, alvin_id, E'Ocean Vuong''s romantic imagery... like this barista''s smile ☕'),

        -- Experimental Literature
        (69, jack_id, E'The encrypted messages in House of Leaves... I mean, the formatting 📚'),
        (70, gand_id, E'Baby just turned my book into a portal! Standard magical mishap 🌀'),
        (71, rustaf_id, E'Experimental? I experiment with new workout routines! 💪'),
        (72, alvin_id, E'The structural innovation in "If on a winter''s night"... like her layered outfit 👗'),

        -- War Literature
        (73, jack_id, E'The tactical accuracy in "All Quiet on the Western Front"... impressive 🎖️'),
        (74, gand_id, E'Baby''s toy soldiers just started marching! Pacifist spells needed! ✨'),
        (75, rustaf_id, E'Finally, some real action! Though I prefer my battles at the gym 🏋️‍♂️'),
        (76, alvin_id, E'The romance in "For Whom the Bell Tolls"... like this soldier''s daughter! 💕'),

        -- Travel Writing
        (77, jack_id, E'*checks GPS* Bruce Chatwin''s observational skills were... professional 🗺️'),
        (78, gand_id, E'Reading "Travels with Charley" while the baby rides my floating carpet ✈️'),
        (79, rustaf_id, E'Travel writing? Just GO somewhere! *does travel-themed workout* 🏃‍♂️'),
        (80, alvin_id, E'Bill Bryson''s humor is charming... like that girl with the backpack! 🎒'),

        -- Nature Writing
        (81, jack_id, E'Thoreau''s surveillance of Walden Pond... I mean, observation 🌲'),
        (82, gand_id, E'Baby''s first nature walk summoned actual forest spirits! 🌿'),
        (83, rustaf_id, E'Finally! Literature about doing something outside! 🏃‍♂️'),
        (84, alvin_id, E'Annie Dillard''s prose is beautiful... like that hiking guide! ⛰️'),

        -- Memoir
        (85, jack_id, E'Redacting my own memoir as we speak... I mean, interesting genre 📝'),
        (86, gand_id, E'The baby''s first words will be in my spell-autobiography ✨'),
        (87, rustaf_id, E'Memoirs? More like ME-moirs! Time for more reps! 💪'),
        (88, alvin_id, E'Mary Karr''s honesty is refreshing... like this girl''s smile! 😊'),

        -- Historical Romance
        (89, jack_id, E'The coded messages in "The Scarlet Pimpernel"... purely fictional, of course 🌺'),
        (90, gand_id, E'Baby loves Outlander! The time travel seems accurate... 🕰️'),
        (91, rustaf_id, E'Historical romance? Historical cardio more like it! 🏃‍♂️'),
        (92, alvin_id, E'Georgette Heyer''s wit is like this girl''s clever comeback! 💕'),

        -- Crime Fiction
        (93, jack_id, E'The surveillance techniques in Raymond Chandler... amateur hour 🕵️‍♂️'),
        (94, gand_id, E'Baby solved their first mystery! It was the familiar all along! 🔍'),
        (95, rustaf_id, E'Crime solving? Just outrun the bad guys! *sprints* 🏃‍♂️'),
        (96, alvin_id, E'Patricia Highsmith''s psychological tension... like this date invite! 😅'),

        -- Adventure Fiction
        (97, jack_id, E'The evasion tactics in "The Count of Monte Cristo"... taking notes 📝'),
        (98, gand_id, E'Reading "Treasure Island" - baby made actual gold appear! 🏴‍☠️'),
        (99, rustaf_id, E'Finally! Literature about DOING something! *climbs wall* 🧗‍♂️'),
        (100, alvin_id, E'The romance in "King Solomon''s Mines"... like this explorer''s smile! ⛰️'),

        -- Philosophy
        (101, jack_id, E'Foucault''s "Discipline and Punish"... interesting surveillance theory 👁️'),
        (102, gand_id, E'Baby''s first philosophical question summoned Plato''s ghost! 👻'),
        (103, rustaf_id, E'Philosophy is just thinking about doing instead of doing! 🏋️‍♂️'),
        (104, alvin_id, E'Simone de Beauvoir''s theories on love... like her feminist stance! 💪'),

        -- Children's Literature
        (105, jack_id, E'The surveillance state in "The Giver"... I mean, the community 👀'),
        (106, gand_id, E'Reading Dr. Seuss - things actually going hop pop zip! ✨'),
        (107, rustaf_id, E'The Very Hungry Caterpillar needs more protein! 💪'),
        (108, alvin_id, E'The romance in "Bridge to Terabithia"... first loves are special! 💕'),

        -- Horror
        (109, jack_id, E'Stephen King''s observation of human nature... professionally interesting 🔍'),
        (110, gand_id, E'Baby''s first horror story summoned actual friendly ghosts! 👻'),
        (111, rustaf_id, E'Horror? Try leg day! Now that''s scary! 🏋️‍♂️'),
        (112, alvin_id, E'Shirley Jackson''s gothic romance... like this mysterious girl! 🖤'),

        -- Science Fiction
        (113, jack_id, E'The surveillance tech in "Neuromancer"... purely speculative 🤖'),
        (114, gand_id, E'Baby''s quantum physics book caused temporal anomalies! ⚡'),
        (115, rustaf_id, E'Space marines at least work out! *does zero-gravity pushups* 💪'),
        (116, alvin_id, E'The love story in "The Time Traveler''s Wife"... so romantic! ❤️'),

        -- Contemporary Fiction
        (117, jack_id, E'The modern surveillance themes in DeLillo... interesting perspective 📱'),
        (118, gand_id, E'Baby''s contemporary fiction created actual alternate realities! 🌀'),
        (119, rustaf_id, E'Modern life needs more action! *does parkour* 🏃‍♂️'),
        (120, alvin_id, E'Sally Rooney''s modern romance... like my dating app matches! 💘'),

        -- Beat Generation
        (121, jack_id, E'Kerouac''s road surveillance... I mean, observations 🚗'),
        (122, gand_id, E'Baby''s spontaneous prose caused spontaneous magic! ✨'),
        (123, rustaf_id, E'On the Road? More like on the treadmill! 🏃‍♂️'),
        (124, alvin_id, E'The romance in Ginsberg''s poetry... like this bohemian café! ☕'),

        -- Modernist Classics
        (125, jack_id, E'Joyce''s stream of consciousness... like surveillance transcripts 📝'),
        (126, gand_id, E'Baby turned Ulysses into actual time travel! 🕰️'),
        (127, rustaf_id, E'Modernism needs more movement! *modern dances* 💃'),
        (128, alvin_id, E'Virginia Woolf''s Mrs. Dalloway... like this party girl! 🎉'),

        -- Political Fiction
        (129, jack_id, E'Orwell''s techniques... I mean, warnings are noted 🔍'),
        (130, gand_id, E'Animal Farm came alive in the nursery! Talking animals everywhere! 🐷'),
        (131, rustaf_id, E'Political revolution needs fitness! *revolutionary workout* 💪'),
        (132, alvin_id, E'The romance in Doctor Zhivago... like this activist''s passion! ✊'),

        -- Satire
        (133, jack_id, E'Catch-22''s bureaucratic observations... surprisingly accurate 📋'),
        (134, gand_id, E'Baby''s laugh turned Vonnegut''s satire real! So it goes... ⚡'),
        (135, rustaf_id, E'Satirize this! *does ironic exercises* 🏋️‍♂️'),
        (136, alvin_id, E'Jane Austen''s wit... like this girl''s clever retort! 😏'),

        -- Epic Fantasy
        (137, jack_id, E'The surveillance potential of palantírs... theoretically speaking 👁️'),
        (138, gand_id, E'Baby''s first fantasy novel spawned actual dragons! 🐲'),
        (139, rustaf_id, E'Fantasy heroes need cardio! *swings imaginary sword* ⚔️'),
        (140, alvin_id, E'The romance in Wheel of Time... like this cosplayer''s smile! 😍'),

        -- Cyberpunk
        (141, jack_id, E'The corporate surveillance in Snow Crash... amateur stuff 🤖'),
        (142, gand_id, E'Baby hacked the matrix! With magic, of course! 💻✨'),
        (143, rustaf_id, E'Cyber-enhancement? Try muscle enhancement! 💪'),
        (144, alvin_id, E'The romance in cyberpunk... like this tech girl''s LED dress! 💫'),

        -- Literary Theory
        (145, jack_id, E'Derrida''s deconstruction... useful for code breaking 🔍'),
        (146, gand_id, E'Baby''s literary criticism summoned actual metaphors! 📚✨'),
        (147, rustaf_id, E'Theory? I prefer practical application! *does literary lifts* 🏋️‍♂️'),
        (148, alvin_id, E'Feminist theory... like this professor''s lecture! 👩‍🏫'),

        -- Journalism
        (149, jack_id, E'Hunter S. Thompson''s observational techniques... interesting 👀'),
        (150, gand_id, E'Baby''s first news story made headlines appear in thin air! 📰'),
        (151, rustaf_id, E'Gonzo journalism? Gonzo workout more like it! 💪'),
        (152, alvin_id, E'New Journalism style... like this reporter''s flair! 📱'),

        -- Drama
        (153, jack_id, E'The surveillance themes in "Death of a Salesman"... noted 🎭'),
        (154, gand_id, E'Baby''s dramatic monologue caused actual stage effects! 🎪'),
        (155, rustaf_id, E'Theater needs more action scenes! *dramatic workout* 🏋️‍♂️'),
        (156, alvin_id, E'Tennessee Williams'' romance... like this actress'' grace! 🎬'),

        -- Short Stories
        (157, jack_id, E'Chekhov''s observational skills... professional grade 🔍'),
        (158, gand_id, E'Baby''s short story created a temporary parallel universe! 🌌'),
        (159, rustaf_id, E'Short stories? Short workouts are better than none! 💪'),
        (160, alvin_id, E'Alice Munro''s subtle romance... like this brief encounter! 💕'),

        -- Graphic Novels
        (161, jack_id, E'The surveillance state in "V for Vendetta"... interesting tactics 🎭'),
        (162, gand_id, E'Baby''s first comic book animated itself! 💫'),
        (163, rustaf_id, E'Superhero comics get it - training montages! 💪'),
        (164, alvin_id, E'The romance in "Saga"... like this artist''s vision! 🎨'),

        -- Young Adult
        (165, jack_id, E'The surveillance in "Hunger Games"... amateur hour 🎯'),
        (166, gand_id, E'Baby''s YA novel turned the nursery into Hogwarts! ⚡'),
        (167, rustaf_id, E'Teen dystopia needs more fitness training! 🏃‍♂️'),
        (168, alvin_id, E'John Green''s romance... like this young love! 💝'),

        -- Cultural Studies
        (169, jack_id, E'Said''s "Orientalism"... useful for field operations 🌏'),
        (170, gand_id, E'Baby''s cultural studies summoned global spirits! 🌍'),
        (171, rustaf_id, E'Cultural theory? Cultural practice! *international workout* 💪'),
        (172, alvin_id, E'Butler''s gender theory... like this scholar''s insight! 👩‍🎓'),

        -- Mythology
        (173, jack_id, E'Campbell''s surveillance of global myths... thorough 🔍'),
        (174, gand_id, E'Baby''s mythology book brought actual gods to tea! ☕'),
        (175, rustaf_id, E'Hercules had the right idea - twelve workouts! 💪'),
        (176, alvin_id, E'Norse mythology''s romance... like this Valkyrie cosplayer! ⚔️'),

        -- Science Writing
        (177, jack_id, E'The surveillance applications in "A Brief History of Time"... fascinating 🔭'),

        -- Science Writing (continued)
        (178, gand_id, E'Baby just proved string theory with my enchanted yarn! 🧶'),
        (179, rustaf_id, E'Physics? I prefer physical activity! *does quantum leaps* 🏃'),
        (180, alvin_id, E'Carl Sagan''s cosmic perspective... like her stellar appearance! ⭐'),

        -- Dystopian Fiction
        (181, jack_id, E'Huxley''s Brave New World had some interesting ideas about surveillance... 🤔'),
        (182, gand_id, E'The baby''s first words were "Big Brother"! Just kidding... I hope 👶'),
        (183, rustaf_id, E'In a dystopia, you''d better be fit! *does apocalypse-ready workout* 🏋️‍♂️'),
        (184, alvin_id, E'The romance in "The Handmaid''s Tale"... unlike this girl''s number! 📱'),

        -- American Literature
        (185, jack_id, E'Pynchon''s paranoia in Gravity''s Rainbow... completely unfounded, of course 😅'),
        (186, gand_id, E'Baby''s first American lit: "Goodnight Moon" with real lunar phases! 🌙'),
        (187, rustaf_id, E'One last bathroom break! Even Thoreau left his cabin sometimes! 🌲'),
        (188, alvin_id, E'The way Fitzgerald wrote about Daisy... like this girl''s green light! 💚'),

        -- Final Literary Judgments
        (189, jack_id, E'After analyzing all evidence, Dostoyevsky remains the master of human psychology 🕵️‍♂️'),
        (190, gand_id, E'The baby has chosen: Tolkien''s world-building is unmatched! *magical fireworks* ✨'),
        (191, rustaf_id, E'Books are just gym for the mind, but Hemingway''s the best spotter 💪'),
        (192, alvin_id, E'Shakespeare understood love best... like all these phone numbers prove! 💝'),

        -- Wrapping Up
        (193, jack_id, E'Mission accomplished... I mean, great discussion! *sweeps for bugs one last time* 🎭'),
        (194, gand_id, E'Baby''s finally asleep! Time to close both spell book and discussion 🌟'),
        (195, rustaf_id, E'Finally! Time for my post-literature workout routine! 🏋️‍♂️'),
        (196, alvin_id, E'What a productive day for both literature and love! 📚❤️'),

        -- Final Goodbyes
        (197, jack_id, E'Signing off... this conversation will self-destruct in 5... kidding! 🕵️‍♂️'),
        (198, gand_id, E'*disappears in a puff of literary smoke with baby and familiar* ✨'),
        (199, rustaf_id, E'Off to the gym! Books are done, gains are forever! 💪'),
        (200, alvin_id, E'Seven numbers and infinite literary wisdom! Best chat ever! 😍')
        
    ) AS t(message_number, user_id, message)
    ORDER BY message_number;

END $$;