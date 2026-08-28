import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.url !== 'string' || !body.clipId || !['raw', 'render'].includes(body.mode)) return NextResponse.json({ error: 'بيانات التصدير غير مكتملة' }, { status: 400 })
  const configuredWorker = process.env.VIDEO_WORKER_URL_2?.trim()
  if (!configuredWorker) return NextResponse.json({ success: false, error: 'VIDEO_WORKER_URL_2 غير مضبوط في بيئة الخادم.', stage: 'configuration' }, { status: 500 })
  const worker = configuredWorker.replace(/\/$/, '')
  const requestId = crypto.randomUUID()
  const workerHost = (() => { try { return new URL(worker).hostname } catch { return '[invalid-worker-url]' } })()
  const endpoint = `${worker}/${body.mode === 'raw' ? 'clip' : 'render'}`
  console.log('[API EXPORT] requestId:', requestId)
  console.log('[API EXPORT] worker hostname:', workerHost)
  console.log('[API EXPORT] outbound URL:', endpoint)
  console.log('[API EXPORT] export mode:', body.mode, 'clip ID:', body.clipId)
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ url: body.url, clipId: body.clipId, mode: body.mode, edit: body.edit }), cache: 'no-store', signal: AbortSignal.timeout(300000) })
    const raw = await response.text()
    let data: Record<string, unknown>
    try {
      data = raw ? JSON.parse(raw) : { success: false, stage: 'worker_response', error: 'Worker returned an empty response.' }
    } catch {
      data = { success: false, stage: 'worker_response', error: raw || 'Worker returned invalid JSON.' }
    }
    console.log('[API EXPORT] worker status:', response.status)
    console.log('[API EXPORT] worker response:', data)
    if (!response.ok) return NextResponse.json(data, { status: response.status })
    if (data.success !== true || typeof data.downloadUrl !== 'string') {
      return NextResponse.json({ ...data, success: false, stage: data.stage || 'render', error: typeof data.error === 'string' ? data.error : 'Worker returned no valid download URL.' }, { status: 502 })
    }
    return NextResponse.json({ success: true, requestId: data.requestId, downloadUrl: data.downloadUrl, resolution: '1080p', watermark: false })
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'TimeoutError' ? 'انتهت مهلة Worker أثناء الرندر.' : error instanceof Error ? `تعذر الاتصال بـ Worker: ${error.message}` : 'تعذر الاتصال بـ Worker.'
    return NextResponse.json({ success: false, error: message, stage: 'worker_unavailable' }, { status: 502 })
  }
}
