// TODO: add this to dev builds only
import 'source-map-support/register'
import path from 'path'
import fs from 'mz/fs'
import lame from 'lame'
import Speaker from 'speaker'

const configFile = path.join(process.env.HOME, '.hourglass')
const beepFile = 'beep.mp3'

// Return a Promise that creates a new .hourglass file in the user's
// home directory, if one does not already exist.
function init () {
  const config = JSON.stringify({})
  return fs.writeFile(configFile, config, { flag: 'wx' })
    .then(() => {
      console.log(`Created .hourglass file at ${configFile}`)
    })
    .catch(console.error)
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
    .catch(console.error)
}

// Return a promise that starts a timer for the given action in the config
// and beeps once the timer is up.
function startTimer (action) {
  return fs.readFile(configFile, 'utf8')
    .then((data) => {
      const config = JSON.parse(data)
      return wait(config[action])
    })
    .then(() => {
      console.log('Alarm started. Press CTRL-C to stop alarm.')
    })
    .then(beep)
    .then((ms) => {
      console.log(`Alarm stopped after ${ms / 1000} seconds.`)
    })
    .catch(console.error)
}

// Return a promise that resolves after the given delay in milliseconds.
function wait (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

// Return a promise that plays a beeping sound n times, then returns the time
// passed.
function beep (nPlays = 1) {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    const play = (i) => {
      fs.createReadStream(beepFile)
        .on('error', (err) => {
          reject(err)
        })
        .pipe(new lame.Decoder())
        .pipe(new Speaker())
        .on('close', () => {
          if (--i) play(i)
          else resolve(Date.now() - start)
        })
    }

    play(nPlays)
  })
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
