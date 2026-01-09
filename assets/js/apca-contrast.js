/* ============================================
   WCAG 3.0 APCA CONTRAST CHECKER
   Implements the Advanced Perceptual Contrast Algorithm
   Reference: https://github.com/Myndex/apca-w3

   Usage:
   const lc = window.APCA.calculate('#000000', '#ffffff');
   const rating = window.APCA.getRating(lc, 16, false);
   const issues = window.APCA.scanPage();
   ============================================ */

(function () {
  'use strict';

  // APCA Constants (SAPC-8 G-series)
  const SA98G = {
    mainTRC: 2.4,
    normBG: 0.56,
    normTXT: 0.57,
    revTXT: 0.62,
    revBG: 0.65,
    blkThrs: 0.022,
    blkClmp: 1.414,
    scaleBoW: 1.14,
    scaleWoB: 1.14,
    loBoWoffset: 0.027,
    loWoBoffset: 0.027,
    deltaYmin: 0.0005,
    loClip: 0.1,
    mFactor: 1.9468554433171,
  };

  /**
   * Convert sRGB to Y (luminance)
   * @param {number} r - Red channel (0-255)
   * @param {number} g - Green channel (0-255)
   * @param {number} b - Blue channel (0-255)
   * @returns {number} Luminance value
   */
  function sRGBtoY(r, g, b) {
    // Convert 8-bit sRGB to decimal
    let rsRGB = r / 255.0;
    let gsRGB = g / 255.0;
    let bsRGB = b / 255.0;

    // Apply sRGB transformation
    function sRGBTransform(chan) {
      return chan <= 0.04045 ? chan / 12.92 : Math.pow((chan + 0.055) / 1.055, 2.4);
    }

    rsRGB = sRGBTransform(rsRGB);
    gsRGB = sRGBTransform(gsRGB);
    bsRGB = sRGBTransform(bsRGB);

    // Calculate luminance (Y)
    return 0.2126729 * rsRGB + 0.7151522 * gsRGB + 0.072175 * bsRGB;
  }

  /**
   * Parse CSS color to RGB
   * @param {string} color - CSS color string
   * @returns {{r: number, g: number, b: number}|null}
   */
  function parseColor(color) {
    // Create temporary element to parse color
    const temp = document.createElement('div');
    temp.style.color = color;
    document.body.appendChild(temp);
    const computed = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);

    // Parse rgb/rgba
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
      };
    }
    return null;
  }

  /**
   * Calculate APCA contrast
   * @param {string} textColor - Text color (CSS color)
   * @param {string} bgColor - Background color (CSS color)
   * @returns {number} APCA contrast value (Lc)
   */
  function calculateAPCA(textColor, bgColor) {
    const text = parseColor(textColor);
    const bg = parseColor(bgColor);

    if (!text || !bg) {
      console.error('Invalid colors provided to APCA calculator');
      return 0;
    }

    // Calculate Y (luminance) values
    let txtY = sRGBtoY(text.r, text.g, text.b);
    let bgY = sRGBtoY(bg.r, bg.g, bg.b);

    // Soft clamp black levels
    txtY = txtY > SA98G.blkThrs ? txtY : txtY + Math.pow(SA98G.blkThrs - txtY, SA98G.blkClmp);
    bgY = bgY > SA98G.blkThrs ? bgY : bgY + Math.pow(SA98G.blkThrs - bgY, SA98G.blkClmp);

    // Calculate the SAPC/APCA contrast
    let SAPC = 0.0;
    let outputContrast = 0.0;

    // Determine polarity (dark text on light bg, or light text on dark bg)
    if (Math.abs(bgY - txtY) < SA98G.deltaYmin) {
      return 0.0; // Colors are too similar
    }

    if (bgY > txtY) {
      // Dark text on light background
      SAPC = (Math.pow(bgY, SA98G.normBG) - Math.pow(txtY, SA98G.normTXT)) * SA98G.scaleBoW;
      outputContrast = SAPC < SA98G.loClip ? 0.0 : SAPC - SA98G.loBoWoffset;
    } else {
      // Light text on dark background
      SAPC = (Math.pow(bgY, SA98G.revBG) - Math.pow(txtY, SA98G.revTXT)) * SA98G.scaleWoB;
      outputContrast = SAPC > -SA98G.loClip ? 0.0 : SAPC + SA98G.loWoBoffset;
    }

    return outputContrast * 100;
  }

  /**
   * Get APCA rating and recommendation
   * @param {number} lc - APCA Lc value
   * @param {number} fontSize - Font size in px
   * @param {boolean} isBold - Is text bold?
   * @returns {{rating: string, passes: boolean, message: string}}
   */
  function getAPCARating(lc, fontSize = 16, isBold = false) {
    const absLc = Math.abs(lc);

    // APCA conformance levels (approximate)
    // These are based on WCAG 3 draft specifications
    const levels = [
      {
        threshold: 90,
        level: 'AAA+',
        fontSize: 'any',
        message: 'Excellent contrast for all text sizes',
      },
      {
        threshold: 75,
        level: 'AAA',
        fontSize: '12px+',
        message: 'Very good contrast, suitable for body text',
      },
      {
        threshold: 60,
        level: 'AA',
        fontSize: '14px+',
        message: 'Good contrast for regular body text',
      },
      { threshold: 45, level: 'A', fontSize: '18px+', message: 'Adequate for large text only' },
      {
        threshold: 30,
        level: 'Sub',
        fontSize: '24px+',
        message: 'Only suitable for very large text',
      },
      { threshold: 0, level: 'Fail', fontSize: 'none', message: 'Insufficient contrast' },
    ];

    for (const level of levels) {
      if (absLc >= level.threshold) {
        const passes =
          absLc >= 75 ||
          (absLc >= 60 && fontSize >= 14) ||
          (absLc >= 45 && (fontSize >= 18 || (fontSize >= 14 && isBold)));

        return {
          rating: level.level,
          passes: passes,
          message: level.message,
          lc: lc.toFixed(2),
        };
      }
    }

    return {
      rating: 'Fail',
      passes: false,
      message: 'Insufficient contrast',
      lc: lc.toFixed(2),
    };
  }

  /**
   * Check element contrast
   * @param {HTMLElement} element - Element to check
   * @returns {object} Contrast analysis results
   */
  function checkElementContrast(element) {
    const styles = window.getComputedStyle(element);
    const textColor = styles.color;
    const bgColor = styles.backgroundColor;
    const fontSize = parseFloat(styles.fontSize);
    const fontWeight = parseInt(styles.fontWeight) || 400;
    const isBold = fontWeight >= 600;

    const lc = calculateAPCA(textColor, bgColor);
    const rating = getAPCARating(lc, fontSize, isBold);

    return {
      element: element,
      textColor: textColor,
      backgroundColor: bgColor,
      fontSize: fontSize,
      fontWeight: fontWeight,
      lc: lc,
      rating: rating,
    };
  }

  /**
   * Scan page for contrast issues
   * @returns {Array} Array of elements with contrast issues
   */
  function scanPageContrast() {
    const issues = [];
    const elements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, a, button, label, span, div'
    );

    elements.forEach((el) => {
      // Skip if element has no visible text
      if (!el.textContent.trim()) return;

      const result = checkElementContrast(el);
      if (!result.rating.passes) {
        issues.push(result);
      }
    });

    return issues;
  }

  // Expose APCA functions globally
  window.APCA = {
    calculate: calculateAPCA,
    getRating: getAPCARating,
    checkElement: checkElementContrast,
    scanPage: scanPageContrast,
    parseColor: parseColor,
  };

  console.log('[APCA] WCAG 3.0 APCA Contrast Checker loaded');
})();
