export const runtime = 'nodejs'

export async function POST(request: Request) {
  const configuredWorker = process.env.VIDEO_WORKER_URL_2?.trim()
  if (!configuredWorker) return Response.json({ success: false, stage: 'configuration', error: 'VIDEO_WORKER_URL_2 is not configured.' }, { status: 500 })
  const incoming = await request.formData()
  const video = incoming.get('video')
  if (!(video instanceof File)) return Response.json({ success: false, stage: 'validation', error: 'Missing video file.' }, { status: 400 })
  const allowed = ['video/mp4', 'video/quicktime', 'video/webm']
  if (!allowed.includes(video.type)) return Response.json({ success: false, stage: 'validation', error: 'Unsupported video type. Use MP4, MOV, or WebM.' }, { status: 415 })
  const form = new FormData()
  form.append('video', video, video.name)
  const worker = configuredWorker.replace(/\/$/, '')
  try {
    const response = await fetch(`${worker}/analyze-upload`, { method: 'POST', body: form, cache: 'no-store', signal: AbortSignal.timeout(600000) })
    const data = await response.json().catch(() => ({ success: false, stage: 'worker_response', error: 'Worker returned invalid JSON.' }))
    if (!response.ok) return Response.json(data, { status: response.status })
    if (data.success !== true || !Array.isArray(data.clips) || data.clips.length === 0) return Response.json({ ...data, success: false, stage: data.stage || 'contract_validation' }, { status: 502 })
    return Response.json(data)
  } catch (error) {
    return Response.json({ success: false, stage: 'worker_unavailable', error: error instanceof Error ? error.message : 'Worker request failed.' }, { status: 502 })
  }
}
