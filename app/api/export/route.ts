import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.url !== 'string' || !body.clipId || !['raw', 'render'].includes(body.mode)) return NextResponse.json({ error: 'بيانات التصدير غير مكتملة' }, { status: 400 })
  const worker = process.env.VIDEO_WORKER_URL
  if (!worker) return NextResponse.json({ error: 'خدمة الرندر غير متصلة. أضف VIDEO_WORKER_URL لعامل FFmpeg.' }, { status: 503 })
  try {
    const response = await fetch(`${worker.replace(/\/$/, '')}/${body.mode === 'raw' ? 'clip' : 'render'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: body.url, clipId: body.clipId, edit: body.edit }), cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || typeof data.downloadUrl !== 'string') return NextResponse.json({ error: data.error || 'العامل لم يرجع ملف MP4' }, { status: response.ok ? 502 : response.status })
    return NextResponse.json({ downloadUrl: data.downloadUrl, resolution: '1080p', watermark: false })
  } catch { return NextResponse.json({ error: 'تعذر الاتصال بخدمة الرندر' }, { status: 502 }) }
}
