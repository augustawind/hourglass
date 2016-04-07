#!/usr/bin/env node
var path = require('path')
var program = require('commander')
var hg = require('../lib/main')

if (!hg.getTaskFile()) {
  hg.setTaskFile(path.join(process.env.HOME, '.hourglass'))
}

program
  .description('A CLI time management tool that runs on NodeJS.')
  .option('-t --task-file <path>', 'set task file, default $HOURGLASS_TASKS or ~/.hourglass',
          hg.setTaskFile)

program
  .command('init')
  .description('create an initial task file')
  .action(hg.init)

program
  .command('set <task> <time>')
  .alias('edit')
  .description('manually set the amount of time needed for an task')
  .action(hg.setTask)

program
  .command('remove <task>')
  .alias('delete')
  .description('remove all data for the given task')
  .action(hg.removeTask)

program
  .command('view [tasks...]')
  .description('view given tasks, or all tasks if left blank')
  .action(hg.viewTasks)

program
  .command('track <task>')
  .description('track time spent on the given task')
  .action(hg.trackTask)

program
  .command('start <task>')
  .description('start timer for the given task')
  .option('-s --silent', 'don\'t show the progress bar')
  .action(hg.startTimer)

program.parse(process.argv)
