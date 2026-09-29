/**
 * Generic Polling Helper
 * Runs an asynchronous task at a set interval until it resolves, times out, or is aborted.
 */

export function createPoller({
  task,
  intervalMs = 2500,
  maxDurationMs = 5 * 60 * 1000,
  onTick,
  onSuccess,
  onFailure,
  onTimeout,
}) {
  let isRunning = false;
  let timerId = null;
  let startTime = null;

  async function poll() {
    if (!isRunning) return;

    const elapsed = Date.now() - startTime;
    if (elapsed >= maxDurationMs) {
      isRunning = false;
      if (typeof onTimeout === "function") {
        onTimeout(new Error("Polling timed out."));
      }
      return;
    }

    try {
      const result = await task();

      if (typeof onTick === "function") {
        onTick(result);
      }

      if (result && result.done) {
        isRunning = false;
        if (result.success && typeof onSuccess === "function") {
          onSuccess(result.data);
        } else if (!result.success && typeof onFailure === "function") {
          onFailure(result.error || result.data);
        }
        return;
      }
    } catch (err) {
      if (typeof onTick === "function") {
        onTick({ error: err });
      }
    }

    if (isRunning) {
      timerId = setTimeout(poll, intervalMs);
    }
  }

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      startTime = Date.now();
      poll();
    },
    stop() {
      isRunning = false;
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    },
    isRunning() {
      return isRunning;
    },
  };
}
