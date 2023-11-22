'use strict';
const yaml = require('js-yaml');
const fs = require('fs-extra');
const klaw = require('klaw-sync');
const deepmerge = require('deepmerge');
const toml = require('@iarna/toml');
const path = require('path');

/**
 * Save and retrieve the last selected theme.
 * @param {String} saveFilePath Path to the file where the selected theme will be saved
 * @returns {{saveSelected: Function, getSelected: Function}}
 */
function useSaveSelectedTheme(saveFilePath) {
  /**
   * Save the selected theme to a file.
   * @param {String} selectedThemePath Path of the selected theme
   * @returns {Promise<void>}
   */
  async function saveSelected(selectedThemePath) {
    await fs.outputFile(saveFilePath, selectedThemePath);
  }

  /**
   * Get the last selected theme from the save file.
   * @returns {Promise<String|null>}
   */
  async function getSelected() {
    try {
      return await fs.readFile(saveFilePath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw err;
    }
  }

  return { saveSelected, getSelected };
}


/**
 * Checks if given file is a TOML by it's extension.
 * @param {String} filePath Absolute or relative file path
 * @returns {Boolean}
 */
function isToml(filePath) {
  const extension = path.extname(filePath);

  return ['.toml', '.yml', '.yaml'].includes(extension);
}

/**
 * Apply theme configuration to the main Alacritty config file.
 * @param {String} themePath Theme config file path
 * @param {String} rootConfigPath Main Alacritty configuration file path
 * @returns {Promise<void>}
 */
async function applyTheme(themePath, rootConfigPath) {
  const config = await readToml(rootConfigPath);
  const theme = await readToml(themePath);
  const merged = deepmerge(config, theme);
  const mergedConfig = toml.stringify(merged);

  await fs.writeFile(rootConfigPath, mergedConfig);
}

/**
 * Load theme config files from a directory.
 * @param {String} directoryPath Themes directory path
 * @returns {Promise<Array<{path: String, stats: Object}>>}
 */
async function loadThemes(directoryPath) {
  await fs.ensureDir(directoryPath);
  const themeFiles = klaw(directoryPath, {
    nodir: true,
    filter: item =>  isToml(item.path),
  });

  return themeFiles;
}

/**
 * Read TOML file and load it as an object.
 * @param {String} filePath TOML file path
 * @returns {Promise<Object>}
 */
async function readToml(filePath) {
  function isYaml () {
    console.log(filePath);
    return filePath.endsWith('.yaml') || filePath.endsWith('.yml');
  }
  if (isYaml(filePath)) {
    console.log('is yaml', filePath);
    const yamlFile = await fs.readFile(filePath, { encoding: 'utf-8' });
    const yamlContent = yaml.load(yamlFile);
    return toml.stringify(yamlContent);
  } else if (isToml(filePath)) {
    const tomlFile = await fs.readFile(filePath, { encoding: 'utf-8' });
    return toml.parse(tomlFile);
  } else {
    return yaml.load(filePath);
  }
}

/**
 * Convert "slugified" file name (lower case, underscored) to proper cased, spaced text.
 * @param {String} text Input text
 * @returns {String}
 */
function unslugify(text) {
  const withoutUnderscore = text => text.replace(/_+/g, ' ');
  const withoutExtension = text => text.replace(/\.toml|\.yaml|\.yml/, '');
  const withProperCase = text => text.replace(/\w\S*/g, s => s.charAt(0).toUpperCase() + s.substr(1).toLowerCase());

  text = withoutUnderscore(text);
  text = withoutExtension(text);
  text = withProperCase(text);

  return text;
}


module.exports = {
  loadThemes,
  applyTheme,
  readToml,
  unslugify,
  useSaveSelectedTheme,
  isToml,
};
