// TODO: add this to dev builds only
import 'source-map-support/register'
import fs from 'mz/fs'
import lame from 'lame'
import path from 'path'
import readline from 'readline'
import _ from 'lodash'
import Speaker from 'speaker'

const configFile = path.join(process.env.HOME, '.hourglass')
const beepFile = 'beep.mp3'

// Make Windows emit SIGINT.
if (process.platform === 'win32') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.on('SIGINT', function () {
    process.emit('SIGINT')
    rl.close()
  })
}

// Error class for invalid user input.
function InputError (input, message) {
  this.input = input
  this.message = message
  this.stack = Error().stack
}
InputError.prototype = Object.create(Error.prototype)
InputError.prototype.name = 'InputError'

// Print error message to stderr prefixed with the program name.
function logError (message) {
  console.error(`hourglass: ${message}`)
}

// Generic error handler.
function handleErrors (err) {
  if (err instanceof InputError) {
    logError(`Invalid input '${err.input}': ${err.message}`)
  } else if (err.code === 'ENOENT') {
    logError(`No config file present at ${configFile}: ` +
             'Run "hourglass init" to create one.')
  } else if (err.code === 'EEXIST') {
    logError(`${configFile}: File already exists.`)
  } else if (err.code === 'EISDIR') {
    logError(`${configFile} is a directory.`)
  } else if (err.code === 'EACCES' || err.code === 'EPERM') {
    logError(`${configFile}: Permission denied.`)
  } else {
    logError(err.toString())
  }
}

// Return a Promise that creates a new .hourglass file in the user's
// home directory, if one does not already exist.
function init () {
  const config = JSON.stringify({ tasks: {} })
  return fs.writeFile(configFile, config, { flag: 'wx' })
    .then(() => {
      console.log(`Created .hourglass file at ${configFile}`)
    })
    .catch(handleErrors)
}

// Return a promise that sets the time spent on a given task in
// the config file.
function setTime (task, time) {
  return editConfig((config) => {
    _.set(config, ['tasks', task, 'time'], parseTimeString(time))
  })
}

// Return a promise that removes a task from the config file.
function removeTask (task) {
  return editConfig((config) => {
    if (!_.has(config, ['tasks', task])) {
      throw new InputError(task, 'Task does not exist')
    }

    delete config.tasks[task]
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
    .catch(handleErrors)
}

// Return a promise that starts a timer for the given task in the config
// and beeps once the timer is up.
function startTimer (task) {
  return fs.readFile(configFile, 'utf8')
    .then((data) => {
      const config = JSON.parse(data)
      return wait(config[task])
    })
    .then(() => {
      console.log('Alarm started. Press CTRL-C to stop alarm.')
    })
    .then(beep)
    .then((ms) => {
      console.log(`Alarm stopped after ${parseMilliseconds(ms)}.`)
    })
    .catch(handleErrors)
}

// Return a promise that resolves after the given delay in milliseconds.
function wait (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

// Return a promise that plays a beeping sound `nPlays` times, then returns
// the time passed. `nPlays` defaults to -1, which will keep playing
// indefinitely or until SIGINT is received.
function beep (nPlays = -1) {
  return new Promise((resolve, reject) => {
    const start = Date.now()

    let i = nPlays - 1

    // Allow for graceful interrupt with CTRL-C.
    process.on('SIGINT', () => {
      // Remove '^C' text from stdout.
      readline.clearLine(process.stdout, -1)
      readline.moveCursor(process.stdout, -2, 0)
      // Set counter to 0 which will stop alarm.
      i = 0
      // Reset CTRL-C to default behavior.
      process.on('SIGINT', process.exit)
    })

    const play = () => {
      fs.createReadStream(beepFile)
        .on('error', (err) => {
          reject(err)
        })
        .pipe(new lame.Decoder())
        .pipe(new Speaker())
        .on('close', () => {
          // Keep playing sound until counter hits 0.
          if (i--) play()
          else resolve(Date.now() - start)
        })
    }

    play(nPlays)
  })
}

// Convert a time string to milliseconds. Returns an integer.
// A time string is a number followed by one of `M` for minutes,
// `S` for seconds, `H` for hours, or 'MS' for milliseconds, case insensitive.
function parseTimeString (time) {
  const match = /^(\d+)(h|m|s|ms)$/i.exec(time)

  if (!match) {
    throw new InputError(time, 'Time string must be an integer followed by ' +
                               'one of "H", "M", "S", or "MS" (case insensitive).')
  }

  const amount = Number(match[1])
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

  return amount
}

// Convert an integer in milliseconds to a time string. This is basically
// the functional opposite of `parseTimeString`.
function parseMilliseconds (ms) {
  if (ms >= 3600000) {
    return `${ms / 3600000}h`
  }
  if (ms >= 60000) {
    return `${ms / 60000}m`
  }
  if (ms >= 1000) {
    return `${ms / 1000}s`
  }

  return ms.toString()
}

export default { init, setTime, removeTask, startTimer }
