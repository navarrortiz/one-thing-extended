import {
    getConfiguredTextFile,
    getNonEmptyLines,
    writeFileContents
} from './textFileUtils.js';

export default class TextFileTaskProvider {
    /**
     * @param {object} settings - Extension settings
     */
    constructor(settings) {
        this._settings = settings;
    }

    /**
     * Gets the current thing from the first non-empty line of the configured text file.
     *
     * @returns {Promise<string>} Current thing
     */
    async getCurrentThing() {
        const file = getConfiguredTextFile(this._settings);

        if (!file)
            return '';

        const lines = await getNonEmptyLines(file);
        const line = lines[0];

        return line?.trim() ?? '';
    }

    /**
     * Gets the upcoming things from the configured text file.
     *
     * @param {number} [limit=5] - Maximum number of upcoming lines
     * @param {number} [maxLineLength=90] - Maximum length per line
     * @returns {Promise<string[]>} Upcoming non-empty lines excluding the current thing
     */
    async getNextThings(limit = 5, maxLineLength = 90) {
        const file = getConfiguredTextFile(this._settings);

        if (!file)
            return [];

        const lines = await getNonEmptyLines(file);

        return lines
            .slice(1, limit + 1)
            .map(value => truncateLine(value, maxLineLength));
    }

    /**
     * Validates and returns the current thing to execute.
     *
     * @returns {Promise<string>} Current thing value
     */
    async startCurrentThing() {
        const currentThing = await this.getCurrentThing();

        if (currentThing === '')
            throw new Error('No current thing available to start.');

        return currentThing;
    }

    /**
     * Pauses the current thing execution.
     *
     * @returns {undefined}
     */
    pauseCurrentThing() {
        return undefined;
    }

    /**
     * Completes the active current thing in the configured text file.
     *
     * @param {string} activeValue - Thing value that was started
     * @param {string} elapsedLabel - Formatted elapsed execution time
     * @returns {Promise<void>}
     */
    async stopCurrentThing(activeValue, elapsedLabel) {
        const file = getConfiguredTextFile(this._settings);

        if (!file)
            throw new Error('No text file configured.');

        const lines = await getNonEmptyLines(file);
        const currentLine = lines[0] ?? '';

        if (currentLine !== activeValue)
            throw new Error('The active thing is no longer the first text-file line.');

        const completedLine = `${activeValue} : (done) ${elapsedLabel}`;
        const nextContents = [...lines.slice(1), completedLine].join('\n');

        await writeFileContents(file, `${nextContents}\n`);
    }
}

/**
 * Truncates a line to a fixed display length.
 *
 * @param {string} value - Raw line value
 * @param {number} maxLength - Maximum displayed length
 * @returns {string} Truncated or original line
 */
function truncateLine(value, maxLength) {
    if (value.length <= maxLength)
        return value;

    return `${value.slice(0, maxLength - 1)}…`;
}
