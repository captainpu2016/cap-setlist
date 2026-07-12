import AlbumForm from '../album-form';

export default function NewAlbumPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-stone-900">新增專輯</h1>
      <div className="mt-6">
        <AlbumForm />
      </div>
    </div>
  );
}
