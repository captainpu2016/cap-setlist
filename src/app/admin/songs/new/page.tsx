import SongForm from '../song-form';

export default function NewSongPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-stone-900">新增歌曲</h1>
      <div className="mt-6">
        <SongForm />
      </div>
    </div>
  );
}
