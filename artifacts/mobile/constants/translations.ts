export type Lang = 'en' | 'hi';

export const translations = {
  en: {
    // Greetings
    goodMorning: 'Good Morning',
    stayFocused: 'Stay Focused',
    goodEvening: 'Good Evening',
    restWellTonight: 'Rest Well Tonight',

    // Dashboard header
    tagline: 'Wake up like you mean it.',
    discipline: 'Discipline',

    // Next alarm banner
    nextAlarm: 'Next alarm',
    noActiveAlarms: 'No active alarms',
    tapToCreateFirst: 'Tap + to create your first alarm',

    // Sections
    yourStreak: 'Your Streak',
    achievements: 'Achievements',
    unlocked: 'unlocked',
    alarms: 'Alarms',
    active: 'active',

    // Empty state
    noAlarmsSet: 'No alarms set',
    tapPlusToCreate: 'Tap the + button to create your first alarm',

    // Tabs
    home: 'Home',
    streak: 'Streak',
    settings: 'Settings',

    // Success screen
    wakeUpCompleted: 'Wake Up Completed',
    streakDaysContinue: (n: number) => `${n} day streak — keep going.`,
    firstDayDown: 'First day down. Build on it.',
    greatStart: 'Great start! Keep going.',
    scoreDisplay: (score: number) => `+5 → ${score}`,

    // Failure screen
    missedWakeUp: "You missed today's\nwake-up.",
    streakReset: 'Your streak has reset.',
    scoreDrop: 'Discipline score dropped by 5.',
    tryTomorrow: 'Try again tomorrow.',
    backToDashboard: 'Back to Dashboard',
    footnote: 'Consistency is built one morning at a time.',

    // Onboarding
    skip: 'Skip',
    slide1Title: 'Stop Snoozing.',
    slide1Body: 'Most alarms are easy to ignore.\nUNSNWOOZE makes waking up\nnon-negotiable.',
    slide2Title: "Prove You're Awake.",
    slide2Body: 'Your alarm stops only after you\ncomplete the wake-up challenge.',
    selfieCheck: 'Selfie Check',
    streakTracking: 'Streak Tracking',
    disciplineScore: 'Discipline Score',
    slide3Title: 'Build Real Discipline.',
    slide3Body: 'Track streaks. Earn achievements.\nBecome someone who wakes up on time.',
    dayStreak: 'day streak',
    slide4Tagline: 'Wake up like you mean it.',
    startAlarm: 'Start My First Alarm',
    noAccountNeeded: 'No account needed. Free to start.',

    // Settings
    appearance: 'APPEARANCE',
    language: 'LANGUAGE',
    about: 'ABOUT',
    version: 'Version',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    english: 'English',
    hindi: 'Hindi',
    wakeUpAction: 'Wake up. Take action.',

    // Streak page
    currentStreakLabel: 'Current',
    bestStreakLabel: 'Best',
    totalWakeUps: 'Total Wake-Ups',
    milestones: 'Milestones',
    nextMilestoneLabel: 'Next milestone',
    daysMore: (n: number) => `${n} more to go`,
    weeklyActivity: 'This Week',
    dayNames: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    noHistoryYet: 'Complete your first alarm to start tracking.',

    // Streak freeze (Snap)
    streakProtected: 'Streak Protected!',
    streakProtectedSub: 'A Streak Freeze (Snap) was automatically used.',
    freezeConsumed: '1 Streak Freeze consumed.',
    freezeEarned: 'Streak Freeze Earned!',
    freezeEarnedSub: 'Reach the next multiple of 3 days to earn another.',
    streakFreezeAvailable: (n: number) => `${n} Freeze${n !== 1 ? 's' : ''} available`,
  },

  hi: {
    // Greetings
    goodMorning: 'सुप्रभात',
    stayFocused: 'ध्यान केंद्रित रहें',
    goodEvening: 'शुभ संध्या',
    restWellTonight: 'आज रात अच्छे से आराम करें',

    // Dashboard header
    tagline: 'जागो और कुछ कर दिखाओ।',
    discipline: 'अनुशासन',

    // Next alarm banner
    nextAlarm: 'अगला अलार्म',
    noActiveAlarms: 'कोई सक्रिय अलार्म नहीं',
    tapToCreateFirst: '+ दबाएं और पहला अलार्म बनाएं',

    // Sections
    yourStreak: 'आपकी लकीर',
    achievements: 'उपलब्धियाँ',
    unlocked: 'अनलॉक',
    alarms: 'अलार्म',
    active: 'सक्रिय',

    // Empty state
    noAlarmsSet: 'कोई अलार्म सेट नहीं',
    tapPlusToCreate: '+ बटन दबाएं और पहला अलार्म बनाएं',

    // Tabs
    home: 'होम',
    streak: 'स्ट्रीक',
    settings: 'सेटिंग्स',

    // Success screen
    wakeUpCompleted: 'जागना पूरा हुआ',
    streakDaysContinue: (n: number) => `${n} दिन की लकीर — जारी रखो।`,
    firstDayDown: 'पहला दिन पूरा। आगे बढ़ो।',
    greatStart: 'शानदार शुरुआत! जारी रखो।',
    scoreDisplay: (score: number) => `+5 → ${score}`,

    // Failure screen
    missedWakeUp: 'आज आप समय पर\nनहीं जागे।',
    streakReset: 'आपकी लकीर रीसेट हो गई।',
    scoreDrop: 'अनुशासन स्कोर 5 कम हो गया।',
    tryTomorrow: 'कल फिर कोशिश करें।',
    backToDashboard: 'डैशबोर्ड पर वापस जाएं',
    footnote: 'निरंतरता एक-एक सुबह से बनती है।',

    // Onboarding
    skip: 'छोड़ें',
    slide1Title: 'स्नूज़ करना बंद करो।',
    slide1Body: 'ज़्यादातर अलार्म को अनदेखा करना आसान है।\nUNSNWOOZE जागना\nज़रूरी बना देता है।',
    slide2Title: 'साबित करो कि जाग गए।',
    slide2Body: 'आपका अलार्म तभी बंद होगा\nजब आप जागने की चुनौती पूरी करेंगे।',
    selfieCheck: 'सेल्फी जाँच',
    streakTracking: 'लकीर ट्रैकिंग',
    disciplineScore: 'अनुशासन स्कोर',
    slide3Title: 'असली अनुशासन बनाओ।',
    slide3Body: 'लकीर ट्रैक करें। उपलब्धियाँ पाएं।\nसमय पर जागने वाले बनें।',
    dayStreak: 'दिन की लकीर',
    slide4Tagline: 'जागो और कुछ कर दिखाओ।',
    startAlarm: 'अपना पहला अलार्म शुरू करें',
    noAccountNeeded: 'कोई खाता नहीं चाहिए। शुरू करें।',

    // Settings
    appearance: 'दिखावट',
    language: 'भाषा',
    about: 'जानकारी',
    version: 'संस्करण',
    light: 'हल्का',
    dark: 'गहरा',
    system: 'सिस्टम',
    english: 'अंग्रेज़ी',
    hindi: 'हिंदी',
    wakeUpAction: 'जागो। कुछ करो।',

    // Streak page
    currentStreakLabel: 'अभी',
    bestStreakLabel: 'सर्वश्रेष्ठ',
    totalWakeUps: 'कुल जागरण',
    milestones: 'मील के पत्थर',
    nextMilestoneLabel: 'अगला लक्ष्य',
    daysMore: (n: number) => `${n} और बाकी`,
    weeklyActivity: 'इस सप्ताह',
    dayNames: ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श'],
    noHistoryYet: 'ट्रैकिंग शुरू करने के लिए पहला अलार्म पूरा करें।',

    // Streak freeze (Snap)
    streakProtected: 'लकीर सुरक्षित!',
    streakProtectedSub: 'एक स्ट्रीक फ्रीज़ (स्नैप) स्वचालित रूप से उपयोग हुई।',
    freezeConsumed: '1 स्ट्रीक फ्रीज़ उपयोग की गई।',
    freezeEarned: 'स्ट्रीक फ्रीज़ मिली!',
    freezeEarnedSub: 'अगली 3-दिन की सीमा पर एक और मिलेगी।',
    streakFreezeAvailable: (n: number) => `${n} फ्रीज़ उपलब्ध`,
  },
};

export type Translations = typeof translations.en;
