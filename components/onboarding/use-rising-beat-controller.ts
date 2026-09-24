import { useCallback, useEffect, useRef, useState } from 'react';

import { MOTION } from '@/lib/design-tokens';

/** Cancels a pending advance on Back, jump, or unmount. Repeated taps cannot skip beats. */
export function useRisingBeatController(lastBeat: number, reducedMotion: boolean) {
    const [beat, setBeat] = useState(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const locked = useRef(false);

    useEffect(() => { locked.current = false; }, [beat]);

    const cancel = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        locked.current = false;
    }, []);

    useEffect(() => cancel, [cancel]);

    const advance = useCallback(() => {
        if (locked.current || beat >= lastBeat) return;
        locked.current = true;
        timer.current = setTimeout(() => {
            timer.current = null;
            setBeat((current) => Math.min(lastBeat, current + 1));
        }, reducedMotion ? 0 : MOTION.micro);
    }, [beat, lastBeat, reducedMotion]);

    const back = useCallback(() => {
        cancel();
        setBeat((current) => Math.max(0, current - 1));
    }, [cancel]);

    const jump = useCallback((nextBeat: number) => {
        cancel();
        setBeat(Math.max(0, Math.min(lastBeat, nextBeat)));
    }, [cancel, lastBeat]);

    return { beat, advance, back, jump, cancel };
}
