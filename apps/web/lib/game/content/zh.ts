import { registerLanguage } from "./registry";
import type { LanguagePack } from "./types";

const w = (
  hanzi: string,
  pinyin: string,
  translation: string,
  example: [string, string, string],
  collocations: { phrase: string; pinyin: string; translation: string }[] = []
) => ({
  hanzi,
  pinyin,
  translation,
  examples: [
    { hanzi: example[0], pinyin: example[1], translation: example[2] },
  ],
  collocations,
});

export const zh: LanguagePack = {
  key: "zh-vi",
  sourceLang: "zh",
  targetLang: "vi",
  name: "中文 · Việt",
  flag: "🇨🇳",
  tiers: [
    {
      key: "t0",
      name: "First Sprouts",
      subtitle: "Your first words take root",
      theme: {
        sky: ["#aee3f5", "#e8f7e0"],
        ground: ["#8fbf6a", "#6b9c4c"],
        plot: "#8a5a33",
        plotBorder: "#5d3a1e",
        accent: "#e07b2a",
      },
    },
    {
      key: "t1",
      name: "Growing Garden",
      subtitle: "The garden fills with life",
      theme: {
        sky: ["#9fd8ef", "#f4eccb"],
        ground: ["#7fb35c", "#5a8a41"],
        plot: "#8a5a33",
        plotBorder: "#5d3a1e",
        accent: "#d95f2b",
      },
    },
    {
      key: "t2",
      name: "Village Bloom",
      subtitle: "A village grows around your words",
      theme: {
        sky: ["#f3c98b", "#fbe9c8"],
        ground: ["#94b25f", "#6f8a44"],
        plot: "#96603a",
        plotBorder: "#66401f",
        accent: "#c94f30",
      },
    },
    {
      key: "t3",
      name: "Stone Town",
      subtitle: "Stone walls and busy markets",
      theme: {
        sky: ["#b9cfe4", "#e9e2d0"],
        ground: ["#8a9a6a", "#65734c"],
        plot: "#8d6b4a",
        plotBorder: "#5e4630",
        accent: "#b8543a",
      },
    },
    {
      key: "t4",
      name: "Trade Harbor",
      subtitle: "Ships carry your words far away",
      theme: {
        sky: ["#8ec9e8", "#f2e4c4"],
        ground: ["#7ba86a", "#568049"],
        plot: "#7d5233",
        plotBorder: "#53351d",
        accent: "#2f7fa3",
      },
    },
    {
      key: "t5",
      name: "Industrial Farm",
      subtitle: "Steam and steel, harvests at scale",
      theme: {
        sky: ["#c9c3b4", "#e8dcc0"],
        ground: ["#8f8f6d", "#6a6a4e"],
        plot: "#6f5136",
        plotBorder: "#49341f",
        accent: "#a3622c",
      },
    },
    {
      key: "t6",
      name: "Modern Metropolis",
      subtitle: "City lights, endless vocabulary",
      theme: {
        sky: ["#a8c4dd", "#dfe7ea"],
        ground: ["#7d9977", "#59725a"],
        plot: "#6e5a45",
        plotBorder: "#483a2b",
        accent: "#3a8fb5",
      },
    },
    {
      key: "t7",
      name: "Neon Future",
      subtitle: "Words glow in the night city",
      theme: {
        sky: ["#3b2f63", "#7a4f8f"],
        ground: ["#3f4f6a", "#2a3550"],
        plot: "#4a3d5c",
        plotBorder: "#2e2440",
        accent: "#e04f9f",
      },
    },
    {
      key: "t8",
      name: "Star Colony",
      subtitle: "Your vocabulary reaches the stars",
      theme: {
        sky: ["#1a103f", "#4a2a6a"],
        ground: ["#5c4a7a", "#3d3055"],
        plot: "#5a3f70",
        plotBorder: "#39254d",
        accent: "#5fd4d0",
      },
    },
  ],
  packs: [
    {
      key: "greetings",
      name: "Greetings",
      icon: "👋",
      words: [
        w("你好", "nǐ hǎo", "xin chào", ["你好！", "Nǐ hǎo!", "Xin chào!"]),
        w("谢谢", "xiè xie", "cảm ơn", ["谢谢！", "Xiè xie!", "Cảm ơn!"]),
        w("再见", "zài jiàn", "tạm biệt", ["再见！", "Zài jiàn!", "Tạm biệt!"]),
        w("对不起", "duì bu qǐ", "xin lỗi", [
          "对不起，我迟到了。",
          "Duìbuqǐ, wǒ chídàole.",
          "Xin lỗi, tôi đến trễ.",
        ]),
        w("请", "qǐng", "mời, xin", ["请坐。", "Qǐng zuò.", "Mời ngồi."]),
        w("是", "shì", "là, vâng", [
          "我是学生。",
          "Wǒ shì xuéshēng.",
          "Tôi là học sinh.",
        ]),
        w("不", "bù", "không", [
          "我不是老师。",
          "Wǒ bù shì lǎoshī.",
          "Tôi không phải giáo viên.",
        ]),
        w("我", "wǒ", "tôi", ["我很高兴。", "Wǒ hěn gāoxìng.", "Tôi rất vui."]),
        w("你", "nǐ", "bạn", ["你好吗？", "Nǐ hǎoma?", "Bạn có khỏe không?"]),
        w("他", "tā", "anh ấy, ông ấy", [
          "他是我的朋友。",
          "Tā shì wǒ de péngyǒu.",
          "Anh ấy là bạn của tôi.",
        ]),
        w("很", "hěn", "rất", [
          "今天很热。",
          "Jīntiān hěn rè.",
          "Hôm nay rất nóng.",
        ]),
        w("吗", "ma", "không? (phần hỏi)", [
          "你是越南人吗？",
          "Nǐ shì Yuènánrén ma?",
          "Bạn là người Việt phải không?",
        ]),
      ],
    },
    {
      key: "food",
      name: "Food & Drink",
      icon: "🍜",
      words: [
        w(
          "吃",
          "chī",
          "ăn",
          ["我要吃饭。", "Wǒ yào chīfàn.", "Tôi muốn ăn cơm."],
          [{ phrase: "吃饭", pinyin: "chī fàn", translation: "ăn cơm" }]
        ),
        w(
          "喝",
          "hē",
          "uống",
          ["你想喝什么？", "Nǐ xiǎng hē shénme?", "Bạn muốn uống gì?"],
          [{ phrase: "喝水", pinyin: "hē shuǐ", translation: "uống nước" }]
        ),
        w("水", "shuǐ", "nước", [
          "请给我水。",
          "Qǐng gěi wǒ shuǐ.",
          "Cho tôi nước.",
        ]),
        w("米饭", "mǐ fàn", "cơm", [
          "我喜欢米饭。",
          "Wǒ xǐhuān mǐfàn.",
          "Tôi thích cơm.",
        ]),
        w("面条", "miàn tiáo", "mì, bún", [
          "这碗面条很好吃。",
          "Zhè wǎn miàntiáo hěn hǎochī.",
          "Bát mì này rất ngon.",
        ]),
        w("茶", "chá", "trà", [
          "我要一杯茶。",
          "Wǒ yào yì bēi chá.",
          "Tôi muốn một tách trà.",
        ]),
        w("咖啡", "kā fēi", "cà phê", [
          "早上我喝咖啡。",
          "Zǎoshang wǒ hē kāfēi.",
          "Buổi sáng tôi uống cà phê.",
        ]),
        w(
          "苹果",
          "píng guǒ",
          "táo",
          [
            "这个苹果很甜。",
            "Zhège píngguǒ hěn tián.",
            "Quả táo này rất ngọt.",
          ],
          [{ phrase: "吃苹果", pinyin: "chī píngguǒ", translation: "ăn táo" }]
        ),
        w("鱼", "yú", "cá", [
          "我不吃鱼。",
          "Wǒ bù chī yú.",
          "Tôi không ăn cá.",
        ]),
        w("鸡肉", "jī ròu", "thịt gà", [
          "我要鸡肉面。",
          "Wǒ yào jīròu miàn.",
          "Tôi muốn mì gà.",
        ]),
        w("鸡蛋", "jī dàn", "trứng", [
          "早餐吃两个鸡蛋。",
          "Zǎocān chī liǎng gè jīdàn.",
          "Bữa sáng ăn hai quả trứng.",
        ]),
        w("水果", "shuǐ guǒ", "trái cây", [
          "她喜欢水果。",
          "Tā xǐhuān shuǐguǒ.",
          "Cô ấy thích trái cây.",
        ]),
      ],
    },
  ],
};

registerLanguage(zh);
