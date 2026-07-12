import Image from 'next/image';

/**
 * 品牌吉祥物徽章——直接使用樂團官方素材（紅隊長頭像），
 * 取代先前暫用的原創星芒貼紙。維持跟舊版一樣的 size/rotate/className
 * 介面，方便原有呼叫的地方不用改。
 */
export default function CaptainBadge({
  size = 96,
  rotate = -6,
  className = ''
}: {
  size?: number;
  rotate?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 select-none ${className}`}
      style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}
    >
      <Image
        src="/brand/mascot-head.png"
        alt="普通隊長"
        fill
        sizes={`${size}px`}
        className="object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
