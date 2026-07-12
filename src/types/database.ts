export type ShowStatus = 'draft' | 'published';

export type Album = {
  id: string;
  title: string;
  release_date: string | null;
  is_cover: boolean;
  created_at: string;
  updated_at: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number | null;
  spotify_track_id: string | null;
  apple_music_url: string | null;
  youtube_url: string | null;
  dropbox_url: string | null;
  album_id: string | null;
  track_number: number | null;
  created_at: string;
  updated_at: string;
};

/** songs JOIN albums，後台歌曲列表用 */
export type SongWithAlbum = Song & {
  album: Album | null;
};

export type Show = {
  id: string;
  slug: string;
  title: string;
  show_date: string; // YYYY-MM-DD
  venue: string | null;
  status: ShowStatus;
  spotify_playlist_url: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SetlistItem = {
  id: string;
  show_id: string;
  song_id: string | null;
  position: number;
  notes: string | null;
  is_placeholder: boolean;
  created_at: string;
};

/** setlist_items JOIN songs，前台 / 歌單編輯器使用 */
export type SetlistItemWithSong = SetlistItem & {
  song: Song | null;
};

export type Database = {
  public: {
    Tables: {
      songs: {
        Row: Song;
        Insert: Partial<Song> & { title: string };
        Update: Partial<Song>;
        Relationships: [];
      };
      albums: {
        Row: Album;
        Insert: Partial<Album> & { title: string };
        Update: Partial<Album>;
        Relationships: [];
      };
      shows: {
        Row: Show;
        Insert: Partial<Show> & { slug: string; title: string; show_date: string };
        Update: Partial<Show>;
        Relationships: [];
      };
      setlist_items: {
        Row: SetlistItem;
        Insert: Partial<SetlistItem> & { show_id: string; position: number };
        Update: Partial<SetlistItem>;
        Relationships: [];
      };
      app_settings: {
        Row: { key: string; value: string | null; updated_at: string };
        Insert: { key: string; value: string | null };
        Update: { value: string | null };
        Relationships: [];
      };
      site_settings: {
        Row: { key: string; value: string | null; updated_at: string };
        Insert: { key: string; value: string | null };
        Update: { value: string | null };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};
