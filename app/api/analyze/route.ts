import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) return NextResponse.json({ error: 'رابط يوتيوب غير صالح' }, { status: 400 })
  const configuredWorker = process.env.VIDEO_WORKER_URL?.trim()
  if (!configuredWorker) return NextResponse.json({ success: false, error: 'VIDEO_WORKER_URL غير مضبوط في بيئة الخادم.', stage: 'configuration' }, { status: 500 })
  const worker = configuredWorker.replace(/\/$/, '')
  try {
    const response = await fetch(`${worker}/analyze`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ url }), cache: 'no-store', signal: AbortSignal.timeout(300000) })
    const raw = await response.text()
    let data: Record<string, unknown> = {}
    try { data = raw ? JSON.parse(raw) : {} } catch { data = { error: raw || 'استجابة غير صالحة من Worker', stage: 'worker_response' } }
    if (!response.ok || data.success !== true) return NextResponse.json({ success: false, requestId: data.requestId, error: typeof data.error === 'string' ? data.error : `فشل Worker في مرحلة ${String(data.stage || 'analyze')} (HTTP ${response.status})`, stage: data.stage }, { status: response.status >= 400 ? response.status : 502 })
    if (!Array.isArray(data.clips) || data.clips.length === 0) return NextResponse.json({ success: false, requestId: data.requestId, error: 'Worker أعلن النجاح دون clips صالحة.', stage: 'contract_validation' }, { status: 502 })
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'TimeoutError' ? 'انتهت مهلة Worker أثناء تنزيل أو تحليل الفيديو.' : error instanceof Error ? `تعذر الاتصال بـ Worker: ${error.message}` : 'تعذر الاتصال بـ Worker.'
    return NextResponse.json({ success: false, error: message, stage: 'worker_unavailable' }, { status: 502 })
  }
}
