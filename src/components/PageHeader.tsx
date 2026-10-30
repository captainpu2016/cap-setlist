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
      <p className="tag-slash">{eyebrow}</p>
      <h1 className="mt-2 text-5xl font-black leading-none tracking-tight text-paper sm:text-7xl">{title}</h1>
      {description && <p className="mt-5 max-w-lg text-stone-400">{description}</p>}
    </div>
  );
}
