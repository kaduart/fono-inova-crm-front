let pendingCashflow: Promise<void> | null = null;
let releaseCashflow: (() => void) | null = null;
let activeCashflowLoads = 0;
const MAX_WAIT_MS = 30_000;

export function beginCashflowLoad(): () => void {
    if (!pendingCashflow) {
        pendingCashflow = new Promise<void>(resolve => { releaseCashflow = resolve; });
    }
    activeCashflowLoads++;
    let finished = false;
    return () => {
        if (finished) return;
        finished = true;
        activeCashflowLoads--;
        if (activeCashflowLoads === 0) {
            releaseCashflow?.();
            releaseCashflow = null;
            pendingCashflow = null;
        }
    };
}

export async function waitForCashflowLoad(): Promise<void> {
    const operation = pendingCashflow;
    if (!operation) return;
    await new Promise<void>(resolve => {
        const timeout = setTimeout(resolve, MAX_WAIT_MS);
        operation.then(() => {
            clearTimeout(timeout);
            resolve();
        });
    });
}
