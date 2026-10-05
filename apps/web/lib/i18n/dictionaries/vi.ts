import type { Dictionary } from "./en";

export const vi: Dictionary = {
  settings: {
    open: "Cài đặt trò chơi",
    title: "Cài đặt",
    courseLanguage: "Ngôn ngữ học",
    interfaceLanguage: "Ngôn ngữ giao diện",
    playing: "Đang chơi",
    switching: "Đang chuyển…",
    switch: "Chuyển",
    start: "Bắt đầu",
    music: "Nhạc nền",
    mute: "Tắt nhạc",
    unmute: "Bật nhạc",
    volumeLabel: "Âm lượng nhạc",
    saved: "Đã lưu cài đặt",
  },
  account: {
    open: "Tài khoản",
    title: "Tài khoản",
    signOut: "Đăng xuất",
  },
  signIn: {
    heading: "Chào mừng trở lại",
    subtitle: "Đăng nhập để giữ chuỗi ngày học và bộ thẻ của bạn.",
    errorCallback:
      "Liên kết đăng nhập không hợp lệ hoặc đã hết hạn — hãy yêu cầu liên kết mới.",
    errorOauth: "Đăng nhập bằng Google hiện chưa khả dụng.",
    sentPrefix: "Kiểm tra email — chúng tôi đã gửi liên kết đăng nhập đến",
    sentSuffix: ".",
    useDifferentEmail: "Dùng email khác",
    emailLabel: "Email",
    emailPlaceholder: "ban@vidu.com",
    sending: "Đang gửi…",
    sendMagicLink: "Gửi liên kết đăng nhập",
    or: "hoặc",
    continueWithGoogle: "Tiếp tục với Google",
    emailFormLabel: "Đăng nhập bằng email",
    pageTitle: "Đăng nhập · Colyglot",
  },
  farm: {
    welcomeToFarm: (name) => `Chào mừng đến trang trại ${name} của bạn`,
    connectionLost: "Mất kết nối — kiểm tra mạng rồi thử lại",
  },
  meta: {
    description: "Học tiếng Trung bằng lặp lại giãn cách — để nhớ thật.",
  },
  common: {
    back: "Quay lại",
    backToFarm: "Về trang trại",
    continue: "Tiếp tục",
    tryAgain: "Thử lại",
    close: "Đóng",
    locked: "Đang khoá",
    comingSoon: "Sắp có",
    finish: "Kết thúc",
    stop: "Dừng",
    closeDialog: (title) => `Đóng ${title}`,
    play: "Chơi",
    start: "Bắt đầu",
  },
  wait: (span) => {
    switch (span.unit) {
      case "now":
        return "ngay";
      case "minutes":
        return `${span.minutes}p`;
      case "hours":
        return `${span.hours}g ${span.minutes}p`;
      case "days":
        return `${span.days}ng`;
    }
  },
  title: {
    ariaWelcome: "Chào mừng đến Colyglot",
    appName: "Colyglot",
    tagline: "Gieo từ vựng, thu ký ức.",
    blurb:
      "Gieo một từ, chăm nó khi nó lớn, và thu hoạch trước khi nó tàn. Mỗi lần ôn là một lần trang trại thêm xanh.",
    playNow: "Chơi ngay",
    pickFarm: "Chọn trang trại",
    continueFarm: "Tiếp tục",
    begin: "Bắt đầu",
    alreadyHaveFarm: "Đã có trang trại? Đăng nhập",
    ariaChooseLanguage: "Chọn ngôn ngữ của bạn",
    hereNow: "Đang ở đây",
    startWithGold: (gold) => `Bắt đầu với ${gold} 💰`,
    goldAfterTier: (gold) => `💰 ${gold}`,
    comingSoon: "Sắp có",
    ariaLinks: "Liên kết màn hình chính",
    links: ["Hướng dẫn", "Thế giới", "Cài app", "Âm thanh"],
  },
  loading: {
    title: "Trang Trại Ngôn Ngữ Colyglot",
    steps: [
      "Đang ủ đất…",
      "Đang nhú mầm…",
      "Đang treo đèn lồng…",
      "Đang gọi bù nhìn thức giấc…",
      "Đang thổi lá reo…",
    ],
    failed: "Trang trại cần giúp một tay.",
    ariaProgress: "Đang tải trang trại",
  },
  topBar: {
    switchLanguage: "Đổi ngôn ngữ",
    gold: "vàng",
    dayStreak: "chuỗi ngày",
    level: (level) => `Cấp ${level}`,
  },
  stageLegend: {
    fresh: "Mới",
    growing: "Đang lớn",
    ready: "Chín",
    harvest: "Thu hoạch",
  },
  beds: {
    greenhouse: "Nhà kính",
    wordCount: (planted, total) => `${planted}/${total} từ`,
    readyCount: (count) => `${count} chín`,
    expandAria: (bedName) => `Mở rộng ${bedName}`,
    expandArm: (cost) => `Trả ${cost}💰?`,
    expandOffer: (cost) => `+3 · ${cost}💰`,
    needGoldToExpand: (cost) => `Cần ${cost} vàng để mở rộng`,
  },
  dock: {
    ariaActions: "Hành động trang trại",
    seeds: "Hạt giống",
    nursery: "Vườn ươm",
    harvest: "Thu hoạch",
    ariaNursery: (count) => `Vườn ươm, ${count} mầm mới`,
    ariaHarvest: (count) => `Thu hoạch, ${count} đã chín`,
  },
  rail: {
    ariaShortcuts: "Lối tắt trang trại",
    farmPanel: "Bảng trang trại",
    progress: "Tiến độ",
    recenterCamera: "Đưa camera về giữa",
  },
  panel: {
    ariaTabs: "Các bảng trang trại",
    closeTab: (label) => `Đóng ${label}`,
  },
  tabs: {
    seeds: { label: "Hạt giống", teaser: "" },
    shop: { label: "Cửa hàng", teaser: "" },
    progress: { label: "Tiến độ", teaser: "" },
    missions: {
      label: "Nhiệm vụ",
      teaser: "Mục tiêu mỗi ngày, trả vàng và XP cho việc luyện đều đặn.",
    },
    orders: {
      label: "Đơn hàng",
      teaser: "Dân làng sẽ đặt hàng bằng những từ bạn đã thuộc.",
    },
    workshop: {
      label: "Xưởng",
      teaser: "Biến từ đã thu hoạch thành câu và thành chuyện.",
    },
    wonders: {
      label: "Kỳ quan",
      teaser: "Cột mốc ghi lại từng chặng trang trại đã vượt qua.",
    },
    neighbors: {
      label: "Láng giềng",
      teaser: "Ghé trang trại người học khác và đổi gói hạt giống.",
    },
  },
  progress: {
    level: (level) => `Cấp ${level}`,
    xpOfTotal: (into, total) => `${into} / ${total} XP`,
    dayStreak: (streak) => `chuỗi ${streak} ngày`,
    thisFarm: "Trang trại này",
    wordsPlanted: "Từ đã gieo",
    harvested: "Đã thu hoạch",
    goldEarned: "Vàng đã kiếm",
    goldOnHand: "Vàng đang có",
    plots: "Ô đất",
    beds: "Luống",
    regions: "Vùng đất",
    masteryPct: (pct) => `thành thạo ${pct}%`,
    plaqueEarned: "Đã nhận bia thành thạo",
    plaqueHint: (pct) =>
      `Nuôi ${pct}% số từ của một vùng thành cây rừng để nhận bia đá của vùng đó.`,
    rightNow: "Ngay lúc này",
    newSeedlings: "Mầm mới",
    readyToHarvest: "Chờ thu hoạch",
  },
  seeds: {
    intro: "Gieo từ và nuôi lớn vốn từ của bạn.",
    freeNote: "Học là miễn phí — gieo hạt tốn 0 💰",
    quotaUsed: (used, limit) => `Đã gieo ${used} / ${limit} từ`,
    quotaAtCap: (used, limit) =>
      `Đã gieo ${used} / ${limit} từ — chạm để nâng cấp`,
    unlockCost: (gold, trees) =>
      `Mở khoá với ${gold.toLocaleString()} 💰 ${trees} 🌲`,
    forestReady: "Rừng của bạn đã đủ cây.",
    forestProgress: (grown, needed) =>
      `Cây rừng: ${grown}/${needed} — cây là ký ức, không thể mua được.`,
    goldProgress: (gold, needed) =>
      ` · Vàng: ${gold.toLocaleString()}/${needed.toLocaleString()}`,
    tapAgainToUnlock: "Chạm lần nữa để mở khoá",
    unlockRegion: (name) => `Mở khoá ${name}`,
    regionUnlocked: (name) => `Đã mở khoá ${name}!`,
    freePlotsIn: (region, free, bedName) =>
      `${region} — còn ${free} ô trống ở ${bedName}`,
    bedFullExpand: (bedName, cost) =>
      `${bedName} đã đầy — mở rộng với ${cost} 💰 để gieo tiếp`,
    expanding: "Đang mở rộng…",
    expandAction: (cost) => `Mở rộng +3 · ${cost}💰`,
    bedExpanded: (plots) => `Đã mở rộng luống — giờ có ${plots} ô`,
    packWordCount: (count) => `${count} từ`,
    planting: "Đang gieo…",
    limitReached: "Đã đến giới hạn",
    bedFull: "Luống đã đầy",
    plantPack: "Gieo cả gói",
    plantedBadge: "Đã gieo",
    plantWord: (hanzi) => `Gieo ${hanzi}`,
    plantedCapReached: (count) => `Đã gieo ${count} — đã đến giới hạn số từ`,
    capReachedUpgrade: "Đã đến giới hạn số từ — nâng cấp để gieo tiếp",
    plantedSomeWaiting: (planted, waiting, bedName) =>
      `Đã gieo ${planted} · ${waiting} từ còn chờ chỗ — mở rộng ${bedName} để gieo thêm`,
    plantedCount: (count) => `Đã gieo ${count} hạt`,
    bedFullExpandToast: (bedName) =>
      `${bedName} đã đầy — mở rộng để có thêm ô đất`,
    alreadyPlanted: "Đã gieo rồi",
    upgradeTitle: "Nâng cấp lên Standard",
    upgradeBody:
      "Giữ lại mọi từ bạn đã gieo. Nhập email và chúng tôi sẽ gửi liên kết đăng nhập — trang trại của bạn chuyển sang nguyên vẹn.",
    upgradeEmailLabel: "Email",
    upgradeEmailPlaceholder: "ban@vidu.com",
    upgradeSending: "Đang gửi…",
    upgradeSend: "Gửi liên kết nâng cấp",
    upgradeLinkSent: "Đã gửi liên kết nâng cấp — kiểm tra email để hoàn tất",
  },
  shop: {
    intro: "Dùng vàng cho trang trại — việc học vẫn miễn phí.",
    purse: (gold) => `${gold.toLocaleString()} 💰 trong túi`,
    categories: {
      house: "🏠 Nhà ở — cột mốc nhìn thấy được",
      deco: "🪵 Trang trí",
      animal: "🐾 Vật nuôi (mỗi con một việc)",
    },
    built: "đã xây",
    owned: "Đã có",
    buildTierFirst: (tier) => `Xây bậc ${tier} trước`,
    buying: "Đang mua…",
    price: (price) => `${price.toLocaleString()} 💰`,
    priceUnaffordable: (price) =>
      `${price.toLocaleString()} 💰 — thu hoạch thêm nhé`,
    purchased: (name) => `Đã mua ${name}!`,
  },
  plot: {
    ariaDetails: (hanzi) => `Chi tiết ô đất ${hanzi}`,
    ariaEmptyDetails: "Chi tiết ô đất trống",
    close: "Đóng chi tiết ô đất",
    stageFresh: "Mầm mới — ghé Vườn ươm",
    stageGrowing: (wait) => `Đang lớn · chín sau ${wait}`,
    stageReady: "Chờ thu hoạch",
    stageUrgent: "Ký ức đang nhạt — thu hoạch sớm",
    graduatesIn: (days) =>
      `🌟 Thành 🌳 sau ${days} ngày — giữ cho nó khoẻ nhé!`,
    harvestNow: "🧺 Thu hoạch ngay",
    emptyPlot: "Ô đất trống",
    plantHint: "Gieo một từ từ gói hạt giống của bạn vào đây.",
    plantSeeds: "🌰 Gieo hạt",
  },
  harvest: {
    title: "Thu hoạch",
    heading: "🧺 Thu hoạch",
    readyIntro: (count) =>
      `${count} cây đã chín. Trả lời từng cây để thu hoạch.`,
    nothingReady: "Chưa có gì chín — hãy gieo và chăm từ trước đã.",
    begin: "Bắt đầu thu hoạch",
    allCaughtUp: "Đã xong hết",
    stillGrowing: "Mọi cây vẫn đang lớn.",
    progressOfTotal: (done, total) => `${done} / ${total}`,
    progressHarvested: (done) => `đã thu ${done}`,
    toRetry: (count) => ` · ${count} cần làm lại`,
    goldPreview: (total) => `+${total} 💰`,
    goldBreakdown: (base, multiplier) => `${base} gốc × ${multiplier}`,
    nextInSuffix: (wait) => ` · lần tới sau ${wait}`,
    learningStep: "Bước học lại",
    nextIn: (wait) => `lần tới sau ${wait}`,
    intervalLessThanDay: "<1ng",
    intervalDays: (days) => `${days}ng`,
    claimFailed: "Mất kết nối — vàng đã được lưu, thử lại từ trang trại",
    ariaCelebration: "Mừng thu hoạch",
    celebrationTitle: "Thu hoạch xong!",
    goldAwarded: (gold) => `+${gold} vàng`,
    celebrationTally: (crops, reviewed) =>
      `${crops} cây đã thu · ${reviewed} từ đã ôn`,
    celebrationStreak: (streak) => `🔥 Chuỗi: ${streak} ngày`,
    celebrationSweepBonus: (bonus) => ` · +${bonus} thưởng dọn sạch`,
  },
  nursery: {
    heading: "🌱 Vườn ươm",
    title: "Vườn ươm",
    complete: "Xong vườn ươm",
    noneLeft: "Không có mầm mới — hãy gieo thêm hạt trước.",
    plantedInMemory: (count) => `${count} từ mới đã gieo vào ký ức.`,
    seedlingsLeft: (count) => `còn ${count} mầm`,
    checkMemory: "Kiểm tra ký ức",
    finishFailed: "Mất kết nối — tiến độ đã được lưu, vàng có thể nhận sau",
  },
  answer: {
    correct: "Đúng — đã thu hoạch",
    wrong: "Lần này chưa đúng",
    mistapped: "Tôi bấm lỡ",
  },
  ceremony: {
    ariaGraduation: "Lễ tốt nghiệp",
    ariaDemotion: "Rơi bậc",
    graduated: "Đã vào Rừng",
    backToSoil: "Trở về với đất",
    rememberedFor: (days) => `Nhớ được ${days} ngày — Rừng +1 🌲`,
    demotionBody: "Cây đã rơi xuống. Bắt đầu lại — lần này sẽ nhanh hơn.",
    greenhouseNote: " Trang trại đã đầy, nên nó chờ trong nhà kính.",
  },
  challenge: {
    retry: "Làm lại",
    question: {
      recognize: "Từ này nghĩa là gì?",
      produce: "Từ nào mang nghĩa này?",
    },
    tierLabel: {
      seedling: "Từ mới",
      growing: "Đang lớn",
      mature: "Trưởng thành",
      ancient: "Cổ thụ",
    },
    tierHint: {
      seedling: "Từ mới — đọc to lên, rồi chọn nghĩa của nó.",
      growing: "Giờ không còn pinyin. Hãy đọc thầm trước khi chọn.",
      mature: "Hình dung bạn sẽ dùng từ này ở đâu, rồi chọn.",
      ancient: "Mấy từ này trông giống nhau — xem dấu thanh trước khi chọn.",
    },
  },
  coach: (hint) => {
    switch (hint.kind) {
      case "ripe":
        return `${hint.count} cây đã chín — thu hoạch để khắc từ vào ký ức`;
      case "fresh":
        return `${hint.count} mầm mới đang chờ ở vườn ươm`;
      case "nothingPlanted":
        return "Chạm Hạt giống để gieo những từ đầu tiên";
      case "emptyPlots":
        return `${hint.count} ô đất đang trống — gieo thêm từ`;
      case "growingUntil":
        return `Mọi ô đều đang lớn — thu hoạch tới sau ${vi.wait(hint.wait)}`;
      case "growing":
        return "Mọi ô đều đang lớn — hẹn gặp lại sớm";
    }
  },
  speak: {
    aria: "Nghe từ này",
    available: "Nghe thử",
    unavailable: "Thiết bị này không có giọng đọc tiếng Trung",
  },
  regions: {
    homestead: {
      name: "Nhà Vườn",
      blurb: "Số, lời chào, gia đình — nền đất mọi trang trại bắt đầu từ đây.",
      bedName: "Luống Nhà Vườn",
    },
    market: {
      name: "Chợ Phiên",
      blurb:
        "Ăn uống, mua sắm, giá cả — chủ đề nhộn nhịp cho trang trại lớn hơn.",
      bedName: "Luống Chợ Phiên",
    },
  },
  shopItems: {
    fence_stone: {
      name: "Hàng Rào Đá",
      blurb: "Hàng rào trước nhà hoá thành đá xẻ.",
    },
    path_stone: {
      name: "Lối Đá",
      blurb: "Một lối đi lát đá tử tế từ cổng vào.",
    },
    lamp_post: {
      name: "Trụ Đèn",
      blurb: "Đèn ấm thắp sáng lối đi lúc chiều tàn.",
    },
    chicken: {
      name: "Gà",
      blurb: "Mổ lích rích bên cây sắp chín tới.",
    },
    cat: { name: "Mèo", blurb: "Ngủ cạnh luống bạn hay quên nhất." },
    house_1: { name: "Nhà Tranh", blurb: "Cái lán lớn lên thành nhà tranh." },
    house_2: {
      name: "Nhà Nông",
      blurb: "Có hiên, có ống khói, có chỗ để ở lại.",
    },
    house_3: { name: "Biệt Phủ", blurb: "Dinh thự mà ký ức bạn dựng nên." },
  },
  seedPacks: {
    greetings: "Lời chào",
    food: "Ăn & Uống",
  },
  farmTiers: {
    t0: { name: "Mầm Đầu Tiên", subtitle: "Những từ đầu tiên bén rễ" },
    t1: { name: "Vườn Đang Lớn", subtitle: "Khu vườn đầy dần sức sống" },
    t2: { name: "Làng Nở Hoa", subtitle: "Một ngôi làng mọc quanh từ của bạn" },
    t3: { name: "Phố Đá", subtitle: "Tường đá và những phiên chợ tấp nập" },
    t4: { name: "Cảng Buôn", subtitle: "Thuyền mang từ của bạn đi thật xa" },
    t5: {
      name: "Trang Trại Công Nghiệp",
      subtitle: "Hơi nước và thép, thu hoạch theo quy mô",
    },
    t6: {
      name: "Đô Thị Hiện Đại",
      subtitle: "Đèn thành phố, vốn từ bất tận",
    },
    t7: { name: "Tương Lai Neon", subtitle: "Từ ngữ phát sáng trong đêm phố" },
    t8: {
      name: "Thuộc Địa Sao",
      subtitle: "Vốn từ của bạn vươn tới các vì sao",
    },
  },
  errors: {
    UNKNOWN_LANGUAGE: "Ngôn ngữ không xác định",
    UNKNOWN_REGION: "Vùng đất không xác định",
    COULD_NOT_START_FARM: "Không tạo được trang trại",
    BED_NOT_FOUND: "Không tìm thấy luống",
    NOT_ENOUGH_GOLD: "Không đủ vàng",
    NOTHING_TO_CLAIM: "Không có gì để nhận",
    FARM_NOT_FOUND: "Không tìm thấy trang trại",
    ITEM_NOT_FOUND: "Không tìm thấy vật phẩm",
    ALREADY_OWNED: "Đã sở hữu",
    HOUSE_TIER_ORDER: "Hãy mua bậc nhà trước đó",
    START_FARM_FIRST: "Hãy bắt đầu trang trại này trước",
    COULD_NOT_LOAD_FARM: "Không tải được trang trại",
    REGION_ALREADY_UNLOCKED: "Vùng đất đã được mở khoá",
    NOT_ENOUGH_TREES: "Chưa đủ cây rừng",
    CARD_NOT_FOUND: "Không tìm thấy thẻ",
    SESSION_NOT_FOUND: "Không tìm thấy phiên học",
    COULD_NOT_SAVE_GRADE: "Không lưu được kết quả",
    COULD_NOT_CLOSE_SESSION: "Không đóng được phiên học",
    INVALID_EMAIL: "Hãy nhập email hợp lệ",
    COULD_NOT_SEND_SIGN_IN_LINK:
      "Không gửi được liên kết đăng nhập. Hãy thử lại.",
    COULD_NOT_SEND_UPGRADE_LINK:
      "Không gửi được liên kết nâng cấp. Hãy thử lại.",
    COULD_NOT_START_PLAYING: "Không bắt đầu chơi được. Hãy thử lại.",
    INVALID_VOLUME: "Âm lượng không hợp lệ",
    INVALID_MUTE_STATE: "Trạng thái tắt tiếng không hợp lệ",
    INVALID_UI_LANG: "Ngôn ngữ giao diện không hợp lệ",
    SOMETHING_WENT_WRONG: "Đã có lỗi xảy ra",
  },
};
