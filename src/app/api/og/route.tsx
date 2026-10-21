/** Public brand image only. Result identifiers, nicknames and scores are ignored. */
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 90, background: 'linear-gradient(135deg,#0A1628,#16354F)', color: '#E8EDF2', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 30, color: '#C9A227', marginBottom: 30 }}>SAIL</div>
      <div style={{ fontSize: 68, fontWeight: 600 }}>Communication styles</div>
      <div style={{ fontSize: 28, marginTop: 30, color: '#A9BBD0' }}>Private results require participant or shared access.</div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' } },
  );
}
