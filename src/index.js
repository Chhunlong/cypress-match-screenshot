const path = require('path');

const cypressPaths = {
  SCREENSHOT_FOLDER: 'cypress/match-screenshots',
  ROOT_FOLDER: ''
};

/**
 * Creates unique id strings
 * @return {String}
 */
function uuid () {
  return ([ 1e7 ] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (a) =>
    (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
  );
}

/**
 * Get relative path
 * @param  {String} str
 * @return {String}
 */
function relPath (str) {
  return path.join(
    cypressPaths.ROOT_FOLDER,
    cypressPaths.SCREENSHOT_FOLDER,
    str
  );
}

/**
 * Takes a screenshot and, if available, matches it against the screenshot
 * from the previous test run. Assertion will fail if the diff is larger than
 * the specified threshold
 * @param  {String} name
 * @param  {String} domainName
 * @param  {String} pageName   
 * @param  {String} deviceViewPort
 * @param  {Object} options
 */
function matchScreenshot (name, domainName, pageName, deviceViewPort, options = {}) {
  const fileName = `${pageName}`;

  console.log('Taking screenshot');

  // Ensure that the screenshot folders exist
  cy.exec(`mkdir -p ${cypressPaths.SCREENSHOT_FOLDER}/new/${domainName}/${deviceViewPort}`, { log: false });
  cy.exec(`mkdir -p ${cypressPaths.SCREENSHOT_FOLDER}/diff/${domainName}/${deviceViewPort}`, { log: false });
  cy.exec(`mkdir -p ${cypressPaths.SCREENSHOT_FOLDER}/${domainName}/${deviceViewPort}`, { log: false });

  // we need to touch the old file for the first run,
  // we'll check later if the file actually has any content
  // in it or not
  cy.exec(`touch "${cypressPaths.SCREENSHOT_FOLDER}/${domainName}/${deviceViewPort}/${fileName}.png"`, {
    log: false
  });

  const id = uuid();
  let path = null;
  cy
    .screenshot(id, {
      scale: false,
      log: false,
      onAfterScreenshot ($el, props) {
        // Store path of screenshot that has been taken
        // This is a reliable way for moving that screenshot file
        //  in the next step!
        path = props.path;
      }
    })
    .then(() => {
      console.log('Move screenshot');
      const oldPath = `${cypressPaths.SCREENSHOT_FOLDER}/${domainName}/${deviceViewPort}/${fileName}.png`;
      const newPath = `${cypressPaths.SCREENSHOT_FOLDER}/new/${domainName}/${deviceViewPort}/${fileName}.png`;

      cy.exec(`mv "${path}" "${newPath}"`, {
        log: false
      });

      cy.log('Screenshot taken');
      cy
        .readFile(oldPath, 'utf-8', {
          log: false
        })
        .then((value) => {
          if (value) {
            cy.log('Matching screenshot...');
            cy
              .exec(
                `cypress-diff-screenshot ` +
                  `--pathOld="${relPath(`${domainName}/${deviceViewPort}/${fileName}.png`)}" ` +
                  `--pathNew="${relPath(`new/${domainName}/${deviceViewPort}/${fileName}.png`)}" ` +
                  `--target="${relPath(`diff/${domainName}/${deviceViewPort}/${fileName}.png`)}" ` +
                  `--threshold=${options.threshold || '0.005'} ` +
                  `--thresholdType=${options.thresholdType || ''} `,
                { log: false }
              )
              .then((result) => {
                console.log(`Matched screenshot - Passed: ${result.stdout}`);
                const matches = result.stdout === 'Yay';
                if (Cypress.config('updateScreenshots') || matches) {
                  cy.exec(
                    `mv "${cypressPaths.SCREENSHOT_FOLDER}/new/${domainName}/${deviceViewPort}/${fileName}.png" ` +
                      `"${cypressPaths.SCREENSHOT_FOLDER}/${domainName}/${deviceViewPort}/${fileName}.png"`,
                    { log: false }
                  );
                  cy.exec(
                    `rm "${cypressPaths.SCREENSHOT_FOLDER}/diff/${domainName}/${deviceViewPort}/${fileName}.png"`,
                    { log: false }
                  );
                }
              });
          } else {
            cy.log('No previous screenshot found to match against!');
            cy.exec(
              `mv "${cypressPaths.SCREENSHOT_FOLDER}/new/${domainName}/${deviceViewPort}/${fileName}.png" ` +
                `"${cypressPaths.SCREENSHOT_FOLDER}/${domainName}/${deviceViewPort}/${fileName}.png"`,
              { log: false }
            );
          }
        });
    });
}

/**
 * Register `matchScreenshot` custom command
 * @param  {String} - optional custom name for command
 * @param  {String} - optional custom root dir path
 */
function register (
  commandName = 'matchScreenshot',
  cypressRootFolder = cypressPaths.ROOT_FOLDER
) {
  cypressPaths.ROOT_FOLDER = cypressRootFolder;
  Cypress.Commands.add(commandName, matchScreenshot);
}

module.exports = {
  register
};
