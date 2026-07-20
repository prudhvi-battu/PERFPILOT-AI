import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Shared hook for running load tests with polling, timeout, and cleanup.
 * Used by both ExecutiveDashboard and AlertDashboard.
 */
export default function useLoadTest() {
  const [status, setStatus] = useState(null); // null | 'running' | 'done'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const runLoadTest = useCallback(async (scenario, customUsers = null, customDuration = null, onComplete = null) => {
    const token = localStorage.getItem('token');
    let maxPollTimeout = null;
    let maxPollReached = false;

    setStatus('running');
    setResult(null);
    setError(null);

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    try {
      // Build request body - allow custom users and duration override
      const safeUsers = customUsers ? Math.max(1, Math.min(customUsers, 2000)) : null;
      const safeDuration = customDuration ? Math.max(5000, Math.min(customDuration, 300000)) : null;
      const body = { scenario };
      if (safeUsers) body.users = safeUsers;
      if (safeDuration) body.duration = safeDuration;

      await api.post('/api/loadtest/run', body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 5-min safety timeout
      maxPollTimeout = setTimeout(() => {
        maxPollReached = true;
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setStatus(null);
        setError('Load test timed out after 5 minutes. Check server logs.');
      }, 300000);

      pollRef.current = setInterval(async () => {
        try {
          if (!pollRef.current || maxPollReached) return;
          const statusRes = await api.get('/api/loadtest/status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!statusRes.data.isRunning) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            if (maxPollTimeout) clearTimeout(maxPollTimeout);
            setStatus('done');
            setResult(statusRes.data.lastResult);
            // Fire completion callback (e.g., to refresh alert data)
            if (onComplete) onComplete(statusRes.data.lastResult);
          }
        } catch (e) { /* ignore polling errors */ }
      }, 3000);
    } catch (err) {
      if (maxPollTimeout) clearTimeout(maxPollTimeout);
      setStatus(null);
      setError(err.response?.data?.error || err.message);
    }
  }, []);

  return { status, result, error, runLoadTest };
}
