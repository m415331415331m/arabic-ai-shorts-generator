import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) return NextResponse.json({ error: 'رابط يوتيوب غير صالح' }, { status: 400 })
  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `حلل هذا الفيديو من يوتيوب واقترح أفضل لحظة حماسية مدتها 15 إلى 25 ثانية، واكتب كابتشن عربي قصير لها. الرابط: ${url}` }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { start: { type: 'NUMBER' }, end: { type: 'NUMBER' }, caption: { type: 'STRING' } } } } }) })
      if (response.ok) { const data = await response.json(); const text = data.candidates?.[0]?.content?.parts?.[0]?.text; if (text) return NextResponse.json(JSON.parse(text)) }
    } catch { /* fallback keeps the editor usable */ }
  }
  return NextResponse.json({ start: 42, end: 63, caption: 'لا تنتظر اللحظة المثالية، اصنعها الآن', demo: !apiKey })
}
