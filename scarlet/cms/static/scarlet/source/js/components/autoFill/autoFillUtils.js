 'use strict'

const listField = (fields) => {
  let list = []
  for (let field in fields) {
    list.push(field)
  }
  return list
}

// BUILD LIST OF PARAMS FROM API RESPONSE
const listParams = (params) => {
  if(!params) {
    return null
  }

  let list = []
  for (let params in params) {
    list.push(params)
  }
  return list
}

// BUILD TEXT PROP FROM AVAILABLE FIELDS
const buildText = (item, list) => {
  return list.map( field => {
    if(item[field]){
      return item[field]
    }
  }).join(' - ')
}

const formatResults = (response) => {
  var listFields = listField(response.data.fields)
  return response.data.results.map( (item) => {
    item['text'] = buildText(item, listFields)
    item['value'] = item['text']
    return item
  })
}

export { formatResults }