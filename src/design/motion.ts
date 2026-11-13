import tokens from './motion-tokens.json';

// The JSON is also consumed by Tailwind. Motion expects seconds, CSS uses ms.
export const motionDuration = Object.fromEntries(
  Object.entries(tokens.duration).map(([name, ms]) => [name, ms / 1000]),
) as Record<keyof typeof tokens.duration, number>;
export const motionEase = {
  smoothOut: tokens.ease.smoothOut as [number, number, number, number],
  inOut: tokens.ease.inOut as [number, number, number, number],
};
export const motionScale = tokens.scale;
export const motionDistance = tokens.distance;
