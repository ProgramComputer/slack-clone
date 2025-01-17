import * as jdenticon from 'jdenticon'

/**
 * Generates an identicon SVG string for a given user ID
 * @param {string} userId - The user's ID to generate an identicon for
 * @param {number} size - The size of the identicon in pixels
 * @returns {string} The SVG string of the identicon
 */
export function generateIdenticon(userId, size = 200) {
  // Configure jdenticon for consistent styling
  jdenticon.configure({
    hues: [207], // Blue hue for consistent branding
    lightness: {
      color: [0.4, 0.8],
      grayscale: [0.3, 0.9]
    },
    saturation: {
      color: 0.5,
      grayscale: 0.0
    },
    backColor: '#ffffff'
  })

  // Generate the identicon as an SVG string
  return jdenticon.toSvg(userId, size)
}

/**
 * Converts an SVG string to a Blob that can be uploaded
 * @param {string} svgString - The SVG string to convert
 * @returns {Blob} A Blob of the SVG data
 */
export function svgToBlob(svgString) {
  return new Blob([svgString], { type: 'image/svg+xml' })
} 