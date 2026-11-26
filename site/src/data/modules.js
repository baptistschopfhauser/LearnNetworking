import { lang, tr } from '../i18n.js';
import { MODULES_EN } from './modules.en.js';
import { MODULES_DE } from './modules.de.js';

export const LEVELS = [
  { id: 'foundations', name: tr('Foundations', 'Grundlagen'), blurb: tr('What a network is, how data is layered, and how bits travel.', 'Was ein Netzwerk ist, wie Daten geschichtet werden und wie Bits reisen.') },
  { id: 'core', name: tr('Core mechanics', 'Kernmechanik'), blurb: tr('Addressing, switching, routing and reliable transport.', 'Adressierung, Switching, Routing und zuverlässiger Transport.') },
  { id: 'apps', name: tr('The Internet you use', 'Das Internet, das du nutzt'), blurb: tr('Names, the web, encryption and keeping networks safe.', 'Namen, das Web, Verschlüsselung und sichere Netze.') },
  { id: 'pro', name: tr('Pro track', 'Profi-Spur'), blurb: tr('Diagnose problems like an engineer and run services at scale.', 'Fehler wie ein Profi finden und Dienste im großen Maßstab betreiben.') },
];

// English defines order and ids; a German version replaces its English twin when present.
const DE = Object.fromEntries(MODULES_DE.map((m) => [m.id, m]));
export const MODULES = MODULES_EN.map((m) => (lang === 'de' && DE[m.id]) || m);
export const moduleById = (id) => MODULES.find((m) => m.id === id);
