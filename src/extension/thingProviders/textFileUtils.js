import Gio from 'gi://Gio';

import {SETTINGS_KEYS} from '../../shared/constants.js';

/**
 * Gets configured text-file paths.
 *
 * @param {object} settings - Extension settings
 * @returns {string[]} Normalized configured paths
 */
export function getConfiguredTextFilePaths(settings) {
    ensureTextFileSettingsMigrated(settings);

    return normalizePaths(settings.get_strv(SETTINGS_KEYS.textFilePaths));
}

/**
 * Gets the configured active text-file path.
 *
 * @param {object} settings - Extension settings
 * @returns {string} Active text-file path or empty string
 */
export function getConfiguredTextFilePath(settings) {
    ensureTextFileSettingsMigrated(settings);

    const paths = getConfiguredTextFilePaths(settings);
    const activePath = settings.get_string(SETTINGS_KEYS.textFileActivePath).trim();

    if (activePath !== '' && paths.includes(activePath))
        return activePath;

    return paths[0] ?? '';
}

/**
 * Sets the active text-file path.
 *
 * @param {object} settings - Extension settings
 * @param {string} path - Active text-file path
 */
export function setConfiguredTextFilePath(settings, path) {
    const normalizedPath = path.trim();
    const paths = getConfiguredTextFilePaths(settings);

    if (normalizedPath !== '' && !paths.includes(normalizedPath))
        settings.set_strv(SETTINGS_KEYS.textFilePaths, [...paths, normalizedPath]);

    settings.set_string(SETTINGS_KEYS.textFileActivePath, normalizedPath);
    settings.set_string(SETTINGS_KEYS.textFilePath, normalizedPath);
}

/**
 * Replaces the configured text-file paths.
 *
 * @param {object} settings - Extension settings
 * @param {string[]} paths - Text-file paths
 */
export function setConfiguredTextFilePaths(settings, paths) {
    const normalizedPaths = normalizePaths(paths);
    const activePath = getConfiguredTextFilePath(settings);
    const nextActivePath = normalizedPaths.includes(activePath)
        ? activePath
        : normalizedPaths[0] ?? '';

    settings.set_strv(SETTINGS_KEYS.textFilePaths, normalizedPaths);
    settings.set_string(SETTINGS_KEYS.textFileActivePath, nextActivePath);
    settings.set_string(SETTINGS_KEYS.textFilePath, nextActivePath);
}

/**
 * Gets text-file entries for UI rendering.
 *
 * @param {object} settings - Extension settings
 * @returns {{path: string, fileName: string, isActive: boolean}[]} Text-file entries
 */
export function getTextFileEntries(settings) {
    const activePath = getConfiguredTextFilePath(settings);

    return getConfiguredTextFilePaths(settings).map(path => ({
        path,
        fileName: Gio.File.new_for_path(path).get_basename() ?? path,
        isActive: path === activePath,
    }));
}

/**
 * Gets the configured text file.
 *
 * @param {object} settings - Extension settings
 * @returns {Gio.File|null} Configured file or null
 */
export function getConfiguredTextFile(settings) {
    const path = getConfiguredTextFilePath(settings);

    if (path === '')
        return null;

    return Gio.File.new_for_path(path);
}

/**
 * Migrates legacy single-file settings to the multi-file model.
 *
 * @param {object} settings - Extension settings
 */
function ensureTextFileSettingsMigrated(settings) {
    const paths = normalizePaths(settings.get_strv(SETTINGS_KEYS.textFilePaths));

    if (paths.length > 0)
        return;

    const legacyPath = settings.get_string(SETTINGS_KEYS.textFilePath).trim();

    if (legacyPath === '')
        return;

    settings.set_strv(SETTINGS_KEYS.textFilePaths, [legacyPath]);
    settings.set_string(SETTINGS_KEYS.textFileActivePath, legacyPath);
}

/**
 * Normalizes a list of text-file paths.
 *
 * @param {string[]} paths - Raw paths
 * @returns {string[]} Normalized unique paths
 */
function normalizePaths(paths) {
    const normalizedPaths = [];
    const seenPaths = new Set();

    for (const path of paths) {
        const normalizedPath = `${path}`.trim();

        if (normalizedPath === '' || seenPaths.has(normalizedPath))
            continue;

        normalizedPaths.push(normalizedPath);
        seenPaths.add(normalizedPath);
    }

    return normalizedPaths;
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
