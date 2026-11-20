import type { CSSProperties } from 'react';
export const hueStyle = (h: number): CSSProperties => ({ ['--h' as string]: h }) as CSSProperties;
export const SWATCHES = [25, 55, 95, 150, 190, 230, 260, 290, 330, 10];
