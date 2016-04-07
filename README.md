# Hourglass

A CLI time management tool that runs on NodeJS.

## Usage

    hourglass [options] [command]

    Commands:

      init                    create an initial task file
      set|edit <task> <time>  manually set the amount of time needed for an task
      remove|delete <task>    remove all data for the given task
      view [tasks...]         view given tasks, or all tasks if left blank
      track <task>            track time spent on the given task
      start [options] <task>  start timer for the given task

    Options:

      -h, --help             output usage information
      -t --task-file [path]  set task file, default $HOURGLASS_TASKS or ~/.hourglass

## Subcommand options

    hourglass start [options] <task>

    start timer for the given task

    Options:

      -s --silent  don't show the progress bar

