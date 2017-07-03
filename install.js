const requestProgress = require('request-progress');
const progress = require('progress');
const extractZip = require('extract-zip');
const cp = require('child_process');
const fs = require('fs-extra');
const kew = require('kew');
const path = require('path');
const request = require('request');
const url = require('url');

const originalPath = process.env.PATH;
const VERSION = `1.1.3`;
const DEFAULT_CDN = `https://github.com/JetBrains/kotlin/releases/download/v${VERSION}/kotlin-compiler-${VERSION}.zip`;
const KOTLIN_PATH_NAME = 'kotlin-js';
const EXEC_NAME = 'kotlinc-js';
const MODULE_NAME = 'KotlinJS';


// If the process exits without going through exit(), then we did not complete.
let validExit = false;


// NPM adds bin directories to the path, which will cause `which` to find the
// bin for this package not the actual kotlinjs bin.  Also help out people who
// put ./bin on their path
const cleanPath = function (path) {
  return path.replace(/:[^:]*node_modules[^:]*/g, '').replace(/(^|:)\.\/bin(\:|$)/g, ':').replace(/^:+/, '').
      replace(/:+$/, '')
};

process.env.PATH = cleanPath(originalPath);

const libPath = path.join(__dirname, 'lib');
const pkgPath = path.join(libPath, KOTLIN_PATH_NAME);

// Try to figure out installed kotlin-js
Promise.resolve(true).
    then(downloadKotlinJs).
    then(extractDownload).
    then((extractedPath) => copyIntoPlace(extractedPath, pkgPath)).
    then(() => {

      const location = getTargetPlatform() === 'win32' ?
          path.join(pkgPath, 'bin', `${EXEC_NAME}.exe`) :
          path.join(pkgPath, 'bin', EXEC_NAME);

      try {
        // Ensure executable is executable by all users
        fs.chmodSync(location, '755');
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.error('chmod failed: kotlinjs was not successfully copied to', location);
          exit(1);
        }
        throw err;
      }

      const relativeLocation = path.relative(libPath, location);
      writeLocationFile(relativeLocation);

      console.log(`Done. ${MODULE_NAME} binary available at ${location}`);
      exit(0)
    }).
    catch((err) => {
      console.error(`${MODULE_NAME} installation failed`, err, err.stack);
      exit(1);
    });


function writeLocationFile(location) {
  console.log('Writing location.js file');
  if (getTargetPlatform() === 'win32') {
    location = location.replace(/\\/g, '\\\\')
  }

  const platform = getTargetPlatform();
  const arch = getTargetArch();

  let contents = `module.exports.location = "${location}";\n`;

  if (/^[a-zA-Z0-9]*$/.test(platform) && /^[a-zA-Z0-9]*$/.test(arch)) {
    contents += `module.exports.platform = "${platform}";\nmodule.exports.arch = "${arch}";\n`;
  }

  fs.writeFileSync(path.join(libPath, 'location.js'), contents)
}

function exit(code) {
  validExit = true;
  process.env.PATH = originalPath;
  process.exit(code || 0)
}


