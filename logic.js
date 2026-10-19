const codeLength = 4;

function generateCombinationsLogic(numColors, allowDuplicates = true) {
    const results = [];
    function build(code) {
        if (code.length === codeLength) {
            results.push(code.slice());
            return;
        }
        for (let color = 0; color < numColors; color++) {
            if (!allowDuplicates && code.includes(color)) continue;
            code.push(color);
            build(code);
            code.pop();
        }
    }
    build([]);
    return results;
}

// Exact matches consume their positions first; each remaining color can match once.
function computeFeedback(guess, candidate) {
    let exact = 0;
    let partial = 0;
    const remainingGuess = [];
    const remainingCode = [];
    for (let i = 0; i < codeLength; i++) {
        if (guess[i] === candidate[i]) {
            exact++;
        } else {
            remainingGuess.push(guess[i]);
            remainingCode.push(candidate[i]);
        }
    }
    for (const color of remainingGuess) {
        const index = remainingCode.indexOf(color);
        if (index !== -1) {
            partial++;
            remainingCode.splice(index, 1);
        }
    }
    return { exact, partial };
}

function remainingCodes(state, numColors, allowDuplicates) {
    return generateCombinationsLogic(numColors, allowDuplicates).filter(code =>
        state.every(row => {
            if (row.slice(0, codeLength).some(color => color === null)) return true;
            const feedback = computeFeedback(row.slice(0, codeLength), code);
            return feedback.exact === row.slice(4, 8).filter(value => value === 2).length &&
                feedback.partial === row.slice(4, 8).filter(value => value === 1).length;
        })
    );
}

function solve_logic(state, numColors, _step, allowDuplicates = true) {
    const candidates = remainingCodes(state, numColors, allowDuplicates);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    // With no feedback, all colors are symmetric. Avoid scoring every opening
    // permutation, which is expensive with eight colors.
    if (state.every(row => row.slice(0, codeLength).some(color => color === null))) {
        return [0, 1, 2, 3];
    }

    let bestGuess = null;
    let bestEntropy = -Infinity;
    for (const guess of candidates) {
        const distribution = new Map();
        for (const secret of candidates) {
            const { exact, partial } = computeFeedback(guess, secret);
            const key = `${exact}-${partial}`;
            distribution.set(key, (distribution.get(key) || 0) + 1);
        }
        let entropy = 0;
        for (const count of distribution.values()) {
            const probability = count / candidates.length;
            entropy -= probability * Math.log2(probability);
        }
        if (entropy > bestEntropy) {
            bestEntropy = entropy;
            bestGuess = guess;
        }
    }
    return bestGuess;
}
