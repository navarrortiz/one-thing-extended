import Gio from 'gi://Gio';

import {SETTINGS_KEYS} from '../../shared/constants.js';

/**
 * Gets the configured text file.
 *
 * @param {object} settings - Extension settings
 * @returns {Gio.File|null} Configured file or null
 */
export function getConfiguredTextFile(settings) {
    const path = settings.get_string(SETTINGS_KEYS.textFilePath).trim();

    if (path === '')
        return null;

    return Gio.File.new_for_path(path);
}

/**
 * Reads and returns non-empty trimmed lines from a file.
 *
 * @param {Gio.File} file - Source file
 * @returns {Promise<string[]>} Non-empty trimmed lines
 */
export async function getNonEmptyLines(file) {
    const contents = await readFileContents(file);
    const text = new TextDecoder('utf-8').decode(contents);

    return text
        .split(/\r?\n/)
        .map(value => value.trim())
        .filter(value => value !== '');
}

/**
 * Writes UTF-8 text contents asynchronously.
 *
 * @param {Gio.File} file - Target file
 * @param {string} text - Text contents to write
 * @returns {Promise<void>}
 */
export function writeFileContents(file, text) {
    const contents = new TextEncoder().encode(text);

    return new Promise((resolve, reject) => {
        file.replace_contents_async(
            contents,
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null,
            (source, result) => {
                try {
                    source.replace_contents_finish(result);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

/**
 * Reads file contents asynchronously.
 *
 * @param {Gio.File} file - Source file
 * @returns {Promise<Uint8Array>} File contents bytes
 */
function readFileContents(file) {
    return new Promise((resolve, reject) => {
        file.load_contents_async(null, (source, result) => {
            try {
                const [, contents] = source.load_contents_finish(result);
                resolve(contents);
            } catch (error) {
                reject(error);
            }
        });
    });
}
