#!/usr/bin/env node

const update = require('../lib/update')

update()
  .catch(error => console.log(error.stack))
