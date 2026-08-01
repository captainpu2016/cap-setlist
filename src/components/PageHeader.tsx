export default function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-marquee">{eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-black text-paper sm:text-5xl">{title}</h1>
      {description && <p className="mt-3 text-stone-400">{description}</p>}
    </div>
  );
}
