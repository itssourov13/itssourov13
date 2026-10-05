export interface Stop {
  id: string;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
}

export const STOPS: Stop[] = [
  { id: 'overview', label: 'Overview', pos: [0, 9, 24], target: [0, 1.5, -2] },
  { id: 'core', label: 'Core', pos: [0, 3.2, 9], target: [0, 1.8, 0] },
  { id: 'projects', label: 'Projects', pos: [0, 7, 15], target: [0, 1.6, 0] },
  { id: 'activity', label: 'Activity', pos: [0, 7.5, -2], target: [0, 0.8, -14] },
  { id: 'timeline', label: 'Timeline', pos: [6, 4.5, 0], target: [14, 1, 0] },
  { id: 'media', label: 'Portrait', pos: [-6, 3, 0], target: [-14, 2.2, 0] },
];
