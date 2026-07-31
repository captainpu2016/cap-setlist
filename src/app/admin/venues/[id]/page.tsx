import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VenueForm from '../venue-form';
import type { Venue } from '@/types/database';

export default async function EditVenuePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', params.id)
    .single<Venue>();

  if (!venue) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-stone-900">編輯場地</h1>
      <div className="mt-6">
        <VenueForm venue={venue} />
      </div>
    </div>
  );
}
