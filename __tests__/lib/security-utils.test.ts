/**
 * Tests for Security Utilities
 * @module lib/security
 *
 * Tests sanitizeHtml, sanitizeText, sanitizeNumber,
 * generateCSRFToken, validateFileUpload, and patterns.
 */

import {
  sanitizeHtml,
  sanitizeText,
  sanitizeNumber,
  generateCSRFToken,
  validateFileUpload,
  patterns,
} from '@/lib/security';

describe('Security Utilities', () => {
  // ===========================================================================
  // sanitizeHtml
  // ===========================================================================

  describe('sanitizeHtml', () => {
    it('should allow safe tags', () => {
      expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
      expect(sanitizeHtml('<i>italic</i>')).toBe('<i>italic</i>');
      expect(sanitizeHtml('<em>emphasis</em>')).toBe('<em>emphasis</em>');
      expect(sanitizeHtml('<strong>strong</strong>')).toBe('<strong>strong</strong>');
      expect(sanitizeHtml('<p>paragraph</p>')).toBe('<p>paragraph</p>');
      expect(sanitizeHtml('<br>')).toContain('br');
    });

    it('should strip dangerous tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).not.toContain('script');
      expect(sanitizeHtml('<iframe src="evil.com">')).not.toContain('iframe');
      expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toContain('img');
    });

    it('should strip all attributes', () => {
      expect(sanitizeHtml('<b class="red">text</b>')).toBe('<b>text</b>');
      expect(sanitizeHtml('<p style="color:red">text</p>')).toBe('<p>text</p>');
    });

    it('should handle event handlers in tags', () => {
      const result = sanitizeHtml('<div onmouseover="alert(1)">hover</div>');
      expect(result).not.toContain('onmouseover');
    });

    it('should handle nested HTML', () => {
      const result = sanitizeHtml('<p><b>bold</b> and <i>italic</i></p>');
      expect(result).toBe('<p><b>bold</b> and <i>italic</i></p>');
    });

    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should preserve plain text', () => {
      expect(sanitizeHtml('Hello world')).toBe('Hello world');
    });
  });

  // ===========================================================================
  // sanitizeText
  // ===========================================================================

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).not.toContain('<');
      expect(sanitizeText('<b>bold</b>')).not.toContain('<');
    });

    it('should remove angle brackets', () => {
      expect(sanitizeText('a < b > c')).not.toContain('<');
      expect(sanitizeText('a < b > c')).not.toContain('>');
    });

    it('should trim whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('should preserve normal text', () => {
      expect(sanitizeText('Hello world')).toBe('Hello world');
    });
  });

  // ===========================================================================
  // sanitizeNumber
  // ===========================================================================

  describe('sanitizeNumber', () => {
    it('should parse string numbers', () => {
      expect(sanitizeNumber('42')).toBe(42);
      expect(sanitizeNumber('3.14')).toBe(3.14);
      expect(sanitizeNumber('-10')).toBe(-10);
    });

    it('should pass through number values', () => {
      expect(sanitizeNumber(42)).toBe(42);
      expect(sanitizeNumber(0)).toBe(0);
      expect(sanitizeNumber(-5)).toBe(-5);
    });

    it('should return null for non-numeric strings', () => {
      expect(sanitizeNumber('abc')).toBeNull();
      expect(sanitizeNumber('')).toBeNull();
      expect(sanitizeNumber('not a number')).toBeNull();
    });

    it('should return null for NaN', () => {
      expect(sanitizeNumber(NaN)).toBeNull();
    });

    it('should handle string with leading zeros', () => {
      expect(sanitizeNumber('007')).toBe(7);
    });
  });

  // ===========================================================================
  // generateCSRFToken
  // ===========================================================================

  describe('generateCSRFToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens each call', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(token1).not.toBe(token2);
    });
  });

  // ===========================================================================
  // validateFileUpload
  // ===========================================================================

  describe('validateFileUpload', () => {
    function createMockFile(name: string, size: number, type: string): File {
      return { name, size, type } as File;
    }

    it('should accept valid image files', () => {
      const file = createMockFile('photo.jpg', 1024 * 1024, 'image/jpeg');
      const result = validateFileUpload(file);
      expect(result.valid).toBe(true);
    });

    it('should accept PNG files', () => {
      const file = createMockFile('icon.png', 500000, 'image/png');
      expect(validateFileUpload(file).valid).toBe(true);
    });

    it('should accept GIF files', () => {
      const file = createMockFile('animation.gif', 2000000, 'image/gif');
      expect(validateFileUpload(file).valid).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const file = createMockFile('huge.jpg', 11 * 1024 * 1024, 'image/jpeg');
      const result = validateFileUpload(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10MB');
    });

    it('should respect custom size limit', () => {
      const file = createMockFile('small.jpg', 3 * 1024 * 1024, 'image/jpeg');
      const result = validateFileUpload(file, { maxSizeMB: 2 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('2MB');
    });

    it('should reject dangerous file extensions', () => {
      const dangerous = ['file.exe', 'script.bat', 'cmd.cmd', 'hack.sh', 'run.ps1', 'virus.vbs', 'code.js', 'app.jar', 'x.com', 'y.scr'];

      dangerous.forEach(name => {
        const file = createMockFile(name, 100, 'image/jpeg');
        const result = validateFileUpload(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('dangerous');
      });
    });

    it('should reject dangerous extensions case-insensitively', () => {
      const file = createMockFile('virus.EXE', 100, 'image/jpeg');
      const result = validateFileUpload(file);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid MIME types', () => {
      const file = createMockFile('data.pdf', 1024, 'application/pdf');
      const result = validateFileUpload(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should accept custom allowed types', () => {
      const file = createMockFile('doc.pdf', 1024, 'application/pdf');
      const result = validateFileUpload(file, { allowedTypes: ['application/pdf'] });
      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // Validation Patterns
  // ===========================================================================

  describe('patterns', () => {
    describe('email', () => {
      it('should match valid emails', () => {
        expect(patterns.email.test('test@example.com')).toBe(true);
        expect(patterns.email.test('user@domain.co')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(patterns.email.test('notanemail')).toBe(false);
        expect(patterns.email.test('@domain.com')).toBe(false);
      });
    });

    describe('pin', () => {
      it('should match 4-digit PINs', () => {
        expect(patterns.pin.test('1234')).toBe(true);
        expect(patterns.pin.test('0000')).toBe(true);
      });

      it('should reject non-4-digit values', () => {
        expect(patterns.pin.test('123')).toBe(false);
        expect(patterns.pin.test('12345')).toBe(false);
        expect(patterns.pin.test('abcd')).toBe(false);
      });
    });

    describe('mileage', () => {
      it('should match valid mileage', () => {
        expect(patterns.mileage.test('12345')).toBe(true);
        expect(patterns.mileage.test('0')).toBe(true);
      });

      it('should reject too long', () => {
        expect(patterns.mileage.test('12345678')).toBe(false);
      });
    });

    describe('phone', () => {
      it('should match valid phone formats', () => {
        expect(patterns.phone.test('+1 (509) 200-8000')).toBe(true);
        expect(patterns.phone.test('5092008000')).toBe(true);
        expect(patterns.phone.test('+15092008000')).toBe(true);
      });

      it('should reject letters', () => {
        expect(patterns.phone.test('abc')).toBe(false);
      });
    });
  });
});
