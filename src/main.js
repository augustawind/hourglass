import 'source-map-support/register'

import _ from 'lodash'
import fs from 'mz/fs'
import prettyjson from 'prettyjson'

import { InputError, handleErrors } from './error'
import { parseTimeString, parseMilliseconds } from './format'
import timer from './timer'

// Return the path to the current task file.
function getTaskFile () {
  return process.env.HOURGLASS_TASKS
}

// Set the path to the current task file.
function setTaskFile (taskFile) {
  process.env.HOURGLASS_TASKS = taskFile
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
// the task file. If `trackTask` has been called, this will erase
// the data for that task and start fresh.
function setTask (task, timeString) {
  return editTaskFile((config) => {
    const time = ['tasks', task, 'time']
    const timesTracked = ['tasks', task, 'timesTracked']

    // If `timesTracked` property exists, remove `time` and
    // `timesTracked` properties (overriding any previous calls to
    // `trackTask`).
    if (_.has(config, timesTracked)) {
      _.unset(config, time)
      _.unset(config, timesTracked)
    }

    _.set(config, time, parseTimeString(timeString))
  })
}

// Return a promise that waits for a SIGINT from the user, then records
// the time elapsed for the given task in the task file, averaging it
// with all previous calls to `trackTask` for the given task. If `setTask`
// has been called, this will erase the data for that task and start fresh.
function trackTask (task) {
  return timer.suspend()
    .then((ms) => {
      editTaskFile((config) => {
        const time = ['tasks', task, 'time']
        const timesTracked = ['tasks', task, 'timesTracked']

        if (_.has(config, timesTracked)) {
          // If `timesTracked` property exists, increment it.
          _.set(config, timesTracked, _.get(config, timesTracked) + 1)
        } else {
          // If not, set it to `1` and set `time` to 0 (overriding any
          // previous calls to `setTask`.
          _.set(config, time, 0)
          _.set(config, timesTracked, 1)
        }

        // Set `time` to the average of all calls to trackTask.
        const average = _.get(config, time) + ms / _.get(config, timesTracked)
        _.set(config, time, average)
      })
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
function startTimer (task, { silent = false } = {}) {
  return fs.readFile(getTaskFile(), 'utf8')
    .then((data) => {
      const config = JSON.parse(data)
      return timer.wait(task, config.tasks[task].time, silent)
    })
    .then(() => {
      console.log('Alarm started. Press CTRL-C to stop alarm.')
    })
    .then(timer.beep)
    .then((ms) => {
      console.log(`Alarm stopped after ${parseMilliseconds(ms)}.`)
    })
    .catch(handleErrors)
}

export default {
  setTaskFile, getTaskFile,
  init, setTask, trackTask, removeTask, viewTasks,
  startTimer
}
