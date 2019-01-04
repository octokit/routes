module.exports = {
  'POST /markdown/raw': {
    name: 'data',
    type: 'string',
    required: true,
    description: '',
    location: 'body'
  },
  'PUT /repos/:owner/:repo/branches/:branch/protection/required_status_checks/contexts': {
    name: 'contexts',
    type: 'string[]',
    required: true,
    description: '',
    location: 'body'
  },
  'POST /repos/:owner/:repo/branches/:branch/protection/required_status_checks/contexts': {
    name: 'contexts',
    type: 'string[]',
    required: true,
    description: '',
    location: 'body'
  },
  'DELETE /repos/:owner/:repo/branches/:branch/protection/required_status_checks/contexts': {
    name: 'contexts',
    type: 'string[]',
    required: true,
    description: '',
    location: 'body'
  },
  'PUT /repos/:owner/:repo/branches/:branch/protection/restrictions/teams': {
    name: 'teams',
    type: 'string[]',
    required: true,
    description: '',
    location: 'body'
  },
  'POST /repos/:owner/:repo/branches/:branch/protection/restrictions/teams': {
    name: 'teams',
    type: 'string[]',
    required: true,
    description: '',
    location: 'body'
  },
  'DELETE /repos/:owner/:repo/branches/:branch/protection/restrictions/teams': {
    name: 'teams',
    type: 'string[]',
    required: true,
    description: '',
    location: 'body'
  },
  'PUT /repos/:owner/:repo/branches/:branch/protection/restrictions/users': {
    name: 'users',
    type: 'string[]',
    required: true,
    description: '',
    location: 'body'
  },
  'POST /repos/:owner/:repo/branches/:branch/protection/restrictions/users': {
    name: 'users',
    type: 'string[]',
    required: true,
    description: '',
    location: 'body'
  },
  'DELETE /repos/:owner/:repo/branches/:branch/protection/restrictions/users': {
    name: 'users',
    type: 'string[]',
    required: true,
    description: '',
    location: 'body'
  }
}
