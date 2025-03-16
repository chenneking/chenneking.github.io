let combinations = null;

function resetKnuthSolver() {
    combinations = null;
}


// Returns a new Set containing elements that are in both A and B
function setIntersection(A, B) {
    return new Set([...A].filter(x => B.has(x)));
}

// Generates all possible 4-length combinations using numbers 0 to numOptions - 1
function generateCombinationsKnuth(numOptions) {
    const combinations = [];
    for (let i = 0; i < numOptions; i++) {
        for (let j = 0; j < numOptions; j++) {
            for (let k = 0; k < numOptions; k++) {
                for (let l = 0; l < numOptions; l++) {
                    combinations.push([i, j, k, l]);
                }
            }
        }
    }
    return combinations;
}

// Checks if the intersection of colors between sourceGuess and referenceGuess has at least minNumMatches
function sameColorCheck(minNumMatches, sourceGuess, referenceGuess) {
    if (sourceGuess.length != referenceGuess.length) {
        return false;
    }
    const colors_source = new Set(sourceGuess);
    const colors_reference = new Set(referenceGuess);

    const intersect = setIntersection(colors_source, colors_reference);

    return intersect.size >= minNumMatches;
}

// Checks if at least minNumMatches positions match exactly between sourceGuess and referenceGuess
function sameColorAndPositionCheck(minNumMatches, sourceGuess, referenceGuess) {
    if (sourceGuess.length != referenceGuess.length) {
        return false;
    }

    let match_count = 0;

    for (let i = 0; i < sourceGuess.length; i++) {
        if (sourceGuess[i] == referenceGuess[i]) {
            match_count++;
        }
    }

    return match_count >= minNumMatches;
}

// Verifies if the feedback for source_guess compared to reference_guess matches the expected exact and color matches.
function checkAgainstFeedback(exact_matches, color_matches, source_guess, reference_guess) {
    if (source_guess.length != reference_guess.length) {
        return false;
    }

    let match_indices = [];

    for (let i = 0; i < source_guess.length; i++) {
        if (match_indices.length >= exact_matches) {
            break;
        }
        if (source_guess[i] == reference_guess[i]) {
            match_indices.push(i);
        }
    }

    // If the combination doesn't meet the exact match standards, we can immediately eliminate it
    if (match_indices.length != exact_matches) {
        return false;
    }

    // Remove the indices we used for the previous check
    let filtered_source_guess = source_guess.filter((_, i) => !match_indices.includes(i));
    let filtered_reference_guess = reference_guess.filter((_, i) => !match_indices.includes(i));

    let colors_source = new Set(filtered_source_guess);
    let colors_reference = new Set(filtered_reference_guess);

    let intersect = setIntersection(colors_source, colors_reference);

    return intersect.size == color_matches;
}

// Parses the feedback array to count exact matches (value 2) and color matches (value 1).
function parseFeedback(feedback) {
    let exactMatches = 0;
    let colorMatches = 0;

    for (let i = 0; i < feedback.length; i++) {
        if (feedback[i] == 2) {
            exactMatches++;
        }
        else if (feedback[i] == 1) {
            colorMatches++;
        }
    }
    return { exactMatches, colorMatches }
}

// Calculates the number of exact and color matches between guess and candidate.
function calculateFeedback2(guess, candidate) {
    let exactMatches = 0;
    let colorMatches = 0;

    let usedIndicesGuess = new Set();
    let usedIndicesCandidate = new Set();

    // Calculate exact matches
    for (let i = 0; i < guess.length; i++) {
        if (guess[i] === candidate[i]) {
            exactMatches++;
            usedIndicesGuess.add(i);
            usedIndicesCandidate.add(i);
        }
    }

    // Calculate color matches (ignoring exact matches)
    for (let i = 0; i < guess.length; i++) {
        if (usedIndicesGuess.has(i)) continue;
        for (let j = 0; j < candidate.length; j++) {
            if (usedIndicesCandidate.has(j)) continue;
            if (guess[i] === candidate[j]) {
                colorMatches++;
                usedIndicesGuess.add(i);
                usedIndicesCandidate.add(j);
                break;
            }
        }
    }

    return { exactMatches, colorMatches };
}

// Main Knuth-based solver function
// state: an array of guess rows, where each row is [guess0, guess1, guess2, guess3, feedback0, feedback1, feedback2, feedback3]
// num_colors: number of colors available (colors are represented as numbers 0 to num_colors - 1)
// step: current step (not used in this implementation but kept for consistency)
function solve_knuth(state, num_colors, step) {
    if (state[0][0] == null) {
        return [0, 0, 1, 1]; // Initial guess
    }

    if (combinations == null) {
        combinations = generateCombinationsKnuth(num_colors);
    }

    let source_guess = state[step - 1].slice(0, 4);
    let source_feedback = state[step - 1].slice(4);
    let feedback = parseFeedback(source_feedback);

    // Filter combinations based on feedback
    combinations = combinations.filter(candidate => {
        const { exactMatches, colorMatches } = calculateFeedback2(source_guess, candidate);
        return exactMatches === feedback.exactMatches && colorMatches === feedback.colorMatches;
    });

    // console.log(`Step ${step}: Remaining candidates: ${combinations.length}`);

    if (combinations.length < 1) {
        return null; // No solution
    }

    // Generate all possible guesses excluding previous guesses
    let all_combinations = generateCombinationsKnuth(num_colors).filter(guess =>
        !state.some(pastGuess => JSON.stringify(pastGuess.slice(0, 4)) === JSON.stringify(guess))
    );

    let scores = {};
    all_combinations.forEach(guess => {
        let feedbackCounts = {};

        combinations.forEach(candidate => {
            const { exactMatches, colorMatches } = calculateFeedback2(guess, candidate);
            const feedbackKey = `${exactMatches}-${colorMatches}`;
            feedbackCounts[feedbackKey] = (feedbackCounts[feedbackKey] || 0) + 1;
        });

        // Worst-case scenario (max remaining candidates)
        scores[JSON.stringify(guess)] = Math.max(...Object.values(feedbackCounts));
    });

    // console.log('Minimax scores:');
    // Object.keys(scores).forEach(guess => {
    //     console.log(`Guess: ${JSON.parse(guess)}, Score: ${scores[guess]}`);
    // });

    const candidateSet = new Set(combinations.map(candidate => JSON.stringify(candidate)));

    const minScore = Math.min(...Object.values(scores));
    const minimalGuesses = Object.keys(scores).filter(guessStr => scores[guessStr] === minScore);

    let bestGuess;
    for (let guessStr of minimalGuesses) {
        if (candidateSet.has(guessStr)) {
            bestGuess = JSON.parse(guessStr);
            break;
        }
    }
    if (!bestGuess) {
        bestGuess = JSON.parse(minimalGuesses[0]);
    }

    // console.log(`Step ${step}: Best guess: ${bestGuess}`);
    return bestGuess;
}