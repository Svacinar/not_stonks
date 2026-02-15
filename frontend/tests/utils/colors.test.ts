import { describe, it, expect } from 'vitest';
import { hexToRgba } from '../../src/utils/colors';

describe('hexToRgba', () => {
  it('converts hex color to rgba with given alpha', () => {
    expect(hexToRgba('#2D6A4F', 0.3)).toBe('rgba(45, 106, 79, 0.3)');
  });

  it('converts hex color with full opacity', () => {
    expect(hexToRgba('#2D6A4F', 1)).toBe('rgba(45, 106, 79, 1)');
  });

  it('handles lowercase hex', () => {
    expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('handles uppercase hex', () => {
    expect(hexToRgba('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('handles white', () => {
    expect(hexToRgba('#FFFFFF', 0.3)).toBe('rgba(255, 255, 255, 0.3)');
  });

  it('handles black', () => {
    expect(hexToRgba('#000000', 0.3)).toBe('rgba(0, 0, 0, 0.3)');
  });
});
