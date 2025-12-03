export const formatAIText = (text: string | undefined): string => {
    if (!text) return '';

    // remove markdown bold/italic asterisks (*word* to word)
    let clean = text.replace(/\*+/g, '');

    // remove underscores used for emphasis (_word_ to word)
    clean = clean.replace(/_+/g, '');

    // remove surrounding single quotes only if they act as emphasis ('word' to word)
    // the regex looks for 'word' and keeps just the word. It preserves contractions like "don't" or "it's".
    clean = clean.replace(/'([^']+)'/g, '$1');

    return clean.trim();
};