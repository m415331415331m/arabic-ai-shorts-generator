import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.url !== 'string' || !body.clipId || !['raw', 'render'].includes(body.mode)) return NextResponse.json({ error: 'بيانات التصدير غير مكتملة' }, { status: 400 })
  const configuredWorker = process.env.VIDEO_WORKER_URL?.trim()
  if (!configuredWorker) return NextResponse.json({ success: false, error: 'VIDEO_WORKER_URL غير مضبوط في بيئة الخادم.', stage: 'configuration' }, { status: 500 })
  const worker = configuredWorker.replace(/\/$/, '')
  try {
    const response = await fetch(`${worker}/${body.mode === 'raw' ? 'clip' : 'render'}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ url: body.url, clipId: body.clipId, edit: body.edit }), cache: 'no-store', signal: AbortSignal.timeout(300000) })
    const raw = await response.text()
    let data: Record<string, unknown> = {}
    try { data = raw ? JSON.parse(raw) : {} } catch { data = { error: raw || 'استجابة غير صالحة من Worker', stage: 'worker_response' } }
    if (!response.ok || data.success === false || typeof data.downloadUrl !== 'string') return NextResponse.json({ success: false, requestId: data.requestId, error: typeof data.error === 'string' ? data.error : `لم ينشئ Worker ملف MP4 (HTTP ${response.status})`, stage: data.stage || 'render' }, { status: response.status >= 400 ? response.status : 502 })
    return NextResponse.json({ success: true, requestId: data.requestId, downloadUrl: data.downloadUrl, resolution: '1080p', watermark: false })
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'TimeoutError' ? 'انتهت مهلة Worker أثناء الرندر.' : error instanceof Error ? `تعذر الاتصال بـ Worker: ${error.message}` : 'تعذر الاتصال بـ Worker.'
    return NextResponse.json({ success: false, error: message, stage: 'worker_unavailable' }, { status: 502 })
  }
}
