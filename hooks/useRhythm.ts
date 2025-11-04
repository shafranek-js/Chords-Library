import { useState, useMemo, useEffect } from 'react';
import type { RhythmPattern } from '../types';
import { PRESET_PATTERNS, getCustomPatterns, saveCustomPatterns } from '../music';

export const useRhythm = () => {
    const [customPatterns, setCustomPatternsState] = useState<RhythmPattern[]>([]);
    const allPatterns = useMemo(() => [...PRESET_PATTERNS, ...customPatterns], [customPatterns]);
    const [activePatternId, setActivePatternId] = useState(PRESET_PATTERNS[0].id);
    const [bpm, setBpm] = useState(120);

    useEffect(() => {
        setCustomPatternsState(getCustomPatterns());
    }, []);

    const setCustomPatterns = (patterns: RhythmPattern[]) => {
        setCustomPatternsState(patterns);
        saveCustomPatterns(patterns);
    };

    return { allPatterns, activePatternId, setActivePatternId, bpm, setBpm, customPatterns, setCustomPatterns };
};