import { headers } from 'next/headers';

const EVENTS_DOMAIN = process.env.NEXT_PUBLIC_EVENTS_DOMAIN || 'wallawallaevents.com';
const TRAVEL_DOMAIN = process.env.NEXT_PUBLIC_TRAVEL_DOMAIN || 'wallawalla.travel';

export async function isEventsDomain(): Promise<boolean> {
  const headersList = await headers();
  return headersList.get('x-events-domain') === 'true';
}

export async function getCanonicalUrl(path: string): Promise<string> {
  const onEvents = await isEventsDomain();
  const base = onEvents
    ? `https://${EVENTS_DOMAIN}`
    : `https://${TRAVEL_DOMAIN}`;
  return `${base}${path}`;
}

export function getTravelUrl(path: string): string {
  return `https://${TRAVEL_DOMAIN}${path}`;
}

export function getEventsUrl(path: string): string {
  return `https://${EVENTS_DOMAIN}${path}`;
}
