import 'source-map-support/register'

import fs from 'mz/fs'
import lame from 'lame'
import path from 'path'
import prettyjson from 'prettyjson'
import ProgressBar from 'progress'
import readline from 'readline'
import _ from 'lodash'
import Speaker from 'speaker'

import { InputError, handleErrors } from './error'
import { parseTimeString, parseMilliseconds } from './format'

const beepFile = path.join(__dirname, '../resources/beep.mp3')

// Return the path to the current task file.
function getTaskFile () {
  return process.env.HOURGLASS_TASKS
}

// Set the path to the current task file.
function setTaskFile (taskFile) {
  process.env.HOURGLASS_TASKS = taskFile
}

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

// JSON.stringify with an EOL.
function stringify (object) {
  return JSON.stringify(object) + '\n'
}

// Return a Promise that creates a new task file if one does not already exist.
function init () {
  const config = stringify({ tasks: {} })
  return fs.writeFile(getTaskFile(), config, { flag: 'wx' })
    .then(() => {
      console.log(`Created task file at ${getTaskFile()}`)
    })
    .catch(handleErrors)
}

// Return a promise that sets the time spent on a given task in
// the task file.
function setTask (task, time) {
  return editTaskFile((config) => {
    _.set(config, ['tasks', task, 'time'], parseTimeString(time))
  })
}

// Return a promise that removes a task from the task file.
function removeTask (task) {
  return editTaskFile((config) => {
    if (!_.has(config, ['tasks', task])) {
      throw new InputError(task, 'Task does not exist')
    }

    delete config.tasks[task]
  })
}

// Return a promise that reads the task file, calls the given callback on
// it, and then writes the changes.
function editTaskFile (callback) {
  return fs.readFile(getTaskFile(), 'utf8')
    .then((data) => {
      const config = JSON.parse(data)
      callback(config)
      return fs.writeFile(getTaskFile(), stringify(config))
    })
    .catch(handleErrors)
}

// Return a promise that prints the given tasks, or all tasks if none are given.
function viewTasks (tasks = []) {
  return editTaskFile((config) => {
    tasks.forEach((task) => {
      if (!_.has(config, ['tasks', task])) {
        throw new InputError(task, 'Task does not exist')
      }
    })

    const selection = tasks.length ? _.pick(config.tasks, tasks) : config.tasks
    const formatted = _.mapValues(selection, (task) => parseMilliseconds(task.time))
    console.log(prettyjson.render(formatted))
  })
}

// Return a promise that starts a timer for the given task in the config
// and beeps once the timer is up. If the `silent` option is `true`, no
// progress bar will be displayed.
function startTimer (task, { silent = false,  } = {}) {
  return fs.readFile(getTaskFile(), 'utf8')
    .then((data) => {
      const config = JSON.parse(data)
      return wait(task, config.tasks[task].time, silent)
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

// Return a promise that waits for the given delay in milliseconds,
// displaying the name of a task and a progress bar while waiting.
// If `silent` is `true`, display nothing.
function wait (task, ms, silent = false) {
  console.log('Timer started. Press CTRL-C to cancel.')

  if (silent) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  const delay = 1000

  const bar = new ProgressBar(
    `Task '${task}' -> :elapseds/${parseMilliseconds(ms)} [:bar] :percent`,
    { total: ms / delay, width: 80, incomplete: '.' })

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      bar.tick()
      if (bar.complete) {
        resolve()
        clearInterval(timer)
      }
    }, delay)
  })
}

// Return a promise that plays a beeping sound `nPlays` times, then returns
// the time passed. `nPlays` defaults to -1, which will keep playing
// indefinitely or until SIGINT is received.
function beep (nPlays = -1) {
  return new Promise((resolve, reject) => {
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

    const start = Date.now()

    const play = () => {
      fs.createReadStream(beepFile)
        .on('error', reject)
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

export default {
  init, setTaskFile, getTaskFile, setTask, removeTask, viewTasks, startTimer
}
