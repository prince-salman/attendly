import { describe, it, expect } from 'vitest';
import { evaluateHeadPose, Point2D } from '../headPoseDetector';

/**
 * Helper generator 68 landmark point dummy
 */
function createMockLandmarks(options: {
  yawOffset?: number; // > 0 = nose closer to jaw right (user turned right)
  pitchOffset?: number; // < 0 = nose closer to eyes (up), > 0 = nose closer to chin (down)
} = {}): Point2D[] {
  const points: Point2D[] = [];
  const { yawOffset = 0, pitchOffset = 0 } = options;

  // Initialize 68 points at default positions
  for (let i = 0; i < 68; i++) {
    points.push({ x: 200, y: 200 });
  }

  // Jaw: 0 (x=100), 16 (x=300), 8 (x=200, y=320)
  points[0] = { x: 100, y: 200 };
  points[16] = { x: 300, y: 200 };
  points[8] = { x: 200, y: 320 }; // Chin

  // Eyes: right (x=150, y=160), left (x=250, y=160)
  points[36] = { x: 140, y: 160 };
  points[39] = { x: 160, y: 160 };
  points[42] = { x: 240, y: 160 };
  points[45] = { x: 260, y: 160 };

  // Nose bridge and tip: p27 (x=200, y=170), p30 (tip)
  points[27] = { x: 200, y: 170 };
  // Default neutral nose tip: x=200, y=228 (fraction = (228 - 160) / (320 - 160) = 68 / 160 = 0.425)
  points[30] = {
    x: 200 + yawOffset,
    y: 228 + pitchOffset
  };

  return points;
}

describe('headPoseDetector - evaluateHeadPose', () => {
  it('correctly validates FRONT pose when face is neutral', () => {
    const neutralPoints = createMockLandmarks();
    const result = evaluateHeadPose(neutralPoints, 'FRONT', 'user');

    expect(result.currentPose).toBe('FRONT');
    expect(result.isMatch).toBe(true);
    expect(result.poseAccuracyPercent).toBeGreaterThanOrEqual(80);
  });

  it('rejects advancement if user is FRONT but target is RIGHT', () => {
    const neutralPoints = createMockLandmarks();
    const result = evaluateHeadPose(neutralPoints, 'RIGHT', 'user');

    expect(result.currentPose).toBe('FRONT');
    expect(result.isMatch).toBe(false);
    expect(result.guidanceText).toContain('Turn your head to the Right');
  });

  it('correctly validates RIGHT pose when user turns right', () => {
    // When user turns right on selfie camera, distNoseToRightJaw shrinks (yawOffset < 0 in sensor x, so distLeft > distRight)
    // nose tip shifts to x=160 (distRight = 60, distLeft = 140 -> rawYaw = (140 - 60)/200 = 0.40)
    const rightPoints = createMockLandmarks({ yawOffset: -40 });
    const result = evaluateHeadPose(rightPoints, 'RIGHT', 'user');

    expect(result.currentPose).toBe('RIGHT');
    expect(result.isMatch).toBe(true);
    expect(result.poseAccuracyPercent).toBeGreaterThanOrEqual(75);
  });

  it('correctly validates LEFT pose when user turns left', () => {
    // nose tip shifts to x=240 (distRight = 140, distLeft = 60 -> rawYaw = (60 - 140)/200 = -0.40)
    const leftPoints = createMockLandmarks({ yawOffset: 40 });
    const result = evaluateHeadPose(leftPoints, 'LEFT', 'user');

    expect(result.currentPose).toBe('LEFT');
    expect(result.isMatch).toBe(true);
    expect(result.poseAccuracyPercent).toBeGreaterThanOrEqual(75);
  });

  it('detects wrong direction if user turns left when target is RIGHT', () => {
    const leftPoints = createMockLandmarks({ yawOffset: 40 });
    const result = evaluateHeadPose(leftPoints, 'RIGHT', 'user');

    expect(result.currentPose).toBe('LEFT');
    expect(result.isMatch).toBe(false);
    expect(result.guidanceText).toContain('Wrong direction');
  });

  it('correctly validates UP pose when head is tilted up', () => {
    // Nose tip moves closer to eye line: y drops from 228 to 205 (fraction = (205-160)/160 = 0.28 < 0.36)
    const upPoints = createMockLandmarks({ pitchOffset: -23 });
    const result = evaluateHeadPose(upPoints, 'UP', 'user');

    expect(result.currentPose).toBe('UP');
    expect(result.isMatch).toBe(true);
  });

  it('correctly validates DOWN pose when head is tilted down', () => {
    // Nose tip moves closer to chin: y rises from 228 to 250 (fraction = (250-160)/160 = 0.56 > 0.50)
    const downPoints = createMockLandmarks({ pitchOffset: 22 });
    const result = evaluateHeadPose(downPoints, 'DOWN', 'user');

    expect(result.currentPose).toBe('DOWN');
    expect(result.isMatch).toBe(true);
  });
});
