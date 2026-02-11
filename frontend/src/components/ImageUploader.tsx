import { useState, useRef, useCallback, useEffect } from 'react';
import { imageAPI } from '../services/api';

// ── types ─────────────────────────────────────────────────────────────────
interface GalleryImage { id: string; url: string; isPrimary: boolean; sortOrder: number; }
interface Crop { x: number; y: number; w: number; h: number; }

interface Props {
  // Single-image mode (category, or product primary)
  value?: string;
  onChange?: (url: string) => void;

  // Gallery mode (product multi-image)
  productId?: string;
  gallery?: GalleryImage[];
  onGalleryChange?: (images: GalleryImage[]) => void;

  label?: string;
  aspectRatio?: number;   // e.g. 1 = square, 16/9 = widescreen
}

// ── canvas crop helper ────────────────────────────────────────────────────
function CropModal({ src, aspectRatio, onConfirm, onCancel }: {
  src: string; aspectRatio: number;
  onConfirm: (crop: Crop) => void; onCancel: () => void;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgRef     = useRef<HTMLImageElement>(null);
  const [crop,     setCrop]     = useState<Crop | null>(null);
  const [dragging, setDragging] = useState(false);
  const [start,    setStart]    = useState<{ x: number; y: number } | null>(null);
  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 });
  const [displaySize, setDisplaySize] = useState({ w: 1, h: 1 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (crop) {
      // darken outside
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, crop.y);
      ctx.fillRect(0, crop.y, crop.x, crop.h);
      ctx.fillRect(crop.x + crop.w, crop.y, canvas.width - crop.x - crop.w, crop.h);
      ctx.fillRect(0, crop.y + crop.h, canvas.width, canvas.height - crop.y - crop.h);
      // border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
      // rule-of-thirds
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(crop.x + (crop.w/3)*i, crop.y); ctx.lineTo(crop.x + (crop.w/3)*i, crop.y+crop.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(crop.x, crop.y + (crop.h/3)*i); ctx.lineTo(crop.x+crop.w, crop.y + (crop.h/3)*i); ctx.stroke();
      }
      // handles
      ctx.fillStyle = '#fff';
      [[crop.x,crop.y],[crop.x+crop.w,crop.y],[crop.x,crop.y+crop.h],[crop.x+crop.w,crop.y+crop.h]].forEach(([hx,hy]) => {
        ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2); ctx.fill();
      });
    }
  }, [crop]);

  useEffect(() => { draw(); }, [draw, crop]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = getPos(e);
    setDragging(true);
    setStart(p);
    setCrop(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !start) return;
    const p = getPos(e);
    const canvas = canvasRef.current!;
    let x = Math.min(start.x, p.x);
    let y = Math.min(start.y, p.y);
    let w = Math.abs(p.x - start.x);
    let h = Math.abs(p.y - start.y);
    // enforce aspect ratio
    if (aspectRatio && w > 0) {
      h = w / aspectRatio;
      if (y + h > canvas.height) { h = canvas.height - y; w = h * aspectRatio; }
    }
    w = Math.max(10, Math.min(w, canvas.width - x));
    h = Math.max(10, Math.min(h, canvas.height - y));
    setCrop({ x, y, w, h });
  };

  const onMouseUp = () => setDragging(false);

  const handleConfirm = () => {
    if (!crop) return;
    const scaleX = imgNatural.w / displaySize.w;
    const scaleY = imgNatural.h / displaySize.h;
    onConfirm({ x: crop.x * scaleX, y: crop.y * scaleY, w: crop.w * scaleX, h: crop.h * scaleY });
  };

  const resetCrop = () => {
    if (!canvasRef.current) return;
    const c = canvasRef.current;
    const h = aspectRatio ? c.width / aspectRatio : c.height;
    const y = (c.height - h) / 2;
    setCrop({ x: 0, y: Math.max(0, y), w: c.width, h: Math.min(h, c.height) });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="bg-gray-800 px-5 py-3 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">✂️ Crop Image</h3>
          <div className="flex gap-2">
            <button onClick={resetCrop} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">Reset</button>
            <button onClick={onCancel}  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">Cancel</button>
            <button onClick={handleConfirm} disabled={!crop}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold disabled:opacity-40">
              ✓ Apply Crop
            </button>
          </div>
        </div>
        <div className="p-3 flex justify-center">
          <canvas ref={canvasRef} width={580} height={420}
            className="cursor-crosshair rounded-lg max-w-full"
            style={{ background: '#111' }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          />
          <img ref={imgRef} src={src} alt="crop"
            style={{ display: 'none' }}
            onLoad={e => {
              const img = e.currentTarget;
              setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
              setDisplaySize({ w: 580, h: 420 });
              draw();
              setTimeout(resetCrop, 50);
            }}
          />
        </div>
        <div className="px-5 pb-3 text-xs text-gray-400 text-center">
          Drag on the image to select the crop area • {crop ? `${Math.round(crop.w)}×${Math.round(crop.h)} px` : 'No selection'}
        </div>
      </div>
    </div>
  );
}

