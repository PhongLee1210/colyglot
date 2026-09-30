// Radical families for the planted vocabulary (GAME_PLAY §3.1): mature
// distractors confuse words that SHARE a radical, which trains the eye
// the way reading actually fails. Unknown characters simply contribute
// nothing, so the similarity rules degrade instead of breaking.
const RADICALS: Record<string, string> = {
  你: "亻",
  好: "女",
  谢: "讠",
  再: "冂",
  见: "见",
  对: "又",
  不: "一",
  起: "走",
  请: "讠",
  是: "日",
  我: "手",
  他: "亻",
  很: "彳",
  吗: "口",
  吃: "口",
  喝: "口",
  水: "水",
  米: "米",
  饭: "饣",
  面: "面",
  条: "木",
  茶: "艹",
  咖: "口",
  啡: "口",
  苹: "艹",
  果: "木",
  鱼: "鱼",
  鸡: "鸟",
  肉: "肉",
  蛋: "虫",
};

export function radicalOf(character: string): string | null {
  return RADICALS[character] ?? null;
}

export function wordRadicals(hanzi: string): Set<string> {
  const radicals = new Set<string>();
  for (const character of hanzi) {
    const radical = radicalOf(character);
    if (radical) radicals.add(radical);
  }
  return radicals;
}

export function sharesRadical(left: string, right: string): boolean {
  const rightRadicals = wordRadicals(right);
  for (const radical of wordRadicals(left)) {
    if (rightRadicals.has(radical)) return true;
  }
  return false;
}
