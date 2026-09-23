import { getCalendarEvents } from './arrProxy.js';

export async function generateICalFeed(systemName = 'Arr House'): Promise<string> {
  const events = await getCalendarEvents();
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arr Hub//Unified Media Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${systemName} Releases`,
    'X-WR-TIMEZONE:UTC',
    `X-WR-CALDESC:Unified release calendar for Sonarr, Radarr, and Lidarr managed by ${systemName}`
  ];

  for (const event of events) {
    const dtstart = event.date.replace(/-/g, '');
    const category = event.service.toUpperCase();
    const cleanTitle = (event.seriesOrArtistTitle ? `${event.seriesOrArtistTitle} - ` : '') + event.title;
    const cleanDesc = (event.overview || `${event.mediaType.toUpperCase()} release on ${event.service}`)
      .replace(/[\r\n]+/g, ' ')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:arr-hub-${event.id}-${event.service}@arrhub.local`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`SUMMARY:[${event.service.toUpperCase()}] ${cleanTitle}`);
    lines.push(`DESCRIPTION:${cleanDesc}`);
    lines.push(`CATEGORIES:${category}`);
    lines.push(`STATUS:CONFIRMED`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
