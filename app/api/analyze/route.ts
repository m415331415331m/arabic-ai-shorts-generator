import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) return NextResponse.json({ error: 'رابط يوتيوب غير صالح' }, { status: 400 })
  const worker = process.env.VIDEO_WORKER_URL
  if (!worker) return NextResponse.json({ error: 'خدمة المعالجة غير متصلة. أضف VIDEO_WORKER_URL لعامل Downloader + FFmpeg + Gemini.' }, { status: 503 })
  try {
    const response = await fetch(`${worker.replace(/\/$/, '')}/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }), cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return NextResponse.json({ error: data.error || 'فشل العامل في تحليل الفيديو' }, { status: response.status })
    return NextResponse.json(data)
  } catch { return NextResponse.json({ error: 'تعذر الاتصال بعامل الفيديو' }, { status: 502 }) }
}
