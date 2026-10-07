import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../api';
import patientService from '../patientService';

vi.mock('../api', () => ({ default: { get: vi.fn() } }));

describe('patient profile requests', () => {
  beforeEach(() => vi.mocked(API.get).mockReset());

  it('shares concurrent reads but fetches fresh data after completion', async () => {
    let complete!: (value: any) => void;
    vi.mocked(API.get).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const first = patientService.getById('patient-1');
    const second = patientService.getById('patient-1');
    expect(API.get).toHaveBeenCalledTimes(1);
    complete({ data: { data: { _id: 'patient-1', debt: 1090 } } });
    expect(await first).toEqual(await second);
    vi.mocked(API.get).mockResolvedValueOnce({ data: { data: { _id: 'patient-1', debt: 930 } } });
    expect(await patientService.getById('patient-1')).toMatchObject({ debt: 930 });
    expect(API.get).toHaveBeenCalledTimes(2);
  });

  it('keeps reads for different patients independent', async () => {
    vi.mocked(API.get).mockResolvedValue({ data: { data: {} } });
    await Promise.all([patientService.getById('patient-1'), patientService.getById('patient-2')]);
    expect(API.get).toHaveBeenCalledTimes(2);
  });

  it('allows retry after a failed read', async () => {
    vi.mocked(API.get).mockRejectedValueOnce(new Error('offline'));
    await expect(patientService.getById('patient-1')).rejects.toThrow('offline');
    vi.mocked(API.get).mockResolvedValueOnce({ data: { data: { _id: 'patient-1' } } });
    await expect(patientService.getById('patient-1')).resolves.toMatchObject({ _id: 'patient-1' });
    expect(API.get).toHaveBeenCalledTimes(2);
  });
});
