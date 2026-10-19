// Minimax solver. Rebuild candidates from the full history so manual guesses,
// repeated solver clicks, and new games cannot leave a stale candidate set.
function solve_knuth(state, numColors, _step, allowDuplicates = true) {
    const candidates = remainingCodes(state, numColors, allowDuplicates);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const played = new Set(state
        .filter(row => row.slice(0, 4).every(color => color !== null))
        .map(row => row.slice(0, 4).join(',')));
    if (played.size === 0) {
        return allowDuplicates ? [0, 0, 1, 1] : [0, 1, 2, 3];
    }

    const possibleGuesses = generateCombinationsLogic(numColors, true);
    const candidateSet = new Set(candidates.map(code => code.join(',')));
    let bestGuess = null;
    let bestScore = Infinity;
    let bestIsCandidate = false;

    for (const guess of possibleGuesses) {
        const key = guess.join(',');
        if (played.has(key)) continue;
        const counts = new Map();
        let worstCase = 0;
        for (const secret of candidates) {
            const { exact, partial } = computeFeedback(guess, secret);
            const feedbackKey = `${exact}-${partial}`;
            const count = (counts.get(feedbackKey) || 0) + 1;
            counts.set(feedbackKey, count);
            worstCase = Math.max(worstCase, count);
            if (worstCase > bestScore) break;
        }
        const isCandidate = candidateSet.has(key);
        if (worstCase < bestScore || (worstCase === bestScore && isCandidate && !bestIsCandidate)) {
            bestScore = worstCase;
            bestGuess = guess;
            bestIsCandidate = isCandidate;
        }
    }
    return bestGuess;
}
