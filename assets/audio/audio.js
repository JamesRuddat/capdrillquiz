export const bugleCalls = [
    { id: "AdjutantsCall", sensitive: false, name: "Adjutant's Call", description: "Indicates that the adjutant is about to form the formation.", file: "/assets/audio/bugleCalls/AdjutantsCall.ogg" },
    { id: "Assembly", sensitive: false, name: "Assembly", description: "Signals troops to assemble at a designated place.", file: "/assets/audio/bugleCalls/Assembly.ogg" },
    { id: "Attention", sensitive: false, name: "Attention", description: "Sounded as a warning that troops are about to be called to attention.", file: null },
    { id: "BootsAndSaddles", sensitive: false, name: "Boots and Saddles", description: "Sounded for mounted troops to mount and take their place in line.", file: null },
    { id: "CallToQuarters", sensitive: false, name: "Call to Quarters", description: "Signals all personnel not authorized to be absent to return to their quarters for the night.", file: "/assets/audio/bugleCalls/CallToQuarters.ogg" },
    { id: "ChurchCall", sensitive: false, name: "Church Call", description: "Signals that religious services are about to begin; may announce formation of a funeral escort.", file: null },
    { id: "DrillCall", sensitive: false, name: "Drill Call", description: "Sounds as a warning to turn out for drill.", file: "/assets/audio/bugleCalls/DrillCall.ogg" },
    { id: "FatigueCall", sensitive: false, name: "Fatigue Call", description: "Signals all designated personnel to report for fatigue duty.", file: null },
    { id: "FireCall", sensitive: false, name: "Fire Call", description: "Signals a fire on post or in the vicinity; also used for fire drills.", file: "/assets/audio/bugleCalls/FireCall.mp3" },
    { id: "FirstCall", sensitive: false, name: "First Call", description: "Sounds as a warning that personnel will prepare to assemble for formation.", file: "/assets/audio/bugleCalls/FirstCall.ogg" },
    { id: "FirstSergeantsCall", sensitive: false, name: "First Sergeant's Call", description: "Signals that the First Sergeant is about to form the formation.", file: null },
    { id: "MailCall", sensitive: false, name: "Mail Call", description: "Signals personnel to assemble for the distribution of mail.", file: "/assets/audio/bugleCalls/MailCall.ogg" },
    { id: "MessCall", sensitive: false, name: "Mess Call", description: "Signals mealtime.", file: "/assets/audio/bugleCalls/MessCall.ogg" },
    { id: "OfficersCall", sensitive: false, name: "Officers Call", description: "Signals all officers to assemble at a designated place.", file: "/assets/audio/bugleCalls/OfficersCall.ogg" },
    { id: "PayCall", sensitive: false, name: "Pay Call", description: "Signals that troops will be paid.", file: null },
    { id: "Recall", sensitive: false, name: "Recall", description: "Signals duties or drills to cease.", file: "/assets/audio/bugleCalls/Recall.ogg" },
    { id: "Retreat", sensitive: false, name: "Retreat", description: "Signals the end of the official day. Played before 'To The Colors'.", file: "/assets/audio/bugleCalls/Retreat.ogg" },
    { id: "Reveille", sensitive: false, name: "Reveille", description: "Signals troops to awaken for morning roll call; accompanies raising of the flag.", file: "/assets/audio/bugleCalls/Reveille.ogg" },
    { id: "TheRouse", sensitive: false, name: "The Rouse", description: "Used in Commonwealth nations to signal soldiers to get out of bed.", file: "/assets/audio/bugleCalls/Rouse.wav" },
    { id: "SchoolCall", sensitive: false, name: "School Call", description: "Signals school is about to begin.", file: null },
    { id: "SickCall", sensitive: false, name: "Sick Call", description: "Signals all troops needing medical attention to report to the dispensary.", file: null },
    { id: "Taps", sensitive: false, name: "Taps", description: "Signals that unauthorized lights are to be extinguished; also sounded at military funerals.", file: "/assets/audio/bugleCalls/Taps.ogg" },
    { id: "Tattoo", sensitive: false, name: "Tattoo", description: "Signals lights out and that all loud talking and disturbances be discontinued within 15 minutes.", file: "/assets/audio/bugleCalls/Tattoo.ogg" },
    { id: "ToTheColors", sensitive: false, name: "To The Colors", description: "Used to render honors to the nation. Played immediately following Retreat.", file: "/assets/audio/bugleCalls/ToTheColor.ogg" },
    { id: "ToArms", sensitive: false, name: "To Arms", description: "Signals all troops to fall under arms at designated places without delay.", file: null },
];

export const music = [
    { id: "ManhattanBeach", sensitive: false, name: "Manhattan Beach", description: "A lively march by John Philip Sosensitive.", file: "/assets/audio/music/ManhattanBeach.ogg" },
    { id: "RadetzkyMarch", sensitive: false, name: "Radetzky March", description: "A famous Austrian march by Johann Strauss Sr.", file: "/assets/audio/music/RadetzkyMarch.ogg" },
    { id: "Revelation", sensitive: false, name: "Revelation", description: "A concert march often performed in military bands.", file: "/assets/audio/music/Revelation.ogg" },
    { id: "SemperFidelis", sensitive: false, name: "Semper Fidelis", description: "The official march of the United States Marine Corps.", file: "/assets/audio/music/SemperFidelis.ogg" },
    { id: "StarSpangledBanner", sensitive: true, name: "The Star-Spangled Banner", description: "The national anthem of the United States.", file: "/assets/audio/music/StarSpangledBanner.ogg" },
    { id: "StarsStripesForever", sensitive: false, name: "The Stars and Stripes Forever", description: "The official national march of the United States.", file: "/assets/audio/music/StarsStripesForever.ogg" },
    { id: "WashingtonPost", sensitive: false, name: "The Washington Post", description: "A popular march by John Philip Sosensitive.", file: "/assets/audio/music/WashingtonPost.ogg" },

    { id: "AirForceHymn", sensitive: false, name: "Air Force Hymn", description: "Originally titled The Army Air Corps, by Robert MacArthur Crawford.", file: "/assets/audio/music/AirForceHymn.mp3" },
    { id: "MarchoftheVolunteers", sensitive: true, name: "March of the Volunteers", description: "The national anthem of the People's Republic of China.", file: "/assets/audio/music/MarchoftheVolunteers.ogg" },
    { id: "TheLibertyBell", sensitive: false, name: "The Liberty Bell", description: "A popular march by John Philip Sosensitive.", file: "/assets/audio/music/TheLibertyBell.mp3" },
    { id: "UndertheDoubleEagle", sensitive: false, name: "Under the Double Eagle", description: "1893 march composed by Josef Wagner.", file: "/assets/audio/music/UndertheDoubleEagle.wav" },
];

export const presets = [
    { name: "Formation", data: `
            Assembly|06:35
            FirstSergeantsCall|06:36
            Attention|06:37
            AdjutantsCall|06:38
        `.trim() },
    { name: "Mess Schedule", data: `
            MessCall|07:30
            MessCall|12:00
            MessCall|18:00
        `.trim() },
    { name: "Drill Block", data: `
            DrillCall|09:00
            Assembly|09:05
            FirstSergeantsCall|09:06
            Attention|09:07
            AdjutantsCall|09:08
        `.trim() },
    { name: "Duty Cycle", data: `
            DrillCall|08:00
            Recall|11:00
        `.trim() },
    { name: "Officers Routine", data: `
            OfficersCall|07:00
            CallToQuarters|21:30
        `.trim() },
    { name: "Night Routine", data: `
            Tattoo|21:45
            Taps|22:00
        `.trim() }
];