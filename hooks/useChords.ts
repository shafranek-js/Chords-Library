
import { useState, useMemo, useEffect } from 'react';
import { transformChordData } from '../parser';
import type { ChordFromJSON, DisplayChord, Instrument } from '../types';

export const useChords = (instrument: Instrument) => {
    const [fetchedChords, setFetchedChords] = useState<DisplayChord[]>([]);
    const [userChords, setUserChords] = useState<DisplayChord[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (instrument === 'ukulele') {
            fetch('/Common_Ukulele_chords.json')
                .then(res => res.json())
                .then((data: ChordFromJSON[]) => {
                    const transformed = transformChordData(data, instrument);
                    setFetchedChords(transformed);
                })
                .catch(err => {
                    console.error(`Failed to load chords for ukulele:`, err);
                    setFetchedChords([]);
                });
        } else if (instrument === 'guitar') {
            fetch('/Common_Guitar_chords.json')
                .then(res => {
                    if (res.ok) {
                        return res.json();
                    }
                    return [];
                })
                .then((data: ChordFromJSON[]) => {
                    const transformed = transformChordData(data, instrument);
                    setFetchedChords(transformed);
                })
                .catch(err => {
                    console.error(`Failed to load chords for guitar:`, err);
                    setFetchedChords([]);
                });
        }
        // Reset user chords and search when instrument changes
        setUserChords([]);
        setSearch('');
    }, [instrument]);

    const allChords = useMemo(() => {
        const combined = [...fetchedChords, ...userChords];
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
    }, [fetchedChords, userChords]);

    const filteredChords = useMemo(() => {
        if (!search.trim()) return allChords;
        const lowercasedSearch = search.toLowerCase().trim();
        return allChords.filter(chord =>
            chord.name.toLowerCase().startsWith(lowercasedSearch) ||
            chord.aliases.some(alias => alias.toLowerCase().startsWith(lowercasedSearch))
        ); // sorting is already done in allChords
    }, [search, allChords]);
    
    const addUserChords = (newChordsData: ChordFromJSON[]) => {
        const transformed = transformChordData(newChordsData, instrument);
        // We add to existing user chords, the memo will handle merging and deduplication
        setUserChords(prev => [...prev, ...transformed]);
    };

    return { chords: allChords, search, setSearch, filteredChords, addUserChords };
};
