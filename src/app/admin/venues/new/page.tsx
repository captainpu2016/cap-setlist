import VenueForm from '../venue-form';

export default function NewVenuePage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-stone-900">新增場地</h1>
      <div className="mt-6">
        <VenueForm />
      </div>
    </div>
  );
}
