import postgres from "postgres";

// Idempotent dev seed: wipes and recreates the dev-bypass user's decks,
// cards, schedules, and a 3-day review streak. Run with:
//   bun run db:seed:dev
const devUserId = process.env.DEV_BYPASS_USER_ID;
if (!devUserId) {
  console.error(
    "DEV_BYPASS_USER_ID is not set — add it to apps/web/.env first"
  );
  process.exit(1);
}

type SeedCard = {
  hanzi: string;
  pinyin: string;
  translation: string;
  dueOffsetHours: number;
};

type SeedDeck = {
  name: string;
  cards: SeedCard[];
};

const DECKS: SeedDeck[] = [
  {
    name: "HSK 1 Essentials",
    cards: [
      {
        hanzi: "你好",
        pinyin: "nǐ hǎo",
        translation: "xin chào",
        dueOffsetHours: -24,
      },
      {
        hanzi: "谢谢",
        pinyin: "xiè xie",
        translation: "cảm ơn",
        dueOffsetHours: -12,
      },
      {
        hanzi: "对不起",
        pinyin: "duì bu qǐ",
        translation: "xin lỗi",
        dueOffsetHours: -2,
      },
      {
        hanzi: "再见",
        pinyin: "zài jiàn",
        translation: "tạm biệt",
        dueOffsetHours: -1,
      },
      { hanzi: "我", pinyin: "wǒ", translation: "tôi", dueOffsetHours: 48 },
      { hanzi: "你", pinyin: "nǐ", translation: "bạn", dueOffsetHours: 72 },
    ],
  },
  {
    name: "Food & Drink",
    cards: [
      { hanzi: "吃", pinyin: "chī", translation: "ăn", dueOffsetHours: -6 },
      { hanzi: "喝", pinyin: "hē", translation: "uống", dueOffsetHours: -1 },
      {
        hanzi: "米饭",
        pinyin: "mǐ fàn",
        translation: "cơm",
        dueOffsetHours: 96,
      },
      { hanzi: "水", pinyin: "shuǐ", translation: "nước", dueOffsetHours: 120 },
      { hanzi: "茶", pinyin: "chá", translation: "trà", dueOffsetHours: 144 },
    ],
  },
  {
    name: "Travel Phrases",
    cards: [
      {
        hanzi: "机场",
        pinyin: "jī chǎng",
        translation: "sân bay",
        dueOffsetHours: 72,
      },
      {
        hanzi: "火车站",
        pinyin: "huǒ chē zhàn",
        translation: "ga tàu",
        dueOffsetHours: 96,
      },
      {
        hanzi: "酒店",
        pinyin: "jiǔ diàn",
        translation: "khách sạn",
        dueOffsetHours: 120,
      },
      {
        hanzi: "多少钱",
        pinyin: "duō shao qián",
        translation: "bao nhiêu tiền",
        dueOffsetHours: 144,
      },
    ],
  },
];

const STREAK_SESSION_DAYS_AGO = [0, 1, 2];
const SESSION_HOUR_UTC = 12;
const REVIEW_GRADE_GOOD = 3;

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const returningId = (rows: readonly unknown[]): { id: string }[] =>
  rows as unknown as { id: string }[];

try {
  const removed = await sql`
    delete from decks where user_id = ${devUserId} returning id
  `;
  if (removed.length > 0) {
    console.log(`cleared ${removed.length} existing deck(s) for dev user`);
  }

  const firstDeckCards: { id: string }[] = [];

  for (const deck of DECKS) {
    const [insertedDeck] = returningId(
      await sql`
      insert into decks (name, user_id)
      values (${deck.name}, ${devUserId})
      returning id
    `
    );
    for (const card of deck.cards) {
      const [insertedCard] = returningId(
        await sql`
        insert into cards (deck_id, hanzi, pinyin, translation)
        values (${insertedDeck.id}, ${card.hanzi}, ${card.pinyin}, ${card.translation})
        returning id
      `
      );
      const dueAt = new Date(Date.now() + card.dueOffsetHours * 60 * 60 * 1000);
      await sql`
        insert into card_schedules (card_id, due_at)
        values (${insertedCard.id}, ${dueAt})
      `;
      if (firstDeckCards.length < 2) {
        firstDeckCards.push(insertedCard);
      }
    }
    console.log(`seeded deck "${deck.name}" (${deck.cards.length} cards)`);
  }

  for (const daysAgo of STREAK_SESSION_DAYS_AGO) {
    const startedAt = new Date();
    startedAt.setUTCHours(SESSION_HOUR_UTC, 0, 0, 0);
    startedAt.setUTCDate(startedAt.getUTCDate() - daysAgo);
    const [session] = returningId(
      await sql`
      insert into study_sessions (user_id, started_at, ended_at, cards_reviewed)
      values (${devUserId}, ${startedAt}, ${startedAt}, ${firstDeckCards.length})
      returning id
    `
    );
    for (const card of firstDeckCards) {
      await sql`
        insert into review_logs (card_id, session_id, grade, reviewed_at)
        values (${card.id}, ${session.id}, ${REVIEW_GRADE_GOOD}, ${startedAt})
      `;
    }
  }
  console.log(`seeded ${STREAK_SESSION_DAYS_AGO.length}-day review streak`);
  console.log(`dev user ${devUserId} ready`);
} finally {
  await sql.end();
}
