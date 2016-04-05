// TODO: add this to dev builds only
import 'source-map-support/register'
import path from 'path'
// TODO: change this because 'play' depends on a 3rd party player being installed
import play from 'play'
import fs from 'mz/fs'

const configFile = path.join(process.env.HOME, '.hourglass')

// Return a Promise that creates a new .hourglass file in the user's
// home directory, if one does not already exist.
function init () {
  const config = JSON.stringify({})
  return fs.writeFile(configFile, config, { flag: 'wx' })
    .then(() => {
      console.log(`Created .hourglass file at ${configFile}`)
    })
    .catch((err) => {
      throw err
    })
}

// Return a promise that sets the time spent on a given action in
// the config file.
function setTime (action, time) {
  return editConfig((config) => {
    // TODO: add try/catch
    config[action] = parseTimeString(time)
  })
}

// Return a promise that removes an entry from the config file.
function removeEntry (key) {
  return editConfig((config) => {
    delete config[key]
  })
}

// Return a promise that reads the config file, calls the given callback on
// it, and then writes the changes.
function editConfig (callback) {
  return fs.readFile(configFile, 'utf8')
    .then((data) => {
      const config = JSON.parse(data)
      callback(config)
      return fs.writeFile(configFile, JSON.stringify(config))
    })
    .catch((err) => {
      throw err
    })
}

// Return a promise that starts a timer for the given action in the config
// and beeps once the timer is up.
function startTimer (action) {
  return fs.readFile(configFile, 'utf8')
    .then((data) => {
      const config = JSON.parse(data)
      return wait (config[action])
    })
    .then(beep)
    .catch((err) => {
      throw err
    })
}

// Return a promise that resolves after the given delay in milliseconds.
function wait (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

// Play a beeping sound.
function beep (nPlays = 1) {
  play.sound('../beep.wav')
}

// Convert a time string to milliseconds. Returns an integer.
// A time string is a number followed by one of `M` for minutes,
// `S` for seconds, or `H` for hours, case insensitive.
function parseTimeString (time) {
  const match = /^(\d+)([hH]|[mM]|[sS])$/.exec(time)
  if (!match) {
    throw new Error()
  }

  const amount = match[1]
  const unit = match[2]

  if ('hH'.includes(unit)) {
    return amount * 3600000
  }
  if ('mM'.includes(unit)) {
    return amount * 60000
  }
  if ('sS'.includes(unit)) {
    return amount * 1000
  }
}

export default { init, setTime, removeEntry, startTimer }
