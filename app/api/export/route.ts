import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.url !== 'string' || !body.edit) return NextResponse.json({ error: 'بيانات التصدير غير مكتملة' }, { status: 400 })
  return NextResponse.json({ status: 'queued', resolution: '1080p', watermark: false, message: 'تم تجهيز طلب التصدير. اربط هذا المسار بعامل FFmpeg و yt-dlp في بيئة الإنتاج.', downloadUrl: null })
}
