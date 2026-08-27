import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) return NextResponse.json({ error: 'رابط يوتيوب غير صالح' }, { status: 400 })
  const worker = 'https://videoai-production-d50e.up.railway.app'
  try {
    const response = await fetch(`${worker}/analyze`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ url }), cache: 'no-store', signal: AbortSignal.timeout(120000) })
    const raw = await response.text()
    let data: Record<string, unknown> = {}
    try { data = raw ? JSON.parse(raw) : {} } catch { data = {} }
    if (!response.ok) return NextResponse.json({ error: typeof data.error === 'string' ? data.error : `فشل العامل في تحليل الفيديو (${response.status})` }, { status: response.status })
    if (!Array.isArray(data.clips) || data.clips.length === 0) {
      return NextResponse.json({ error: 'العامل متصل لكنه لم يُرجع مقاطع. يجب أن يعيد { clips: [{ id, start, end, title, hook, caption, scores, previewUrl, rawUrl }] }.' }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch { return NextResponse.json({ error: 'تعذر الاتصال بعامل الفيديو' }, { status: 502 }) }
}
