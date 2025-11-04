
import { useState, useEffect } from 'react';
import type { Diagram, PracticeSetItem, SavedSet } from '../types';

const getVoicingId = (chordName: string, diag: Diagram) => {
    return `${chordName}-${diag.startFret}-${diag.frets.join('')}-${diag.barres?.map(b => `${b.fret}${b.strings.join('')}`).join('') ?? ''}`;
};

export const usePracticeSet = () => {
    const [practiceSet, setPracticeSet] = useState<PracticeSetItem[]>([]);
    const [savedSets, setSavedSets] = useState<SavedSet[]>([]);
    const [isSetsModalOpen, setSetsModalOpen] = useState(false);
    const [isSaveSetModalOpen, setIsSaveSetModalOpen] = useState(false);

    useEffect(() => {
        try {
            setSavedSets(JSON.parse(localStorage.getItem('savedSets') || '[]'));
        } catch (e) {
            console.error("Failed to load saved sets from localStorage", e);
            setSavedSets([]);
        }
    }, []);

    const handleVoicingSelect = (chordName: string, diagram: Diagram) => {
        const id = getVoicingId(chordName, diagram);
        setPracticeSet(prev => {
            if (prev.some(item => item.id === id)) {
                return prev.filter(item => item.id !== id);
            }
            return [...prev, { id, chordName, diagram }];
        });
    };

    const handleRemoveFromSet = (id: string) => {
        setPracticeSet(prev => prev.filter(item => item.id !== id));
    };

    const handleClearSet = () => setPracticeSet([]);

    const handleSaveSet = () => {
        if (practiceSet.length > 0) {
            setIsSaveSetModalOpen(true);
        }
    };

    const handleConfirmSaveSet = (setName: string) => {
        if (setName && setName.trim()) {
            const newSet: SavedSet = { name: setName.trim(), voicings: practiceSet };
            const updatedSets = [...savedSets.filter(s => s.name !== newSet.name), newSet];
            setSavedSets(updatedSets);
            localStorage.setItem('savedSets', JSON.stringify(updatedSets));
            alert(`Set "${setName}" saved!`);
        }
    };

    const handleLoadSet = (set: SavedSet) => {
        setPracticeSet(set.voicings);
        setSetsModalOpen(false);
    };

    const handleDeleteSet = (setName: string) => {
        if (window.confirm(`Are you sure you want to delete the set "${setName}"?`)) {
            const updatedSets = savedSets.filter(s => s.name !== setName);
            setSavedSets(updatedSets);
            localStorage.setItem('savedSets', JSON.stringify(updatedSets));
        }
    };

    return {
        practiceSet,
        setPracticeSet,
        savedSets,
        isSetsModalOpen,
        setSetsModalOpen,
        isSaveSetModalOpen,
        setIsSaveSetModalOpen,
        handleVoicingSelect,
        handleRemoveFromSet,
        handleClearSet,
        handleSaveSet,
        handleConfirmSaveSet,
        handleLoadSet,
        handleDeleteSet,
    };
};
