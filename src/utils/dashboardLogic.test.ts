import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCountdown,
  getRingDashOffset,
  getSubscriptionRingOffset,
  getAimTargetZone,
  getBanRisk,
  formatSpeedMultiplier,
  getSpeedFillPercent,
  INITIAL_REMAINING_SECONDS,
  TOTAL_PLAN_SECONDS,
} from './dashboardLogic';

test('formatCountdown formats initial 252082 seconds correctly', () => {
  const result = formatCountdown(INITIAL_REMAINING_SECONDS);
  assert.deepEqual(result, {
    hours: '70',
    minutes: '01',
    seconds: '22',
  });
});

test('formatCountdown clamps negative seconds to 00:00:00', () => {
  assert.deepEqual(formatCountdown(-45), {
    hours: '00',
    minutes: '00',
    seconds: '00',
  });
});

test('getRingDashOffset computes accurate ring progress', () => {
  assert.equal(getRingDashOffset(TOTAL_PLAN_SECONDS, TOTAL_PLAN_SECONDS), 0);
  assert.equal(getRingDashOffset(0, TOTAL_PLAN_SECONDS), 100);
  const initialOffset = getRingDashOffset(INITIAL_REMAINING_SECONDS, TOTAL_PLAN_SECONDS);
  assert.ok(initialOffset > 2.7 && initialOffset < 2.8);
});

test('getSubscriptionRingOffset always returns full ring (0 offset) when permanent', () => {
  assert.equal(getSubscriptionRingOffset(true, 0, TOTAL_PLAN_SECONDS), 0);
  assert.equal(getSubscriptionRingOffset(true, 1234, TOTAL_PLAN_SECONDS), 0);
  assert.equal(getSubscriptionRingOffset(false, 0, TOTAL_PLAN_SECONDS), 100);
});

test('getAimTargetZone resolves zones and crosshair positions cleanly', () => {
  assert.deepEqual(getAimTargetZone(100), { labelKey: 'HEAD', markerTopPercent: 14 });
  assert.deepEqual(getAimTargetZone(68), { labelKey: 'NECK', markerTopPercent: 29.36 });
  assert.deepEqual(getAimTargetZone(50), { labelKey: 'SHOULDERS', markerTopPercent: 38 });
  assert.deepEqual(getAimTargetZone(30), { labelKey: 'UPPER CHEST', markerTopPercent: 47.6 });
  assert.deepEqual(getAimTargetZone(0), { labelKey: 'CHEST', markerTopPercent: 62 });
});

test('getBanRisk reflects disabled and percentage thresholds', () => {
  assert.deepEqual(getBanRisk(false, 100), { level: 'off', fillPercent: 100 });
  assert.deepEqual(getBanRisk(true, 100), { level: 'extreme', fillPercent: 100 });
  assert.deepEqual(getBanRisk(true, 68), { level: 'high', fillPercent: 68 });
  assert.deepEqual(getBanRisk(true, 50), { level: 'medium', fillPercent: 50 });
  assert.deepEqual(getBanRisk(true, 20), { level: 'safe', fillPercent: 20 });
});

test('speed multiplier helpers format and calculate slider fill', () => {
  assert.equal(formatSpeedMultiplier(10), '×1.0');
  assert.equal(formatSpeedMultiplier(13), '×1.3');
  assert.equal(formatSpeedMultiplier(15), '×1.5');
  assert.equal(getSpeedFillPercent(10), 0);
  assert.equal(getSpeedFillPercent(15), 100);
  assert.equal(getSpeedFillPercent(12.5), 60);
});