// ── main ImageUploader component ──────────────────────────────────────────
export default function ImageUploader({ value, onChange, productId, gallery, onGalleryChange, label = 'Image', aspectRatio = 1 }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [tab,         setTab]        = useState<'upload'|'url'>('upload');
  const [urlInput,    setUrlInput]   = useState(value || '');
  const [uploading,   setUploading]  = useState(false);
  const [cropSrc,     setCropSrc]    = useState<string | null>(null);
  const [pendingFile, setPendingFile]= useState<File | null>(null);
  const [dragOver,    setDragOver]   = useState(false);
  const [localGallery,setLocalGallery]=useState<GalleryImage[]>(gallery || []);
  const [dragIdx,     setDragIdx]    = useState<number | null>(null);
  const [error,       setError]      = useState('');

  const isGalleryMode = !!productId;

  useEffect(() => { if (gallery) setLocalGallery(gallery); }, [gallery]);

  // ── upload flow ─────────────────────────────────────────────────────
  const uploadWithCrop = async (file: File, crop?: Crop) => {
    setUploading(true); setError('');
    try {
      if (isGalleryMode && productId) {
        const r = await imageAPI.addProductImage(productId, file, crop);
        const updated = [...localGallery, r.data.image];
        setLocalGallery(updated);
        onGalleryChange?.(updated);
      } else {
        const r = await imageAPI.uploadSingle(file, crop);
        onChange?.(r.data.url);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false); setPendingFile(null); setCropSrc(null);
    }
  };

  const handleFileChosen = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = e => setCropSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChosen(file);
  }, []);

  // ── gallery drag-to-reorder ──────────────────────────────────────────
  const handleGalleryDragStart = (idx: number) => setDragIdx(idx);
  const handleGalleryDrop = async (toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); return; }
    const reordered = [...localGallery];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withOrder = reordered.map((img, i) => ({ ...img, sortOrder: i, isPrimary: i === 0 }));
    setLocalGallery(withOrder);
    setDragIdx(null);
    onGalleryChange?.(withOrder);
    if (productId) {
      try { await imageAPI.reorderProductImages(productId, withOrder.map(i => i.id)); } catch {}
    }
  };

  const handleDelete = async (img: GalleryImage) => {
    if (!productId) return;
    try {
      await imageAPI.deleteProductImage(productId, img.id);
      const updated = localGallery.filter(i => i.id !== img.id);
      setLocalGallery(updated); onGalleryChange?.(updated);
    } catch (e: any) { setError(e.response?.data?.message || 'Delete failed'); }
  };

  const handleSetPrimary = async (img: GalleryImage) => {
    if (!productId) return;
    try {
      await imageAPI.setPrimary(productId, img.id);
      const updated = localGallery.map(i => ({ ...i, isPrimary: i.id === img.id }));
      setLocalGallery(updated); onGalleryChange?.(updated);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to set primary'); }
  };

  // ── render ───────────────────────────────────────────────────────────
  const currentUrl = value || '';
  const API_BASE   = (import.meta as any).env?.VITE_API_URL?.replace('/api','') || 'http://localhost:3000';
  const resolveUrl = (url: string) => url.startsWith('http') ? url : `${API_BASE}${url}`;

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-gray-700">{label}</div>

      {/* ── GALLERY view ── */}
      {isGalleryMode && (
        <div className="space-y-2">
          {localGallery.length > 0 && (
            <>
              <div className="text-xs text-gray-400 mb-1">Drag to reorder · First image = primary</div>
              <div className="grid grid-cols-3 gap-2">
                {localGallery.map((img, idx) => (
                  <div key={img.id} draggable
                    onDragStart={() => handleGalleryDragStart(idx)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleGalleryDrop(idx)}
                    className={`relative rounded-xl overflow-hidden border-2 group cursor-grab active:cursor-grabbing
                      ${img.isPrimary ? 'border-indigo-500' : 'border-gray-200'} 
                      ${dragIdx === idx ? 'opacity-40 scale-95' : 'hover:border-indigo-300'} transition-all`}
                    style={{ aspectRatio: '1' }}
                  >
                    <img src={resolveUrl(img.url)} alt={`Image ${idx+1}`} className="w-full h-full object-cover" />
                    {img.isPrimary && (
                      <div className="absolute top-1 left-1 bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">★ Primary</div>
                    )}
                    {/* hover controls */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1.5">
                      {!img.isPrimary && (
                        <button onClick={() => handleSetPrimary(img)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-semibold w-24">
                          ★ Set Primary
                        </button>
                      )}
                      <button onClick={() => handleDelete(img)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-semibold w-24">
                        🗑 Remove
                      </button>
                    </div>
                    {/* drag handle */}
                    <div className="absolute bottom-1 right-1 text-white/60 text-xs">⠿</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* add to gallery */}
          <button onClick={() => galleryInputRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl py-3 text-sm text-gray-500 hover:text-indigo-600 font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50">
            {uploading ? '⏳ Uploading…' : '＋ Add Image to Gallery'}
          </button>
          <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChosen(f); e.target.value = ''; }} />
        </div>
      )}

      {/* ── SINGLE IMAGE (non-gallery) ── */}
      {!isGalleryMode && (
        <>
          {/* tabs */}
          <div className="flex border-b">
            {(['upload','url'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px capitalize ${tab===t?'border-indigo-600 text-indigo-700':'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {t === 'upload' ? '⬆️ Upload' : '🔗 URL'}
              </button>
            ))}
          </div>

          {tab === 'upload' && (
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
                ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-indigo-600">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                  <span className="text-sm font-semibold">Processing image…</span>
                </div>
              ) : (
                <>
                  <div className="text-3xl mb-2">🖼️</div>
                  <div className="text-sm font-semibold text-gray-600">Drop image here or click to browse</div>
                  <div className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF · Max 10 MB</div>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChosen(f); e.target.value = ''; }} />
            </div>
          )}

          {tab === 'url' && (
            <div className="flex gap-2">
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
              <button onClick={() => { onChange?.(urlInput); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">
                Apply
              </button>
            </div>
          )}

          {/* current preview */}
          {currentUrl && (
            <div className="relative rounded-xl overflow-hidden border group" style={{ aspectRatio: String(aspectRatio) }}>
              <img src={resolveUrl(currentUrl)} alt="preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button onClick={() => { handleFileChosen(new File([], '')); fileInputRef.current?.click(); }}
                  className="px-3 py-1.5 bg-white text-gray-800 rounded-lg text-xs font-bold">✏️ Replace</button>
                <button onClick={() => { onChange?.(''); setUrlInput(''); }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold">🗑 Remove</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* error */}
      {error && <div className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      {/* ── CROP MODAL ── */}
      {cropSrc && (
        <CropModal
          src={cropSrc}
          aspectRatio={aspectRatio}
          onConfirm={crop => { if (pendingFile) uploadWithCrop(pendingFile, crop); }}
          onCancel={() => { setCropSrc(null); setPendingFile(null); }}
        />
      )}
    </div>
  );
}
