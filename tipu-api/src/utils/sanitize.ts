import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content by stripping all tags
 * Used for text-only fields like displayName, bio, messages
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip ALL HTML tags
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
  })
}

/**
 * Recursively sanitize all string values in an object
 * Handles nested objects and arrays
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return sanitizeHtml(input)
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        sanitized[key] = sanitizeInput(input[key])
      }
    }
    return sanitized
  }

  // Return primitives unchanged (numbers, booleans, null)
  return input
}
