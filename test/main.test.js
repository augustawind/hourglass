import fs from 'mz/fs'
import path from 'path'
import { stdout } from 'test-console'
import test from 'blue-tape'

import { init, setTask, removeTask, viewTasks, startTimer } from '../src/main'

function setup () {
  // Set path to test task file.
  process.env.HOURGLASS_TASKS = path.join(__dirname, '.test-taskfile')

  // Delete test task file if it exists.
  try {
    fs.unlinkSync(process.env.HOURGLASS_TASKS)
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }

  return process.env.HOURGLASS_TASKS
}

function teardown (taskFile) {
  // Delete test task file.
  fs.unlinkSync(taskFile)
}

test('init', (t) => {
  const taskFile = setup()

  return init()
    .then(() => fs.readFile(taskFile, 'utf8'))
    .then((data) => {
      t.deepEqual(JSON.parse(data), { tasks: {} },
                 'should create a task file with an empty task object')
      teardown(taskFile)
    })
})

// setup() that also calls hourglass.init()
function setup2 () {
  const taskFile = setup ()
  init()
  return taskFile
}

test('setTask', (t) => {
  const taskFile = setup2()

  return setTask('task1', '10s')
    .then(() => fs.readFile(taskFile, 'utf8'))
    .then((data) => {
      t.notEqual(JSON.parse(data).tasks.task1, undefined,
                'should create a task with the given name')
      teardown(taskFile)
    })
})

test('removeTask', (t) => {
  const taskFile = setup2()

  return setTask('task1', '5m')
    .then(() => fs.readFile(taskFile, 'utf8'))
    .then((data) => t.notEqual(JSON.parse(data).tasks.task1, undefined))
    .then(() => removeTask('task1'))
    .then(() => fs.readFile(taskFile, 'utf8'))
    .then((data) => {
      t.equal(JSON.parse(data).tasks.task1, undefined,
             'should remove the task with the given name')
      teardown(taskFile)
    })
})

test('viewTasks', (t) => {
  const taskFile = setup2()

  return setTask('task1', '2h')
    .then(() => setTask('task2', '3s'))
    .then(() => setTask('task3', '5ms'))
    .then(() => fs.readFile(taskFile, 'utf8'))
    .then((data) => {
      t.notEqual(JSON.parse(data).tasks.task1, undefined)
      t.notEqual(JSON.parse(data).tasks.task2, undefined)
      t.notEqual(JSON.parse(data).tasks.task3, undefined)
    })
    .then(() => {
      const inspect = stdout.inspect()
      return viewTasks(['task2', 'task3'])
        .then(() => {
          inspect.restore()
          return inspect
        })
    })
    .then((inspect) => {
      const output = inspect.output.join('')
      t.ok(output.includes('task2'),
          'should print out the given tasks')
      t.ok(output.includes('task3'),
          'should print out the given tasks')
      t.notOk(output.includes('task1'),
             'should not print out any other tasks')
      teardown(taskFile)
    })
})
