const proxyquire = require('proxyquire')
const { test } = require('tap')

const parseUrlsOption = proxyquire('../../lib/options/urls', {
  '../landing-page/get': (state) => ([
    {
      url: 'https://developer.github.com/v3/repos',
      scope: 'repos'
    },
    {
      url: 'https://developer.github.com/v3/repos/branches',
      scope: 'repos',
      subScope: 'branches'
    }
  ]),
  '../documentation-page/get': (state, url) => {
    return [
      {
        id: 'section1',
        name: 'Section1',
        url: url + '#section1'
      },
      {
        id: 'section2',
        name: 'Section2',
        url: url + '#section2'
      }
    ]
  }
}).bind(null, {})

test('options.urls === []', async t => {
  const result = await parseUrlsOption([])
  t.deepEquals(result, [
    'https://developer.github.com/v3/repos/#section1',
    'https://developer.github.com/v3/repos/#section2',
    'https://developer.github.com/v3/repos/branches/#section1',
    'https://developer.github.com/v3/repos/branches/#section2'
  ])
  t.end()
})

test('options.urls === undefined', async t => {
  const result = await parseUrlsOption()
  t.deepEquals(result, [
    'https://developer.github.com/v3/repos/#section1',
    'https://developer.github.com/v3/repos/#section2',
    'https://developer.github.com/v3/repos/branches/#section1',
    'https://developer.github.com/v3/repos/branches/#section2'
  ])
  t.end()
})

test('options.urls === ["https://foo.bar"]', async t => {
  t.plan(1)
  try {
    await parseUrlsOption(['https://foo.bar'])
    t.fail('should throw error')
  } catch (error) {
    t.ok(error)
  }
  t.end()
})

test('options.urls === ["https://developer.github.com/v3/repos/"]', async t => {
  const result = await parseUrlsOption(['https://developer.github.com/v3/repos'])
  t.deepEquals(result, [
    'https://developer.github.com/v3/repos/#section1',
    'https://developer.github.com/v3/repos/#section2'
  ])
  t.end()
})

test('options.urls === ["https://developer.github.com/v3/repos"] (no trailing /)', async t => {
  const result = await parseUrlsOption(['https://developer.github.com/v3/repos'])
  t.deepEquals(result, [
    'https://developer.github.com/v3/repos/#section1',
    'https://developer.github.com/v3/repos/#section2'
  ])
  t.end()
})

test('options.urls === ["https://developer.github.com/v3/repos/#get"]', async t => {
  const result = await parseUrlsOption(['https://developer.github.com/v3/repos#get'])
  t.deepEquals(result, [
    'https://developer.github.com/v3/repos/#get'
  ])
  t.end()
})

test('options.urls === ["https://developer.github.com/v3/repos#get"] (no trailing /)', async t => {
  const result = await parseUrlsOption(['https://developer.github.com/v3/repos#get'])
  t.deepEquals(result, [
    'https://developer.github.com/v3/repos/#get'
  ])
  t.end()
})
