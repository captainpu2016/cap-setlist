import { starsPolygons } from '@/lib/stars';

/**
 * 品牌的「2.8 顆星」，跟 Logo 上的星星一致，所以不要換成文字符號 ★★★。
 * 幾何在 lib/stars.ts，分享圖卡也用同一份。
 */
export default function Stars({ size = 20, className = '' }: { size?: number; className?: string }) {
  const { width, height, polygons } = starsPolygons();
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      height={size}
      width={(size * width) / height}
      fill="currentColor"
      className={className}
      role="img"
      aria-label="三顆星"
    >
      {polygons.map((points, i) => (
        <polygon key={i} points={points} />
      ))}
    </svg>
  );
}
