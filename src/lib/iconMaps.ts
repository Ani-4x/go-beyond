import type { DimIndex } from '../data/content';
import type { IconName } from '../components/Icons';

/** Icon for each of the six growth dimensions, in the same 0-5 order as DIMENSIONS. */
export const DIMENSION_ICON: Record<DimIndex, IconName> = {
  0: 'brain',
  1: 'people',
  2: 'chart',
  3: 'brain',
  4: 'pin',
  5: 'leaf',
};

/** Icon for each moment category, keyed by its MOMENT_CATEGORIES key. */
export const MOMENT_ICON: Record<string, IconName> = {
  Reflect: 'reflect',
  Move: 'run',
  Connect: 'connect',
  Explore: 'pin',
  Build: 'build',
  Reset: 'leaf',
};
