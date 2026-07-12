import Image from 'next/image';

/**
 * 官方橫式 Logo（白色版，適合深色背景）。
 * 用 next/image 的 intrinsic width/height 讓瀏覽器能預先保留版面空間，避免版面跳動。
 */
export default function SiteLogo({
  className = '',
  height = 64
}: {
  className?: string;
  height?: number;
}) {
  // 原始比例約 1200:675
  const width = Math.round((height * 1200) / 675);

  return (
    <Image
      src="/brand/logo-horizontal-white.png"
      alt="普通隊長 Captain Ordinary"
      width={width}
      height={height}
      priority
      className={`h-auto w-auto ${className}`}
      style={{ height, width: 'auto' }}
    />
  );
}
