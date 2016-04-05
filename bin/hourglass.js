#!/usr/bin/env node

const program = require('commander')
const hg = require('../lib/main')

program
  .command('init')
  .description('create an initial .hourglass file')
  .action(hg.init)

program
  .command('set <action> <time>')
  .description('manually set the amount of time needed for an action')
  .action(function (action, time) {
    hg.setTime(action, time)
  })

program
  .command('remove <action>')
  .description('remove all data for the given action')
  .action(function (action) {
    hg.removeEntry(action)
  })

program
  .command('track <action>')
  .description('track time spent on the given action')
  .action(function () {
    console.log('track')
  })

program
  .command('start <action>')
  .description('start timer for the given action')
  .action(function () {
    console.log('start')
  })

program.parse(process.argv)
