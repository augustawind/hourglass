import { InputError } from './error'

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

export default { parseTimeString, parseMilliseconds }
