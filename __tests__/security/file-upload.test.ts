import { validateFileUpload } from '@/lib/security'

describe('File Upload Security', () => {
  describe('validateFileUpload', () => {
    it('should accept valid image files', () => {
      const validFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      const result = validateFileUpload(validFile)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject files exceeding size limit', () => {
      const largeContent = new Array(11 * 1024 * 1024).join('x') // 11MB
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })
      const result = validateFileUpload(largeFile, { maxSizeMB: 10 })
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('File size exceeds 10MB limit')
    })

    it('should reject non-allowed file types', () => {
      const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' })
      const result = validateFileUpload(pdfFile)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid file type')
    })

    it('should reject dangerous file extensions', () => {
      const dangerousFiles = [
        new File([''], 'malware.exe', { type: 'application/x-exe' }),
        new File([''], 'script.bat', { type: 'application/x-batch' }),
        new File([''], 'shell.sh', { type: 'application/x-sh' }),
        new File([''], 'virus.js', { type: 'text/javascript' }),
      ]

      dangerousFiles.forEach(file => {
        const result = validateFileUpload(file)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Potentially dangerous file type')
      })
    })

    it('should handle custom allowed types', () => {
      const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' })
      const result = validateFileUpload(pdfFile, { 
        allowedTypes: ['application/pdf', 'image/jpeg'] 
      })
      
      expect(result.valid).toBe(true)
    })

    it('should validate file names with malicious patterns', () => {
      const maliciousFile = new File([''], '../../../etc/passwd.jpg', { type: 'image/jpeg' })
      const result = validateFileUpload(maliciousFile)
      
      // Should still validate based on extension and type, not path traversal
      expect(result.valid).toBe(true)
    })
  })
})