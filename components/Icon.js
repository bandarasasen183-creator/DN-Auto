/**
 * Inline SVG icon set.
 *
 * Emoji render differently on every platform and read as clip-art in a trade
 * app, so every glyph in the interface comes from here instead. All icons are
 * drawn on a 24×24 grid with a 1.6 stroke so they sit together evenly, and
 * they inherit `currentColor` so they take the colour of whatever holds them.
 */

const PATHS = {
  // --- Navigation -------------------------------------------------------
  dashboard: 'M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z',
  calendarPlus: 'M8 2v3m8-3v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm7 8v5m-2.5-2.5h5',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  car: 'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM5 17H3v-5l2-5h14l2 5v5h-2M9 17h6M3 12h18',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 0 1-4-4l9-9Z M14.7 6.3 17 4l3 3-2.3 2.3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3.5 2',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9.5v-1.5a4 4 0 0 0-3-3.9M16 3.6a4 4 0 0 1 0 7.7',
  cash: 'M3 6h18v12H3V6Zm9 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 9v.01M18 15v.01',
  chart: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
  inbox: 'M4 13h4l2 3h4l2-3h4M4 13 6 5h12l2 8v6H4v-6Z',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H2a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z',
  bay: 'M3 21V8l9-5 9 5v13M3 21h18M9 21v-6h6v6M7 11h.01M17 11h.01',

  // --- Actions ----------------------------------------------------------
  plus: 'M12 5v14M5 12h14',
  check: 'm4 12.5 5 5L20 6.5',
  close: 'M6 6l12 12M18 6 6 18',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronRight: 'm9 6 6 6-6 6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.4-4.4',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  download: 'M12 3v12m-5-5 5 5 5-5M4 21h16',
  print: 'M7 8V3h10v5M7 18H4v-7h16v7h-3M7 14h10v7H7v-7Z',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h12',
  menu: 'M4 7h16M4 12h16M4 17h16',
  edit: 'M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Zm10-13 3 3',
  trash: 'M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13',

  // --- Status & feedback --------------------------------------------------
  bell: 'M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6ZM10.5 20a1.8 1.8 0 0 0 3 0',
  star: 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z',
  shield: 'M12 21s7-3.5 7-9V5.5L12 3 5 5.5V12c0 5.5 7 9 7 9Zm-2.5-9.5 2 2 4-4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v.01M12 11v6',
  alert: 'M12 8v5m0 3v.01M10.3 3.9 2.4 17.4A2 2 0 0 0 4.1 20.4h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',

  // --- Contact -----------------------------------------------------------
  phone: 'M6.6 3h3l1.5 4-2 1.4a12 12 0 0 0 5.5 5.5l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3Z',
  mail: 'M3 6h18v12H3V6Zm0 .5 9 6.5 9-6.5',
  pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  whatsapp: 'M3.5 20.5 5 16.4A8 8 0 1 1 8.2 19.4l-4.7 1.1Zm5.8-9.7c.4 2 2.4 4 4.4 4.4.6.1 1.3-.2 1.6-.7l.3-.6-2-1-.6.7a5.2 5.2 0 0 1-2-2l.7-.6-1-2-.6.3c-.6.3-.9 1-.8 1.5Z',

  // --- Assistant ---------------------------------------------------------
  chat: 'M21 12a8 8 0 0 1-8 8H4l2.2-2.8A8 8 0 1 1 21 12Z',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a6 6 0 0 0 12 0M12 18v3',
  form: 'M6 3h9l4 4v14H6V3Zm9 0v4h4M9 12h7M9 16h5',
  history: 'M3.5 10a9 9 0 1 1 1 6M3.5 5v5h5M12 8v4.5l3 2',
  send: 'M4 12 21 4l-7 17-2.5-7.5L4 12Z',
};

const VIEWBOX = '0 0 24 24';

export default function Icon({ name, size = 20, className = '', title, strokeWidth = 1.6 }) {
  const d = PATHS[name];
  if (!d) return null;

  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {d.split(' M').map((segment, i) => (
        <path key={i} d={i === 0 ? segment : `M${segment}`} />
      ))}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
