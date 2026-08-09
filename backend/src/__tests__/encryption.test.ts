import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, encryptJson, decryptJson } from '../shared/services/encryption.service.js';

describe('encryption.service (AES-256-GCM)', () => {
  it('round-trips a plain string', () => {
    const plaintext = 'حساس جداً: بيانات جلسة واتساب';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV) even for the same input', () => {
    const a = encrypt('same input');
    const b = encrypt('same input');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('same input');
    expect(decrypt(b)).toBe('same input');
  });

  it('round-trips arbitrary JSON (mirrors how Baileys creds/keys are stored)', () => {
    const value = { creds: { noiseKey: [1, 2, 3] }, nested: { arr: ['a', 'b'], n: 42 } };
    const encrypted = encryptJson(value);
    const decrypted = decryptJson<typeof value>(encrypted);
    expect(decrypted).toEqual(value);
  });

  it('throws when the payload has been tampered with (auth tag mismatch)', () => {
    const encrypted = encrypt('secret');
    const [iv, tag, data] = encrypted.split('.');
    const tamperedData = Buffer.from(data!, 'base64');
    tamperedData[0] = (tamperedData[0]! + 1) % 256;
    const tampered = [iv, tag, tamperedData.toString('base64')].join('.');
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws on a malformed payload', () => {
    expect(() => decrypt('not-a-valid-payload')).toThrow();
  });
});
