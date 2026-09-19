// GPX export of a run (port of RunGPXExporter behavior): accepted points only, pauses split into segments.
import type { RunRecord, RunTrackPoint } from './types';

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Returns GPX XML, or null when the run has no accepted track points. */
export function runToGpx(run: RunRecord, points: RunTrackPoint[], creator = 'LOCKED IN 2'): string | null {
  const accepted = points.filter((p) => p.accepted).sort((a, b) => a.sequence - b.sequence);
  if (accepted.length === 0) return null;

  const segments: RunTrackPoint[][] = [];
  let current: RunTrackPoint[] = [];
  let currentPaused = accepted[0].paused;
  for (const p of accepted) {
    if (p.paused !== currentPaused) {
      if (current.length > 0 && !currentPaused) segments.push(current);
      current = [];
      currentPaused = p.paused;
    }
    if (!p.paused) current.push(p);
  }
  if (current.length > 0 && !currentPaused) segments.push(current);

  const trkpt = (p: RunTrackPoint): string => {
    const parts = [`<trkpt lat="${p.latitude.toFixed(7)}" lon="${p.longitude.toFixed(7)}">`];
    if (Number.isFinite(p.altitude)) parts.push(`<ele>${p.altitude.toFixed(2)}</ele>`);
    parts.push(`<time>${new Date(p.timestamp).toISOString()}</time>`);
    parts.push('</trkpt>');
    return parts.join('');
  };

  const name = `Lauf ${new Date(run.startTime ?? run.date).toISOString().slice(0, 10)}`;
  const body = segments.map((seg) => `<trkseg>${seg.map(trkpt).join('')}</trkseg>`).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<gpx version="1.1" creator="${escapeXml(creator)}" xmlns="http://www.topografix.com/GPX/1/1">` +
    `<metadata><name>${escapeXml(name)}</name></metadata>` +
    `<trk><name>${escapeXml(name)}</name>${body}</trk></gpx>`
  );
}
