export default function BackLink({ href = '/', label = '回首頁' }: { href?: string; label?: string }) {
  return (
    <a href={href} className="text-xs uppercase tracking-widest text-stone-500 hover:text-marquee">
      ← {label}
    </a>
  );
}
