import { describe, it, expect } from 'vitest';
import {
  classifyJid,
  extractDigitsFromPhoneJid,
  parsePhoneDetails,
  parsePhoneFromJid,
} from '../shared/utils/phoneParser.js';

describe('classifyJid', () => {
  it('classifies a normal phone JID', () => {
    expect(classifyJid('966501234567@s.whatsapp.net')).toBe('phone');
  });
  it('classifies the legacy @c.us format as phone', () => {
    expect(classifyJid('966501234567@c.us')).toBe('phone');
  });
  it('classifies an LID JID', () => {
    expect(classifyJid('184926592942@lid')).toBe('lid');
  });
  it('classifies a group JID', () => {
    expect(classifyJid('120363012345678901@g.us')).toBe('group');
  });
  it('classifies a broadcast JID', () => {
    expect(classifyJid('status@broadcast')).toBe('broadcast');
  });
  it('returns unknown for garbage input', () => {
    expect(classifyJid('not-a-jid')).toBe('unknown');
    expect(classifyJid('')).toBe('unknown');
  });
});

describe('extractDigitsFromPhoneJid', () => {
  it('extracts digits from a plain phone JID', () => {
    expect(extractDigitsFromPhoneJid('966501234567@s.whatsapp.net')).toBe('966501234567');
  });
  it('strips a device suffix like :12', () => {
    expect(extractDigitsFromPhoneJid('966501234567:12@s.whatsapp.net')).toBe('966501234567');
  });
  it('returns null for a group JID', () => {
    expect(extractDigitsFromPhoneJid('120363012345678901@g.us')).toBeNull();
  });
  it('returns null for an LID JID (must not be treated as a phone number)', () => {
    expect(extractDigitsFromPhoneJid('184926592942@lid')).toBeNull();
  });
  it('rejects numbers outside the plausible E.164 length range', () => {
    expect(extractDigitsFromPhoneJid('123@s.whatsapp.net')).toBeNull();
  });
});

describe('parsePhoneDetails — countries explicitly named in the spec', () => {
  const cases: Array<[string, string, string]> = [
    ['966501234567', 'SA', 'السعودية'],
    ['967712345678', 'YE', 'اليمن'],
    ['971501234567', 'AE', 'الإمارات'],
    ['96550123456', 'KW', 'الكويت'],
    ['97455123456', 'QA', 'قطر'],
    ['97333123456', 'BH', 'البحرين'],
    ['96892123456', 'OM', 'عُمان'],
    ['201001234567', 'EG', 'مصر'],
    ['962791234567', 'JO', 'الأردن'],
    ['9647712345678', 'IQ', 'العراق'],
  ];

  for (const [digits, expectedIso, expectedArabicName] of cases) {
    it(`parses ${digits} as ${expectedIso} (${expectedArabicName})`, () => {
      const details = parsePhoneDetails(digits);
      expect(details).not.toBeNull();
      expect(details?.countryIso).toBe(expectedIso);
      expect(details?.countryNameAr).toBe(expectedArabicName);
      expect(details?.e164).toBe(`+${digits}`);
    });
  }

  it('returns isValid=false gracefully for unparseable digit strings instead of throwing', () => {
    const details = parsePhoneDetails('0000000000');
    expect(details).not.toBeNull();
    expect(details?.isValid).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(parsePhoneDetails('abc')).toBeNull();
    expect(parsePhoneDetails('')).toBeNull();
  });
});

describe('parsePhoneFromJid (end-to-end helper)', () => {
  it('resolves a full JID straight to country details', () => {
    const details = parsePhoneFromJid('966501234567@s.whatsapp.net');
    expect(details?.countryIso).toBe('SA');
  });

  it('returns null for group/broadcast/LID JIDs', () => {
    expect(parsePhoneFromJid('120363012345678901@g.us')).toBeNull();
    expect(parsePhoneFromJid('status@broadcast')).toBeNull();
    expect(parsePhoneFromJid('184926592942@lid')).toBeNull();
  });
});
