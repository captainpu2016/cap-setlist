export default function BackLink({ href = '/', label = '回首頁' }: { href?: string; label?: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 font-accent text-xs uppercase tracking-[0.2em] text-stone-500 transition hover:text-marquee"
    >
      <span aria-hidden>◀</span> {label}
    </a>
  );
}
