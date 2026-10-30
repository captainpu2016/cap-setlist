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
      <span className="tag-slash">{eyebrow}</span>
      <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-paper sm:text-6xl">{title}</h1>
      <div className="mt-4 h-1 w-16 bg-marquee" />
      {description && <p className="mt-4 text-stone-400">{description}</p>}
    </div>
  );
}
