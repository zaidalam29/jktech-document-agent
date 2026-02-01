// src/tests/utils/logger.test.js
import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('Logger (default INFO level)', () => {
  let logger;
  let debugSpy;
  let infoSpy;

  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock('../../utils/logger');

    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const module = await import('../../utils/logger');
    logger = module.default;
  });

  test('does NOT log debug messages when level is INFO', () => {
    logger.debug('test message');

    expect(debugSpy).not.toHaveBeenCalled();
  });

  test('logs info messages when level is INFO', () => {
    logger.info('test message');

    expect(infoSpy).toHaveBeenCalledWith('[INFO]', 'test message');
  });
});
