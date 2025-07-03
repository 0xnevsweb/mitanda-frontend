'use client'

import { useEffect, useState } from 'react';
import { getCountdown } from '@/utils';

export default function CountdownTimer({ timestamp }: { timestamp: bigint }) {
  const [countdown, setCountdown] = useState(getCountdown(timestamp));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(timestamp));
    }, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <span className={countdown.status === 'due' ? 'text-yellow-600' :
      countdown.status === 'past-due' ? 'text-red-600' : ''}>
      {countdown.timeString}
    </span>
  );
}