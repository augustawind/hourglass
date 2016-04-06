#!/usr/bin/env node

const program = require('commander')
const hg = require('../lib/main')

program
  .command('init')
  .description('create an initial .hourglass file')
  .action(hg.init)

program
  .command('set <task> <time>')
  .description('manually set the amount of time needed for an task')
  .action(hg.setTime)

program
  .command('remove <task>')
  .description('remove all data for the given task')
  .action(hg.removeTask)

program
  .command('track <task>')
  .description('track time spent on the given task')
  .action(function () {
    console.log('track')
  })

program
  .command('start <task>')
  .description('start timer for the given task')
  .action(hg.startTimer)

program.parse(process.argv)
