#!/usr/bin/env node

const mkdirp = require('mkdirp')
const update = require('../lib/update')

mkdirp.sync('cache')
mkdirp.sync('routes')

update()
  .catch(error => console.log(error.stack))
