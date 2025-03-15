const codeLength = 4;

// Function to generate all combinations (codes) of given length using numbers 0 to num_colors-1
function generateCombinationsLogic(numColors) {
    let results = [];
    function helper(current) {
        if (current.length === codeLength) {
            results.push(current.slice());
            return;
        }
        for (let i = 0; i < numColors; i++) {
            current.push(i);
            helper(current);
            current.pop();
        }
    }
    helper([]);
    return results;
}

// Function to compute feedback (exact and white matches) between a guess and a candidate code
function computeFeedback(guess, candidate) {
    let exact = 0;
    let partial = 0;
    let guessCopy = guess.slice();
    let candidateCopy = candidate.slice();

    // Count exact matches
    for (let i = 0; i < guess.length; i++) {
        if (guessCopy[i] === candidateCopy[i]) {
            exact++;
            guessCopy[i] = null;
            candidateCopy[i] = null;
        }
    }
    // Count partial matches
    for (let i = 0; i < guess.length; i++) {
        if (guessCopy[i] !== null) {
            let index = candidateCopy.indexOf(guessCopy[i]);
            if (index !== -1) {
                partial++;
                candidateCopy[index] = null;
            }
        }
    }
    return { exact, partial };
}

// Main logic-based solver function
// state: an array of guess rows, where each row is [guess0, guess1, guess2, guess3, feedback0, feedback1, feedback2, feedback3]
// num_colors: number of colors available (colors are represented as numbers 0 to num_colors - 1)
// step: current step (not used in this implementation but kept for consistency)
function solve_logic(state, num_colors, step) {
    // Generate all possible candidate codes
    const allCodes = generateCombinationsLogic(num_colors);
    
    // Filter candidates based on the constraints from each played row in state
    let candidates = allCodes.filter(code => {
        for (let row of state) {
            // Skip rows that haven't been played yet
            if (row.slice(0, 4).includes(null)) {
                continue;
            }
            let guess = row.slice(0, 4);
            // Determine expected feedback counts from the row's feedback part (positions 4-7)
            let exactCount = row.slice(4, 8).filter(val => val === 2).length;
            let partialCount = row.slice(4, 8).filter(val => val === 1).length;
            
            let fb = computeFeedback(guess, code);
            if (fb.exact !== exactCount || fb.partial !== partialCount) {
                return false;
            }
        }
        return true;
    });
    
    if (candidates.length === 0) {
        console.warn("No valid candidates found. Check the state for inconsistencies.");
        return [];
    }
    
    
    if (candidates.length === 1) {
        return candidates[0];
    }

    // Choose candidate that maximizes expected information gain using Shannon entropy
    let bestCandidate = null;
    let bestEntropy = -Infinity;
    const totalCandidates = candidates.length;

    for (let guess of candidates) {
        let distribution = {};
        // Simulate feedback for each possible secret in candidates
        for (let secret of candidates) {
            let fb = computeFeedback(guess, secret);
            // Create a unique key based on feedback: "exact-white"
            let key = fb.exact + '-' + fb.white;
            distribution[key] = (distribution[key] || 0) + 1;
        }
        let entropy = 0;
        for (let key in distribution) {
            let p = distribution[key] / totalCandidates;
            entropy -= p * Math.log2(p);
        }
        if (entropy > bestEntropy) {
            bestEntropy = entropy;
            bestCandidate = guess;
        }
    }
    return bestCandidate;
}
