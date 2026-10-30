/**
 * 品牌「2.8 顆星」的幾何：前兩顆是完整的五角星，第三顆右側被斜斜切掉一小塊。
 * 網站（SVG 元件）與分享圖卡（Satori）共用同一份座標，確保一致。
 */
type Pt = [number, number];

function starPolygon(cx: number, cy: number, r: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    pts.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  return pts;
}

/** 用「a→b」這條線把多邊形切掉右側（Sutherland–Hodgman），保留左側 */
function clipLeftOf(poly: Pt[], a: Pt, b: Pt): Pt[] {
  const side = (p: Pt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const sc = side(cur);
    const sp = side(prev);
    // 線由上往下畫時，side > 0 代表在左側
    const curIn = sc >= 0;
    const prevIn = sp >= 0;
    if (curIn !== prevIn) {
      const t = sp / (sp - sc);
      out.push([prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]);
    }
    if (curIn) out.push(cur);
  }
  return out;
}

const R = 10;
const GAP = 23;

/** 三顆星各自的多邊形頂點（以 viewBox 0 0 66 20 為座標） */
export function starsPolygons(): { width: number; height: number; polygons: string[] } {
  const toStr = (p: Pt[]) => p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const third = starPolygon(R + GAP * 2, R, R);
  // 斜切線：由上方偏右切到下方偏左，只削掉第三顆右緣約兩成
  const cutTop: Pt = [GAP * 2 + R + 2, 0];
  const cutBottom: Pt = [GAP * 2 + R - 3, R * 2];
  return {
    width: GAP * 2 + R * 2,
    height: R * 2,
    polygons: [
      toStr(starPolygon(R, R, R)),
      toStr(starPolygon(R + GAP, R, R)),
      toStr(clipLeftOf(third, cutTop, cutBottom))
    ]
  };
}
