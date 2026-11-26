import { lang } from '../i18n.js';
import { GLOSSARY_EN } from './glossary.en.js';
import { GLOSSARY_DE } from './glossary.de.js';

// German entries are keyed by the English term: { 'ACK': ['ACK', 'Bestätigung …'] }.
export const GLOSSARY = lang === 'de' ? GLOSSARY_EN.map(([t, d, m]) => (GLOSSARY_DE[t] ? [...GLOSSARY_DE[t], m] : [t, d, m])) : GLOSSARY_EN;
