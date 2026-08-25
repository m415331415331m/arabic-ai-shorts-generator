'use client'

import { useMemo, useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { ArrowLeft, Check, ChevronDown, Download, Film, Gauge, Layers3, Link2, Loader2, MessageSquareText, Moon, Play, Redo2, Scissors, Settings2, Sparkles, Sun, Undo2, Upload, WandSparkles } from 'lucide-react'

type EditState = { brightness: number; contrast: number; sharpness: number; mirror: boolean; zoom: boolean; captions: boolean; captionStyle: 'bold' | 'minimal' }
type Clip = { start: number; end: number; caption: string; transcript?: { text: string; start: number; end: number }[] }
const initial: EditState = { brightness: 100, contrast: 100, sharpness: 100, mirror: false, zoom: false, captions: true, captionStyle: 'bold' }

export default function ShortsStudio() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready' | 'exporting'>('idle')
  const [edit, setEdit] = useState(initial)
  const [past, setPast] = useState<EditState[]>([])
  const [future, setFuture] = useState<EditState[]>([])
  const [activeTab, setActiveTab] = useState<'visual' | 'captions'>('visual')
  const [playing, setPlaying] = useState(false)
  const [caption, setCaption] = useState('لا تنتظر اللحظة المثالية، اصنعها الآن')
  const [clip, setClip] = useState<Clip>({ start: 42, end: 63, caption })
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const update = (patch: Partial<EditState>) => { setPast((p) => [...p, edit]); setFuture([]); setEdit({ ...edit, ...patch }) }
  const undo = () => { const previous = past.at(-1); if (!previous) return; setFuture((f) => [edit, ...f]); setEdit(previous); setPast((p) => p.slice(0, -1)) }
  const redo = () => { const next = future[0]; if (!next) return; setPast((p) => [...p, edit]); setEdit(next); setFuture((f) => f.slice(1)) }
  const analyze = async () => {
    if (!url.trim()) return
    setStatus('analyzing'); setMessage('يحلل Gemini العنوان ويقترح أفضل لحظة...')
    try { const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }); const data = await res.json(); if (data.caption) { setCaption(data.caption); setClip(data) } } catch { setMessage('تعذر الاتصال بالتحليل، يمكنك المتابعة بالتعديل اليدوي.') }
    setStatus('ready')
  }
  const exportVideo = async () => {
    if (!sourceFile) { setMessage('لأسباب أمنية في المتصفح، اختر ملف الفيديو الأصلي لتشغيل FFmpeg محلياً. روابط يوتيوب تُستخدم للتحليل فقط.'); fileRef.current?.click(); return }
    setStatus('exporting'); setProgress(0); setMessage('جارٍ تشغيل FFmpeg داخل المتصفح...')
    try {
      const ffmpeg = new FFmpeg()
      ffmpeg.on('progress', ({ progress: value }) => setProgress(Math.max(0, Math.min(100, Math.round(value * 100)))))
      const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await ffmpeg.load({ coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'), wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm') })
      await ffmpeg.writeFile('input.mp4', await fetchFile(sourceFile))
      const vf = [`scale=608:1080:force_original_aspect_ratio=increase`, 'crop=608:1080', `scale=1080:1920`, `eq=brightness=${((edit.brightness - 100) / 100).toFixed(2)}:contrast=${(edit.contrast / 100).toFixed(2)}`, edit.mirror ? 'hflip' : '', edit.zoom ? 'scale=1112:1978,crop=1080:1920' : ''].filter(Boolean).join(',')
      const args = ['-ss', String(clip.start), '-i', 'input.mp4', '-t', String(Math.min(25, clip.end - clip.start)), '-vf', vf, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', 'output.mp4']
      await ffmpeg.exec(args)
      const data = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([data], { type: 'video/mp4' }); const href = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = href; a.download = 'miqta-shorts-1080p.mp4'; a.click(); URL.revokeObjectURL(href)
      setProgress(100); setMessage('تم تصدير MP4 حقيقي داخل جهازك بدقة 1080p.')
    } catch (error) { console.error('[v0] FFmpeg export failed:', error); setMessage('تعذر تشغيل FFmpeg. جرّب ملف MP4 أصغر أو متصفحاً حديثاً.') }
    setStatus('ready')
  }
  const previewStyle = useMemo(() => ({ filter: `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.sharpness}%)`, transform: `${edit.mirror ? 'scaleX(-1)' : ''} ${edit.zoom ? 'scale(1.15)' : ''}` }), [edit])

  return <main dir="rtl" className="studio-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Sparkles size={18} /></div><span>مِقطع</span><small>AI SHORTS</small></div><nav><button className="nav-active"><Layers3 size={16} /> الاستوديو</button><button><Film size={16} /> مشاريعي</button><button><Gauge size={16} /> الاستخدام</button></nav><div className="top-actions"><button className="icon-btn" aria-label="الوضع الليلي"><Moon size={17} /></button><div className="avatar">م</div></div></header>
    <section className="workspace"><aside className="sidebar"><div className="side-title"><span>مشروع جديد</span><button className="icon-btn"><Settings2 size={17} /></button></div><div className="project-card"><div className="project-thumb"><Play size={18} fill="currentColor" /></div><div><strong>فيديو جديد</strong><span>{sourceFile ? sourceFile.name : 'لم يتم رفع المصدر'}</span></div><ChevronDown size={15} /></div><div className="side-section"><span>خطوات العمل</span><div className="step done"><Check size={15} /><div><b>مصدر الفيديو</b><small>رابط يوتيوب</small></div></div><div className={`step ${status !== 'idle' ? 'done' : 'current'}`}><Scissors size={15} /><div><b>القص الذكي</b><small>اكتشاف اللحظات</small></div></div><div className="step current"><WandSparkles size={15} /><div><b>التحرير والتصدير</b><small>FFmpeg داخل المتصفح</small></div></div></div><div className="side-footer"><div className="pro-note"><Sparkles size={16} /><div><b>معالجة خاصة</b><small>لا يغادر الفيديو جهازك</small></div></div></div></aside>
      <section className="main-panel"><div className="welcome-row"><div><p className="eyebrow">استوديو صناعة الشورتس</p><h1>حوّل أي فيديو إلى <em>مقطع يستحق المشاهدة.</em></h1><p className="lead">حلّل الرابط، ثم نفّذ الرندر الحقيقي محلياً بخصوصية كاملة.</p></div><div className="quality-pill"><span className="live-dot" /> جودة التصدير <b>1080p</b></div></div>
        <div className="url-card"><div className="url-label"><Link2 size={17} /><span>رابط فيديو يوتيوب</span><small>للتحليل واكتشاف اللحظة</small></div><div className="url-input"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." dir="ltr" /><button onClick={analyze} disabled={status === 'analyzing' || !url}>{status === 'analyzing' ? <><Loader2 className="spin" size={17} /> جارٍ التحليل...</> : <><Sparkles size={17} /> تحليل ذكي</>}</button></div></div>
        <div className="editor-grid"><div className="preview-column"><div className="section-heading"><div><h2>المعاينة المباشرة</h2><span>9:16 · عمودي</span></div><div className="history"><button onClick={undo} disabled={!past.length} aria-label="تراجع"><Undo2 size={17} /></button><button onClick={redo} disabled={!future.length} aria-label="إعادة"><Redo2 size={17} /></button></div></div><div className="phone-frame"><div className="video-canvas"><div className="video-art" style={previewStyle}><div className="art-sun" /><div className="art-person" /><div className="art-ground" /></div><div className="video-overlay"><span className="clip-time">00:12 / 00:21</span><span className="no-watermark">بدون علامة مائية</span></div>{edit.captions && <div className={`caption ${edit.captionStyle}`}>{caption}<small>NEVER SETTLE</small></div>}<button className="play-button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'إيقاف' : 'تشغيل'}>{playing ? <span className="pause-bars" /> : <Play size={25} fill="currentColor" />}</button><div className="timeline"><span style={{ width: playing ? '58%' : '42%' }} /></div></div></div><div className="preview-meta"><span><span className="green-dot" /> {status === 'ready' ? 'تم التحليل · أفضل لحظة' : 'بانتظار التحليل'}</span><span>مدة المقطع <b>{Math.round(clip.end - clip.start)} ثانية</b></span></div></div>
          <div className="controls-column"><div className="tabs"><button className={activeTab === 'visual' ? 'tab-active' : ''} onClick={() => setActiveTab('visual')}><Sun size={16} /> تحسين بصري</button><button className={activeTab === 'captions' ? 'tab-active' : ''} onClick={() => setActiveTab('captions')}><MessageSquareText size={16} /> النصوص والكابتشن</button></div>{activeTab === 'visual' ? <div className="control-body"><Control label="الإضاءة" value={edit.brightness} onChange={(v) => update({ brightness: v })} /><Control label="التباين" value={edit.contrast} onChange={(v) => update({ contrast: v })} /><Control label="الحدة" value={edit.sharpness} onChange={(v) => update({ sharpness: v })} /><div className="toggle-row"><div><b>عكس أفقي</b><small>Mirror حقيقي أثناء الرندر</small></div><button className={`toggle ${edit.mirror ? 'on' : ''}`} onClick={() => update({ mirror: !edit.mirror })}><span /></button></div><div className="toggle-row"><div><b>تكبير ذكي</b><small>Zoom In · 3%</small></div><button className={`toggle ${edit.zoom ? 'on' : ''}`} onClick={() => update({ zoom: !edit.zoom })}><span /></button></div></div> : <div className="control-body"><label className="field-label">النص الظاهر على الفيديو</label><textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} /><div className="toggle-row"><div><b>إظهار الكابتشن</b><small>عربي + English</small></div><button className={`toggle ${edit.captions ? 'on' : ''}`} onClick={() => update({ captions: !edit.captions })}><span /></button></div><label className="field-label">النمط</label><div className="style-options"><button className={edit.captionStyle === 'bold' ? 'selected' : ''} onClick={() => update({ captionStyle: 'bold' })}>Bold <small>واضح ومتحرك</small></button><button className={edit.captionStyle === 'minimal' ? 'selected' : ''} onClick={() => update({ captionStyle: 'minimal' })}>Minimal <small>بسيط وأنيق</small></button></div><div className="language-row"><button className="language-active">العربية</button><button>English</button></div></div>}<div className="export-box"><div><b>الرندر الحقيقي</b><small>{sourceFile ? 'جاهز لمعالجة FFmpeg المحلية' : 'اختر المصدر لتفعيل التصدير'}</small></div><input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => setSourceFile(e.target.files?.[0] || null)} /><button className="upload-btn" onClick={() => fileRef.current?.click()}><Upload size={16} /> {sourceFile ? 'تغيير المصدر' : 'اختيار المصدر'}</button><button className="export-btn" onClick={exportVideo} disabled={status === 'exporting'}>{status === 'exporting' ? <><Loader2 className="spin" size={17} /> {progress}%</> : <><Download size={17} /> تصدير MP4 حقيقي</>}</button></div>{message && <p className="status-message" role="status">{message}</p>}</div></div>
      </section></section>
  </main>
}
function Control({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) { return <div className="range-control"><div><b>{label}</b><output>{value}%</output></div><input type="range" min="75" max="125" value={value} onChange={(e) => onChange(Number(e.target.value))} /></div> }
