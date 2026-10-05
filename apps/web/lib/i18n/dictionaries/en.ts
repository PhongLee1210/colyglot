import type { ActionErrorCode } from "@/lib/actions/error-codes";
import type { RegionKey } from "@/lib/game/content/regions";
import type {
  ChallengeDirection,
  ChallengeTier,
} from "@/lib/game/core/challenge";
import type { CoachHint } from "@/lib/game/core/coach";
import type { WaitSpan } from "@/lib/game/core/crops";

export const en = {
  settings: {
    open: "Game settings",
    title: "Settings",
    courseLanguage: "Course language",
    interfaceLanguage: "Interface language",
    playing: "Playing",
    switching: "Switching…",
    switch: "Switch",
    start: "Start",
    music: "Music",
    mute: "Mute music",
    unmute: "Unmute music",
    volumeLabel: "Music volume",
    saved: "Settings saved",
  },
  account: {
    open: "Account",
    title: "Account",
    signOut: "Sign out",
  },
  signIn: {
    heading: "Welcome back",
    subtitle: "Sign in to keep your streak and your decks.",
    errorCallback:
      "That sign-in link is invalid or expired — request a new one.",
    errorOauth: "Google sign-in isn't available yet.",
    sentPrefix: "Check your email — we sent a sign-in link to",
    sentSuffix: ".",
    useDifferentEmail: "Use a different email",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    sending: "Sending…",
    sendMagicLink: "Send magic link",
    or: "or",
    continueWithGoogle: "Continue with Google",
    emailFormLabel: "Sign in with email",
    pageTitle: "Sign in · Colyglot",
  },
  farm: {
    welcomeToFarm: (name: string) => `Welcome to your ${name} farm`,
    connectionLost: "Connection lost — check your network and try again",
  },
  meta: {
    description: "Learn Chinese with spaced repetition — actually remember it.",
  },
  common: {
    back: "Back",
    backToFarm: "Back to farm",
    continue: "Continue",
    tryAgain: "Try again",
    close: "Close",
    locked: "Locked",
    comingSoon: "Coming soon",
    finish: "Finish",
    stop: "Stop",
    closeDialog: (title: string) => `Close ${title}`,
    play: "Play",
    start: "Start",
  },
  wait: (span: WaitSpan): string => {
    switch (span.unit) {
      case "now":
        return "now";
      case "minutes":
        return `${span.minutes}m`;
      case "hours":
        return `${span.hours}h ${span.minutes}m`;
      case "days":
        return `${span.days}d`;
    }
  },
  title: {
    ariaWelcome: "Welcome to Colyglot",
    appName: "Colyglot",
    tagline: "Plant words, harvest memories.",
    blurb:
      "Plant a word, tend it while it grows, and harvest it before it wilts. Every review feeds your farm.",
    playNow: "Play now",
    pickFarm: "Pick a farm",
    continueFarm: "Continue",
    begin: "Begin",
    alreadyHaveFarm: "Already have a farm? Sign in",
    ariaChooseLanguage: "Choose your language",
    hereNow: "Here now",
    startWithGold: (gold: number) => `Start with ${gold} 💰`,
    goldAfterTier: (gold: number) => `💰 ${gold}`,
    comingSoon: "Coming soon",
    ariaLinks: "Title screen links",
    links: ["Guide", "Worlds", "Install", "Sound"],
  },
  loading: {
    title: "Colyglot Language Farm",
    steps: [
      "Warming the soil…",
      "Sprouting seedlings…",
      "Hanging the lanterns…",
      "Waking the scarecrow…",
      "Rustling the leaves…",
    ],
    failed: "The farm needs a little help.",
    ariaProgress: "Loading the farm",
  },
  topBar: {
    switchLanguage: "Switch language",
    gold: "gold",
    dayStreak: "day streak",
    level: (level: number) => `Lv ${level}`,
  },
  stageLegend: {
    fresh: "New",
    growing: "Growing",
    ready: "Ready",
    harvest: "Harvest",
  },
  beds: {
    greenhouse: "Greenhouse",
    wordCount: (planted: number, total: number) => `${planted}/${total} words`,
    readyCount: (count: number) => `${count} ready`,
    expandAria: (bedName: string) => `Expand ${bedName}`,
    expandArm: (cost: number) => `Spend ${cost}💰?`,
    expandOffer: (cost: number) => `+3 · ${cost}💰`,
    needGoldToExpand: (cost: number) => `Need ${cost} gold to expand`,
  },
  dock: {
    ariaActions: "Farm actions",
    seeds: "Seeds",
    nursery: "Nursery",
    harvest: "Harvest",
    ariaNursery: (count: number) => `Nursery, ${count} new seedlings`,
    ariaHarvest: (count: number) => `Harvest, ${count} ready`,
  },
  rail: {
    ariaShortcuts: "Farm shortcuts",
    farmPanel: "Farm panel",
    progress: "Progress",
    recenterCamera: "Recenter camera",
  },
  panel: {
    ariaTabs: "Farm panels",
    closeTab: (label: string) => `Close ${label}`,
  },
  tabs: {
    seeds: { label: "Seeds", teaser: "" },
    shop: { label: "Shop", teaser: "" },
    progress: { label: "Progress", teaser: "" },
    missions: {
      label: "Missions",
      teaser: "Daily goals that pay gold and XP for steady practice.",
    },
    orders: {
      label: "Orders",
      teaser: "Villagers will request the words you have already mastered.",
    },
    workshop: {
      label: "Workshop",
      teaser: "Turn harvested words into sentences and stories.",
    },
    wonders: {
      label: "Wonders",
      teaser: "Landmarks that mark every tier your farm has outgrown.",
    },
    neighbors: {
      label: "Neighbors",
      teaser: "Visit other learners' farms and trade seed packs.",
    },
  },
  progress: {
    level: (level: number) => `Level ${level}`,
    xpOfTotal: (into: number, total: number) => `${into} / ${total} XP`,
    dayStreak: (streak: number) => `${streak} day streak`,
    thisFarm: "This farm",
    wordsPlanted: "Words planted",
    harvested: "Harvested",
    goldEarned: "Gold earned",
    goldOnHand: "Gold on hand",
    plots: "Plots",
    beds: "Beds",
    regions: "Regions",
    masteryPct: (pct: number) => `${pct}% mastery`,
    plaqueEarned: "Mastery plaque earned",
    plaqueHint: (pct: number) =>
      `Grow ${pct}% of a region's words into forest trees to earn its stone plaque.`,
    rightNow: "Right now",
    newSeedlings: "New seedlings",
    readyToHarvest: "Ready to harvest",
  },
  seeds: {
    intro: "Plant words and grow your vocabulary.",
    freeNote: "Learning is free — planting costs 0 💰",
    quotaUsed: (used: number, limit: number) =>
      `${used} / ${limit} words planted`,
    quotaAtCap: (used: number, limit: number) =>
      `${used} / ${limit} words planted — tap to upgrade`,
    unlockCost: (gold: number, trees: number) =>
      `Unlock for ${gold.toLocaleString()} 💰 ${trees} 🌲`,
    forestReady: "Your Forest is ready.",
    forestProgress: (grown: number, needed: number) =>
      `Forest trees: ${grown}/${needed} — trees are memory, they cannot be bought.`,
    goldProgress: (gold: number, needed: number) =>
      ` · Gold: ${gold.toLocaleString()}/${needed.toLocaleString()}`,
    tapAgainToUnlock: "Tap again to unlock",
    unlockRegion: (name: string) => `Unlock ${name}`,
    regionUnlocked: (name: string) => `${name} unlocked!`,
    freePlotsIn: (region: string, free: number, bedName: string) =>
      `${region} — ${free} free plot${free === 1 ? "" : "s"} in ${bedName}`,
    bedFullExpand: (bedName: string, cost: number) =>
      `${bedName} is full — expand for ${cost} 💰 to keep planting`,
    expanding: "Expanding…",
    expandAction: (cost: number) => `Expand +3 · ${cost}💰`,
    bedExpanded: (plots: number) => `Bed expanded — ${plots} plots now`,
    packWordCount: (count: number) => `${count} words`,
    planting: "Planting…",
    limitReached: "Limit reached",
    bedFull: "Bed full",
    plantPack: "Plant Pack",
    plantedBadge: "Planted",
    plantWord: (hanzi: string) => `Plant ${hanzi}`,
    plantedCapReached: (count: number) =>
      `Planted ${count} — word limit reached`,
    capReachedUpgrade: "Word limit reached — upgrade to keep planting",
    plantedSomeWaiting: (planted: number, waiting: number, bedName: string) =>
      `Planted ${planted} · ${waiting} need space — expand ${bedName} for more`,
    plantedCount: (count: number) =>
      `Planted ${count} seed${count > 1 ? "s" : ""}`,
    bedFullExpandToast: (bedName: string) =>
      `${bedName} is full — expand it for more plots`,
    alreadyPlanted: "Already planted",
    upgradeTitle: "Upgrade to Standard",
    upgradeBody:
      "Keep every word you planted. Enter your email and we will send a sign-in link — your farm carries over untouched.",
    upgradeEmailLabel: "Email",
    upgradeEmailPlaceholder: "you@example.com",
    upgradeSending: "Sending…",
    upgradeSend: "Send upgrade link",
    upgradeLinkSent: "Upgrade link sent — check your email to finish",
  },
  shop: {
    intro: "Spend gold on your farm — learning stays free.",
    purse: (gold: number) => `${gold.toLocaleString()} 💰 in the purse`,
    categories: {
      house: "🏠 House — a milestone you can see",
      deco: "🪵 Decorations",
      animal: "🐾 Animals (each one does something)",
    },
    built: "built",
    owned: "Owned",
    buildTierFirst: (tier: number) => `Build tier ${tier} first`,
    buying: "Buying…",
    price: (price: number) => `${price.toLocaleString()} 💰`,
    priceUnaffordable: (price: number) =>
      `${price.toLocaleString()} 💰 — keep harvesting`,
    purchased: (name: string) => `${name} purchased!`,
  },
  plot: {
    ariaDetails: (hanzi: string) => `Plot ${hanzi} details`,
    ariaEmptyDetails: "Empty plot details",
    close: "Close plot details",
    stageFresh: "New seedling — visit the Nursery",
    stageGrowing: (wait: string) => `Growing · ready in ${wait}`,
    stageReady: "Ready to harvest",
    stageUrgent: "Memory fading — harvest soon",
    graduatesIn: (days: number) =>
      `🌟 Graduates to 🌳 in ${days} ${days === 1 ? "day" : "days"} — keep it healthy!`,
    harvestNow: "🧺 Harvest now",
    emptyPlot: "Empty plot",
    plantHint: "Plant a word here from your seed pack.",
    plantSeeds: "🌰 Plant seeds",
  },
  harvest: {
    title: "Harvest",
    heading: "🧺 Harvest",
    readyIntro: (count: number) =>
      `${count} ${count === 1 ? "crop is" : "crops are"} ready. Answer each one to harvest it.`,
    nothingReady: "Nothing is ready yet — plant and nurture words first.",
    begin: "Begin harvest",
    allCaughtUp: "All caught up",
    stillGrowing: "Every crop is still growing.",
    progressOfTotal: (done: number, total: number) => `${done} of ${total}`,
    progressHarvested: (done: number) => `${done} harvested`,
    toRetry: (count: number) => ` · ${count} to retry`,
    goldPreview: (total: number) => `+${total} 💰`,
    goldBreakdown: (base: number, multiplier: number) =>
      `${base} base × ${multiplier}`,
    nextInSuffix: (wait: string) => ` · next in ${wait}`,
    learningStep: "Learning step",
    nextIn: (wait: string) => `next in ${wait}`,
    intervalLessThanDay: "<1d",
    intervalDays: (days: number) => `${days}d`,
    claimFailed: "Connection lost — your gold is saved, retry from the farm",
    ariaCelebration: "Harvest celebration",
    celebrationTitle: "Harvest complete!",
    goldAwarded: (gold: number) => `+${gold} gold`,
    celebrationTally: (crops: number, reviewed: number) =>
      `${crops} crops harvested · ${reviewed} words reviewed`,
    celebrationStreak: (streak: number) =>
      `🔥 Streak: ${streak} day${streak === 1 ? "" : "s"}`,
    celebrationSweepBonus: (bonus: number) => ` · +${bonus} sweep bonus`,
  },
  nursery: {
    heading: "🌱 Nursery",
    title: "Nursery",
    complete: "Nursery complete",
    noneLeft: "No new seedlings — plant more seeds first.",
    plantedInMemory: (count: number) =>
      `${count} new ${count === 1 ? "word" : "words"} planted in memory.`,
    seedlingsLeft: (count: number) =>
      `${count} seedling${count === 1 ? "" : "s"} left`,
    checkMemory: "Check my memory",
    finishFailed:
      "Connection lost — your progress is saved, gold can be claimed later",
  },
  answer: {
    correct: "Right — harvested",
    wrong: "Not this time",
    mistapped: "I mistapped",
  },
  ceremony: {
    ariaGraduation: "Graduation",
    ariaDemotion: "Demotion",
    graduated: "Graduated to the Forest",
    backToSoil: "Back to the soil",
    rememberedFor: (days: number) =>
      `Remembered for ${days} days — Forest +1 🌲`,
    demotionBody:
      "The tree came back down. Starting over — this time it will be faster.",
    greenhouseNote: " The farm was full, so it waits in the greenhouse.",
  },
  challenge: {
    retry: "Retry",
    question: {
      recognize: "What does this mean?",
      produce: "Which word means this?",
    } satisfies Record<ChallengeDirection, string>,
    tierLabel: {
      seedling: "New word",
      growing: "Growing",
      mature: "Mature",
      ancient: "Ancient",
    } satisfies Record<ChallengeTier, string>,
    tierHint: {
      seedling: "New word — read it aloud, then pick what it means.",
      growing: "No pinyin now. Sound it out before you pick.",
      mature: "Picture where you would use it, then pick the word.",
      ancient: "These look alike — check the tone before you pick.",
    } satisfies Record<ChallengeTier, string>,
  },
  coach: (hint: CoachHint): string => {
    switch (hint.kind) {
      case "ripe":
        return hint.count === 1
          ? "1 crop is ripe — harvest it to lock the word in"
          : `${hint.count} crops are ripe — harvest them to lock the words in`;
      case "fresh":
        return hint.count === 1
          ? "1 new seedling is waiting in the nursery"
          : `${hint.count} new seedlings are waiting in the nursery`;
      case "nothingPlanted":
        return "Tap Seeds to plant your first words";
      case "emptyPlots":
        return hint.count === 1
          ? "1 plot is empty — plant another word"
          : `${hint.count} plots are empty — plant more words`;
      case "growingUntil":
        return `Every plot is growing — next harvest in ${en.wait(hint.wait)}`;
      case "growing":
        return "Every plot is growing — come back soon";
    }
  },
  speak: {
    aria: "Hear this word",
    available: "Hear it",
    unavailable: "No Chinese voice on this device",
  },
  regions: {
    homestead: {
      name: "Homestead",
      blurb: "Numbers, greetings, family — the ground every farm starts on.",
      bedName: "Homestead Garden",
    },
    market: {
      name: "Market",
      blurb: "Food, shopping, prices — a busier topic for a busier farm.",
      bedName: "Market Garden",
    },
  } satisfies Record<
    RegionKey,
    { name: string; blurb: string; bedName: string }
  >,
  shopItems: {
    fence_stone: {
      name: "Stone Fence",
      blurb: "The front fence turns to cut stone.",
    },
    path_stone: {
      name: "Stone Path",
      blurb: "A proper paved walk from the gate.",
    },
    lamp_post: {
      name: "Lamp Posts",
      blurb: "Warm lamps light the path at dusk.",
    },
    chicken: {
      name: "Chicken",
      blurb: "Pecks beside the crop that ripens next.",
    },
    cat: { name: "Cat", blurb: "Sleeps by the bed you forget most." },
    house_1: { name: "Cottage", blurb: "The shed grows into a cottage." },
    house_2: {
      name: "Farmhouse",
      blurb: "A porch, a chimney, room to stay.",
    },
    house_3: { name: "Villa", blurb: "The manor your memory built." },
  } as Record<string, { name: string; blurb: string }>,
  seedPacks: {
    greetings: "Greetings",
    food: "Food & Drink",
  } as Record<string, string>,
  farmTiers: {
    t0: { name: "First Sprouts", subtitle: "Your first words take root" },
    t1: { name: "Growing Garden", subtitle: "The garden fills with life" },
    t2: {
      name: "Village Bloom",
      subtitle: "A village grows around your words",
    },
    t3: { name: "Stone Town", subtitle: "Stone walls and busy markets" },
    t4: { name: "Trade Harbor", subtitle: "Ships carry your words far away" },
    t5: {
      name: "Industrial Farm",
      subtitle: "Steam and steel, harvests at scale",
    },
    t6: {
      name: "Modern Metropolis",
      subtitle: "City lights, endless vocabulary",
    },
    t7: { name: "Neon Future", subtitle: "Words glow in the night city" },
    t8: { name: "Star Colony", subtitle: "Your vocabulary reaches the stars" },
  } as Record<string, { name: string; subtitle: string }>,
  errors: {
    UNKNOWN_LANGUAGE: "Unknown language",
    UNKNOWN_REGION: "Unknown region",
    COULD_NOT_START_FARM: "Could not start farm",
    BED_NOT_FOUND: "Bed not found",
    NOT_ENOUGH_GOLD: "Not enough gold",
    NOTHING_TO_CLAIM: "Nothing to claim",
    FARM_NOT_FOUND: "Farm not found",
    ITEM_NOT_FOUND: "Item not found",
    ALREADY_OWNED: "Already owned",
    HOUSE_TIER_ORDER: "Buy the previous house tier first",
    START_FARM_FIRST: "Start this farm first",
    COULD_NOT_LOAD_FARM: "Could not load farm",
    REGION_ALREADY_UNLOCKED: "Region already unlocked",
    NOT_ENOUGH_TREES: "Not enough forest trees yet",
    CARD_NOT_FOUND: "Card not found",
    SESSION_NOT_FOUND: "Session not found",
    COULD_NOT_SAVE_GRADE: "Could not save grade",
    COULD_NOT_CLOSE_SESSION: "Could not close session",
    INVALID_EMAIL: "Enter a valid email address",
    COULD_NOT_SEND_SIGN_IN_LINK: "Could not send the sign-in link. Try again.",
    COULD_NOT_SEND_UPGRADE_LINK: "Could not send the upgrade link. Try again.",
    COULD_NOT_START_PLAYING: "Could not start playing. Try again.",
    INVALID_VOLUME: "Invalid volume",
    INVALID_MUTE_STATE: "Invalid mute state",
    INVALID_UI_LANG: "Invalid interface language",
    SOMETHING_WENT_WRONG: "Something went wrong",
  } satisfies Record<ActionErrorCode, string>,
};

export type Dictionary = typeof en;
