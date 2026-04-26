export interface DailyTip {
  icon: string;
  text: string;
  category:
    | "skin_care"
    | "posture"
    | "hydration"
    | "sleep"
    | "eye_care"
    | "stress"
    | "nutrition";
}

export const DAILY_TIPS: DailyTip[] = [
  {
    icon: "sunny-outline",
    text: "Apply broad-spectrum sunscreen SPF 30+ every morning, even on cloudy days.",
    category: "skin_care",
  },
  {
    icon: "water-outline",
    text: "Use a light moisturiser after cleansing to lock in hydration and protect skin barrier.",
    category: "skin_care",
  },
  {
    icon: "water",
    text: "Consistent water intake supports skin elasticity and reduces dryness during long office hours.",
    category: "hydration",
  },
  {
    icon: "hand-left-outline",
    text: "Avoid touching your face repeatedly during work to reduce breakouts and irritation.",
    category: "skin_care",
  },
  {
    icon: "nutrition-outline",
    text: "Add a vitamin C rich fruit daily to support collagen and brighter skin tone.",
    category: "nutrition",
  },
  {
    icon: "leaf-outline",
    text: "Aloe vera gel at night can calm post-sun redness and soothe irritated skin.",
    category: "skin_care",
  },
  {
    icon: "moon-outline",
    text: "Use a gentle night cream before bed so your skin can recover overnight.",
    category: "skin_care",
  },
  {
    icon: "snow-outline",
    text: "A quick cool-water face rinse in the morning can reduce puffiness and refresh skin.",
    category: "skin_care",
  },
  {
    icon: "desktop-outline",
    text: "Keep your screen at eye level so your neck and upper back stay neutral.",
    category: "posture",
  },
  {
    icon: "refresh-outline",
    text: "Do shoulder rolls for 30 seconds every 2 hours to release desk tension.",
    category: "posture",
  },
  {
    icon: "walk-outline",
    text: "Take standing breaks every 45 minutes to avoid prolonged slouching.",
    category: "posture",
  },
  {
    icon: "body-outline",
    text: "Sit back into your chair with spine aligned and feet flat on the floor.",
    category: "posture",
  },
  {
    icon: "hand-right-outline",
    text: "Keep wrists straight while typing; avoid bending them up toward the keyboard.",
    category: "posture",
  },
  {
    icon: "eye-outline",
    text: "Follow the 20-20-20 rule: every 20 minutes, look 20 feet away for 20 seconds.",
    category: "eye_care",
  },
  {
    icon: "contrast-outline",
    text: "Adjust screen brightness to match ambient light and reduce eye fatigue.",
    category: "eye_care",
  },
  {
    icon: "moon",
    text: "Enable blue light filter in the evening to support better sleep and eye comfort.",
    category: "eye_care",
  },
  {
    icon: "water-outline",
    text: "If your eyes feel dry, use preservative-free lubricating eye drops as needed.",
    category: "eye_care",
  },
  {
    icon: "ellipse-outline",
    text: "Practice blinking drills: 10 slow full blinks every hour to reduce dryness.",
    category: "eye_care",
  },
  {
    icon: "phone-portrait-outline",
    text: "Switch screens off at least 30 minutes before bed for better melatonin release.",
    category: "sleep",
  },
  {
    icon: "thermometer-outline",
    text: "Keep your room cool at night; a slightly lower temperature improves sleep quality.",
    category: "sleep",
  },
  {
    icon: "alarm-outline",
    text: "Wake up at a consistent time daily to strengthen your body clock.",
    category: "sleep",
  },
  {
    icon: "cafe-outline",
    text: "Avoid caffeine after 3 PM to reduce sleep onset delay at night.",
    category: "sleep",
  },
  {
    icon: "heart-outline",
    text: "Take 5 deep belly breaths when stressed to calm your nervous system quickly.",
    category: "stress",
  },
  {
    icon: "walk",
    text: "A brisk 5-minute walk can lower stress and reset focus between meetings.",
    category: "stress",
  },
  {
    icon: "create-outline",
    text: "Write down one lingering thought before bed to stop mental overthinking.",
    category: "stress",
  },
  {
    icon: "sparkles-outline",
    text: "List 3 things you are grateful for today to improve mood resilience.",
    category: "stress",
  },
  {
    icon: "restaurant-outline",
    text: "Include one protein source in every meal to stay fuller and support recovery.",
    category: "nutrition",
  },
  {
    icon: "leaf",
    text: "Add at least one green vegetable daily for micronutrients and digestive support.",
    category: "nutrition",
  },
  {
    icon: "water",
    text: "Start your morning with a glass of water before tea or coffee.",
    category: "hydration",
  },
  {
    icon: "fitness-outline",
    text: "After meals, do a short 10-minute walk to improve blood sugar response.",
    category: "nutrition",
  },
];

const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

export const getTipOfTheDay = (date = new Date()): DailyTip => {
  const day = getDayOfYear(date);
  const index = day % DAILY_TIPS.length;
  return DAILY_TIPS[index] as DailyTip;
};
