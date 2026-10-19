import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {JobStore, createEmptyJob} from '../../src/shorts/storage/job-store';
import {loadConfig} from '../../src/shorts/config/env';

describe('job store', () => {
  let dir: string;
  let store: JobStore;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'shorts-'));
    store = new JobStore(dir);
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('persists and reloads jobs', () => {
    const config = loadConfig();
    const job = createEmptyJob('demo', 'Demo', config);
    store.save(job);
    const loaded = store.load('demo');
    expect(loaded?.title).toBe('Demo');
  });

  it('acquires exclusive locks', () => {
    expect(store.acquireLock('demo')).toBe(true);
    expect(store.acquireLock('demo')).toBe(false);
    store.releaseLock('demo');
    expect(store.acquireLock('demo')).toBe(true);
    store.releaseLock('demo');
  });

  it('invalidates later phases', () => {
    const config = loadConfig();
    const job = createEmptyJob('demo', 'Demo', config);
    store.setPhase(job, 'generating_script', {status: 'done'});
    store.setPhase(job, 'validating', {status: 'done'});
    store.setPhase(job, 'rendering', {status: 'done'});
    store.invalidateFrom(job, 'validating');
    expect(job.phases.validating?.status).toBe('pending');
    expect(job.phases.rendering?.status).toBe('pending');
    expect(job.phases.generating_script?.status).toBe('done');
  });
});
