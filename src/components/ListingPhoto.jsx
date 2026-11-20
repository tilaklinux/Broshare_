import { useRef } from 'react';

export default function ListingPhoto({ src, title }) {
  const dialog = useRef(null);

  return (
    <>
      <button type="button" className="block h-full w-full cursor-zoom-in overflow-hidden"
        aria-label={`Enlarge photo of ${title}`} aria-haspopup="dialog"
        onClick={() => dialog.current.showModal()}>
        <img src={src} alt={title} className="h-full w-full object-cover transition-transform hover:scale-105" />
      </button>
      <dialog ref={dialog} aria-label={`Photo of ${title}`}
        className="fixed inset-0 m-auto w-[min(94vw,64rem)] rounded-xl bg-gray-950 text-white shadow-2xl backdrop:bg-black/80"
        onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <span className="truncate font-semibold">{title}</span>
          <button type="button" className="rounded-lg px-3 py-2 hover:bg-white/15" onClick={() => dialog.current.close()}>Close</button>
        </div>
        <img src={src} alt={title} className="block h-[min(75dvh,48rem)] w-full object-contain" />
      </dialog>
    </>
  );
}
