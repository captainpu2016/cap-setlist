/**
 * 品牌的「2.8 顆星」：前兩顆是完整的五角星，第三顆右側被斜斜切掉一小塊，
 * 跟 Logo 上的星星一致，所以不要換成文字符號 ★★★。
 */
function starPoints(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}

export default function Stars({ size = 20, className = '' }: { size?: number; className?: string }) {
  const r = 10;
  const gap = 23;
  const width = gap * 2 + r * 2;
  return (
    <svg
      viewBox={`0 0 ${width} ${r * 2}`}
      height={size}
      width={(size * width) / (r * 2)}
      fill="currentColor"
      className={className}
      role="img"
      aria-label="三顆星"
    >
      <defs>
        <clipPath id="stars-third-cut">
          <polygon points={`${gap * 2},0 ${gap * 2 + r + 3},0 ${gap * 2 + r - 1},${r * 2} ${gap * 2},${r * 2}`} />
        </clipPath>
      </defs>
      <polygon points={starPoints(r, r, r)} />
      <polygon points={starPoints(r + gap, r, r)} />
      <polygon points={starPoints(r + gap * 2, r, r)} clipPath="url(#stars-third-cut)" />
    </svg>
  );
}
