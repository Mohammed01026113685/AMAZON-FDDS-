import React, { useEffect, useState } from 'react';

interface Props {
    value: number;
    formatter?: (v: number) => string;
}

export const AnimatedNumber: React.FC<Props> = ({ value, formatter = (v) => v.toString() }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value;
        if (start === end) {
            setDisplayValue(end);
            return;
        }
        
        let totalDuration = 1500; // 1.5 seconds for a satisfying count up
        let startTimestamp: number | null = null;
        
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / totalDuration, 1);
            
            // easeOutExpo for a fast start and slow finish
            const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            setDisplayValue(start + ease * (end - start));
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayValue(end);
            }
        };
        
        window.requestAnimationFrame(step);
    }, [value]);

    return <span>{formatter(displayValue)}</span>;
};
