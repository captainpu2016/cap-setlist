/** 後台換頁時立刻顯示的骨架：不用等伺服器把整頁查完，畫面就先有回應，感覺不會卡住 */
export default function AdminLoading() {
  return (
    <div className="max-w-5xl animate-pulse" aria-busy="true" aria-label="載入中">
      <div className="h-7 w-40 rounded bg-stone-200" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-stone-200/70" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg border border-stone-200 bg-white" />
        ))}
      </div>
      <div className="mt-6 space-y-2 rounded-lg border border-stone-200 bg-white p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 rounded bg-stone-100" />
        ))}
      </div>
    </div>
  );
}
