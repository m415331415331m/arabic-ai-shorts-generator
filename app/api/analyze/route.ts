import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) return NextResponse.json({ error: 'رابط يوتيوب غير صالح' }, { status: 400 })
  const configuredWorker = process.env.VIDEO_WORKER_URL_2?.trim()
  if (!configuredWorker) return NextResponse.json({ success: false, error: 'VIDEO_WORKER_URL_2 غير مضبوط في بيئة الخادم.', stage: 'configuration' }, { status: 500 })
  const worker = configuredWorker.replace(/\/$/, '')
  const requestId = crypto.randomUUID()
  const safeInputUrl = (() => { try { const parsed = new URL(url); return `${parsed.origin}${parsed.pathname}` } catch { return '[invalid-url]' } })()
  const workerHost = (() => { try { return new URL(worker).hostname } catch { return '[invalid-worker-url]' } })()
  const outboundUrl = `${worker}/analyze`
  console.log('[API ANALYZE] requestId:', requestId)
  console.log('[API ANALYZE] worker hostname:', workerHost)
  console.log('[API ANALYZE] received URL:', safeInputUrl)
  console.log('[API ANALYZE] outbound URL:', `${worker}/analyze`)
  try {
    const response = await fetch(outboundUrl, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ url }), cache: 'no-store', signal: AbortSignal.timeout(300000) })
    const raw = await response.text()
    let data: Record<string, unknown>
    try {
      data = raw ? JSON.parse(raw) : { success: false, stage: 'worker_response', error: 'Worker returned an empty response.' }
    } catch {
      data = { success: false, stage: 'worker_response', error: raw || 'Worker returned invalid JSON.' }
    }
    console.log('[API ANALYZE] worker status:', response.status)
    console.log('[API ANALYZE] worker response:', data)
    if (!response.ok) return NextResponse.json(data, { status: response.status })
    if (data.success !== true || !Array.isArray(data.clips) || data.clips.length === 0) {
      return NextResponse.json({ ...data, success: false, stage: data.stage || 'contract_validation', error: typeof data.error === 'string' ? data.error : 'Worker returned no valid clips.' }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'TimeoutError' ? 'انتهت مهلة Worker أثناء تنزيل أو تحليل الفيديو.' : error instanceof Error ? `تعذر الاتصال بـ Worker: ${error.message}` : 'تعذر الاتصال بـ Worker.'
    return NextResponse.json({ success: false, error: message, stage: 'worker_unavailable' }, { status: 502 })
  }
}
