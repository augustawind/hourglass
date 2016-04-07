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
  init, setTaskFile, getTaskFile, setTask, removeTask, viewTasks, startTimer
}