function findSuitableTempDirectory() {
  const now = Date.now();
  const candidateTmpDirs = [
    process.env.TMPDIR || process.env.TEMP || process.env.npm_config_tmp,
    '/tmp',
    path.join(process.cwd(), 'tmp')
  ];

  for (let i = 0; i < candidateTmpDirs.length; i++) {
    const candidatePath = path.join(candidateTmpDirs[i], KOTLIN_PATH_NAME);

    try {
      fs.mkdirsSync(candidatePath, '0777');
      // Make double sure we have 0777 permissions; some operating systems
      // default umask does not allow write by default.
      fs.chmodSync(candidatePath, '0777');
      const testFile = path.join(candidatePath, now + '.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return candidatePath
    } catch (e) {
      console.log(candidatePath, 'is not writable:', e.message)
    }
  }

  console.error('Can not find a writable tmp directory, please report issue ' +
      'on https://github.com/zeckson/kotlin-node/issues with as much ' +
      'information as possible.');
  exit(1)
}


function getRequestOptions() {
  const strictSSL = !!process.env.npm_config_strict_ssl;

  const options = {
    uri: getDownloadUrl(),
    encoding: null, // Get response as a buffer
    followRedirect: true, // The default download path redirects to a CDN URL.
    headers: {},
    strictSSL: strictSSL
  };

  const proxyUrl = process.env.npm_config_https_proxy ||
      process.env.npm_config_http_proxy ||
      process.env.npm_config_proxy;
  if (proxyUrl) {

    // Print using proxy
    const proxy = url.parse(proxyUrl);
    if (proxy.auth) {
      // Mask password
      proxy.auth = proxy.auth.replace(/:.*$/, ':******')
    }
    console.log('Using proxy ' + url.format(proxy));

    // Enable proxy
    options.proxy = proxyUrl
  }

  // Use the user-agent string from the npm config
  options.headers['User-Agent'] = process.env.npm_config_user_agent;

  // Use certificate authority settings from npm
  let ca = process.env.npm_config_ca;
  if (!ca && process.env.npm_config_cafile) {
    try {
      ca = fs.readFileSync(process.env.npm_config_cafile, {encoding: 'utf8'}).
          split(/\n(?=-----BEGIN CERTIFICATE-----)/g);

      // Comments at the beginning of the file result in the first
      // item not containing a certificate - in this case the
      // download will fail
      if (ca.length > 0 && !/-----BEGIN CERTIFICATE-----/.test(ca[0])) {
        ca.shift()
      }

    } catch (e) {
      console.error('Could not read cafile', process.env.npm_config_cafile, e)
    }
  }

  if (ca) {
    console.log('Using npmconf ca');
    options.agentOptions = {
      ca: ca
    };
    options.ca = ca
  }

  return options
}

function handleRequestError(error) {
  if (error && error.stack && error.stack.indexOf('SELF_SIGNED_CERT_IN_CHAIN') > -1) {
    console.error('Error making request, SELF_SIGNED_CERT_IN_CHAIN. ' +
        'Looks like someone intercepted your traffic');
  } else if (error) {
    console.error('Error making request.\n' + error.stack + '\n\n' +
        'Please report this full log at https://github.com/zeckson/kotlin-node/issues');
  } else {
    console.error('Something unexpected happened, please report this full ' +
        'log at https://github.com/zeckson/kotlin-node/issues');
  }
  exit(1);
}

function requestBinary(requestOptions, filePath) {
  const writePath = `${filePath}-download-${Date.now()}`;

  console.log('Receiving...');
  return new Promise((resolve) => {
    let bar = null;
    requestProgress(request(requestOptions, function (error, response, body) {
      console.log('');
      if (!error && response.statusCode === 200) {
        fs.writeFileSync(writePath, body);
        console.log('Received ' + Math.floor(body.length / 1024) + 'K total.');
        fs.renameSync(writePath, filePath);
        resolve(filePath);

      } else if (response) {
        console.error('Error requesting archive.\n' +
            'Status: ' + response.statusCode + '\n' +
            'Request options: ' + JSON.stringify(requestOptions, null, 2) + '\n' +
            'Response headers: ' + JSON.stringify(response.headers, null, 2) + '\n' +
            'Make sure your network and proxy settings are correct.\n\n' +
            'If you continue to have issues, please report this full log at ' +
            'https://github.com/zeckson/kotlin-node/issues');
        exit(1);
      } else {
        handleRequestError(error);
      }
    })).on('progress', function (state) {
      try {
        if (!bar) {
          bar = new progress('  [:bar] :percent', {total: state.size.total, width: 40});
        }
        bar.curr = state.size.transferred;
        bar.tick();
      } catch (e) {
        // It doesn't really matter if the progress bar doesn't update.
      }
    }).on('error', handleRequestError);
  });
}


function extractDownload(filePath) {
  // extract to a unique directory in case multiple processes are
  // installing and extracting at once
  const extractedPath = `${filePath}-extract-${Date.now()}`;
  const options = {cwd: extractedPath};

  fs.mkdirsSync(extractedPath, '0777');
  // Make double sure we have 0777 permissions; some operating systems
  // default umask does not allow write by default.
  fs.chmodSync(extractedPath, '0777');

  return new Promise((resolve, reject) => {
    if (filePath.substr(-4) === '.zip') {
      console.log('Extracting zip contents');
      extractZip(path.resolve(filePath), {dir: extractedPath}, function (err) {
        if (err) {
          console.error('Error extracting zip');
          reject(err)
        } else {
          resolve(extractedPath)
        }
      })

    } else {
      console.log('Extracting tar contents (via spawned process)');
      cp.execFile('tar', ['jxf', path.resolve(filePath)], options, function (err) {
        if (err) {
          console.error('Error extracting archive');
          reject(err)
        } else {
          resolve(extractedPath)
        }
      })
    }
  });
}


function copyIntoPlace(extractedPath, targetPath) {
  console.log('Removing', targetPath);
  return kew.nfcall(fs.remove, targetPath).then(function () {
    // Look for the extracted directory, so we can rename it.
    const files = fs.readdirSync(extractedPath);
    for (let i = 0; i < files.length; i++) {
      const file = path.join(extractedPath, files[i]);
      if (fs.statSync(file).isDirectory() && file.indexOf(VERSION) > -1) {
        console.log('Copying extracted folder', file, '->', targetPath);
        return kew.nfcall(fs.move, file, targetPath)
      }
    }

    console.log('Could not find extracted file', files);
    throw new Error('Could not find extracted file')
  })
}


/**
 * @return {string} Get the download URL for kotlinjs.
 */
function getDownloadUrl() {
  const spec = getDownloadSpec();
  return spec && spec.url
}

/**
 * @return {{url: string, checksum: string}} Get the download URL and expected
 */
function getDownloadSpec() {
  const cdnUrl = DEFAULT_CDN;

  // TODO: Add checksum validation

  return {url: cdnUrl, checksum: ``};
}

/**
 * Download kotlinjs, reusing the existing copy on disk if available.
 * Exits immediately if there is no binary to download.
 * @return {Promise.<string>} The path to the downloaded file.
 */
function downloadKotlinJs() {
  const downloadSpec = getDownloadSpec();
  if (!downloadSpec) {
    console.error(
        'Unexpected platform or architecture: ' + getTargetPlatform() + '/' + getTargetArch() + '\n' +
        'It seems there is no binary available for your platform/architecture\n' +
        'Try to install KotlinJS manually');
    exit(1);
  }

  const downloadUrl = downloadSpec.url;
  let downloadedFile;

  return kew.fcall(function () {
    // Can't use a global VERSION so start a download.
    const tmpPath = findSuitableTempDirectory();
    const fileName = downloadUrl.split('/').pop();
    downloadedFile = path.join(tmpPath, fileName);

    if (fs.existsSync(downloadedFile)) {
      console.log('Download already available at', downloadedFile);
      return verifyChecksum(downloadedFile, downloadSpec.checksum)
    }
    return false
  }).then(function (verified) {
    if (verified) {
      return downloadedFile;
    }

    // Start the install.
    console.log('Downloading', downloadUrl);
    console.log('Saving to', downloadedFile);
    return requestBinary(getRequestOptions(), downloadedFile)
  })
}

/**
 * TODO: Verify downloaded file checksum
 * Check to make sure that the file matches the checksum.
 * @param {string} fileName
 * @param {string} checksum
 * @return {Promise.<boolean>}
 */
function verifyChecksum(fileName, checksum) {
  return Promise.resolve(true);
}

/**
 * @return {string}
 */
function getTargetPlatform() {
  return process.platform
}

/**
 * @return {string}
 */
function getTargetArch() {
  return process.arch
}
