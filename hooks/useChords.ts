import { useState, useMemo, useEffect } from 'react';
import { transformChordData } from '../parser';
import type { ChordFromJSON, DisplayChord, Instrument } from '../types';

const CHORD_URLS: Record<Instrument, string> = {
    ukulele: 'https://raw.githubusercontent.com/shafranek-js/Chords-Library/refs/heads/main/chords/Common_Ukulele_chords.json',
    guitar: 'https://raw.githubusercontent.com/shafranek-js/Chords-Library/refs/heads/main/chords/Common_Guitar_chords.json',
};

export const useChords = (instrument: Instrument) => {
    const [isLoading, setIsLoading] = useState(true);
    const [fetchedChords, setFetchedChords] = useState<Record<Instrument, DisplayChord[]>>({ ukulele: [], guitar: [] });
    const [userChords, setUserChords] = useState<Record<Instrument, DisplayChord[]>>({ ukulele: [], guitar: [] });
    const [search, setSearch] = useState('');

    useEffect(() => {
        // Fetch all instrument chords on initial load
        const instruments: Instrument[] = ['ukulele', 'guitar'];
        Promise.all(
            instruments.map(inst =>
                fetch(CHORD_URLS[inst])
                    .then(res => {
                        if (!res.ok) {
                            console.error(`Failed to fetch ${inst} chords: ${res.statusText}`);
                            return [];
                        }
                        return res.json();
                    })
                    .then((data: ChordFromJSON[]) => ({
                        instrument: inst,
                        chords: transformChordData(data, inst),
                    }))
                    .catch(err => {
                        console.error(`Error processing ${inst} chords:`, err);
                        return { instrument: inst, chords: [] };
                    })
            )
        ).then(results => {
            const allFetchedChords = results.reduce((acc, result) => {
                acc[result.instrument] = result.chords;
                return acc;
            }, {} as Record<Instrument, DisplayChord[]>);
            setFetchedChords(allFetchedChords);
            setIsLoading(false);
        });
    }, []); // Empty dependency array means this runs only once on mount

    useEffect(() => {
        // Reset search when instrument changes, but keep the loaded chords
        setSearch('');
    }, [instrument]);

    const allChords = useMemo(() => {
        const currentFetched = fetchedChords[instrument] || [];
        const currentUser = userChords[instrument] || [];
        const combined = [...currentFetched, ...currentUser];

        const chordMap = new Map<string, DisplayChord>();

        combined.forEach(chord => {
            const existingChord = chordMap.get(chord.name);
            if (existingChord) {
                // Merge diagrams, avoiding duplicates
                const existingDiagramsJson = new Set(existingChord.diagrams.map(d => JSON.stringify(d)));
                chord.diagrams.forEach(newDiagram => {
                    const newDiagramJson = JSON.stringify(newDiagram);
                    if (!existingDiagramsJson.has(newDiagramJson)) {
                        existingChord.diagrams.push(newDiagram);
                        existingDiagramsJson.add(newDiagramJson);
                    }
                });
            } else {
                // Use a deep copy to avoid mutating the original state objects
                chordMap.set(chord.name, JSON.parse(JSON.stringify(chord)));
            }
        });

        return Array.from(chordMap.values()).sort((a,b) => a.name.localeCompare(b.name));
    }, [instrument, fetchedChords, userChords]);

    const filteredChords = useMemo(() => {
        if (!search.trim()) return allChords;
        const lowercasedSearch = search.toLowerCase().trim();
        return allChords.filter(chord =>
            chord.name.toLowerCase().startsWith(lowercasedSearch) ||
            chord.aliases.some(alias => alias.toLowerCase().startsWith(lowercasedSearch))
        );
    }, [search, allChords]);
    
    const addUserChords = (newChordsData: ChordFromJSON[]) => {
        const transformed = transformChordData(newChordsData, instrument);
        setUserChords(prev => ({
            ...prev,
            [instrument]: [...(prev[instrument] || []), ...transformed]
        }));
    };

    return { chords: allChords, search, setSearch, filteredChords, addUserChords, isLoading };
};
