import React from 'react'
import { render } from 'react-dom'
import injectTapEventPlugin from 'react-tap-event-plugin'

import DateSelector from './components/DateSelector'
import AutoSlug from './components/autoSlug/AutoSlug'
import AutoFill from './components/autoFill/AutoFill'

injectTapEventPlugin()

// DATEPICKER INIT
let postDate = document.querySelector('.date')
if (postDate) {
  let dateInput = postDate.querySelector('input')
  let data = {
    id: dateInput.id,
    format: dateInput.getAttribute('data-date-format'),
    locale: dateInput.getAttribute('data-locale'),
    timezone: dateInput.getAttribute('data-timezone'),
    name: dateInput.name,
    value: dateInput.value
  }
  render(
    <DateSelector data={data} />,
    postDate
  )
}

// AutoFills INIT
let apiSelects = document.querySelectorAll('.api-select')
if (apiSelects.length) {
  for ( let sel of apiSelects ) {
   let data = {
     dataApi: sel.getAttribute('data-api'),
     dataAdd: sel.getAttribute('data-add'),
     name: sel.querySelector('input').name
   }

   render(
     <AutoFill data={data} />,
     sel
   )
  }
}

// AutoSlug
// TODO: modify template html w/ className on container element
// TODO: add data-attr (field identifier) to source field, render new component to store value in app state, consume value in AutoSlug
const autoSlugNodes = document.querySelectorAll('[data-source-fields]')
if (autoSlugNodes) {
    for (var i = 0, l = autoSlugNodes.length; i < l; i++) {
      let dataNode = autoSlugNodes[i]
      let labelNode = dataNode.previousSibling
      let containerNode = dataNode.parentNode

      let props = {
        sourceNode: document.querySelector('[name=' + dataNode.getAttribute('data-source-fields') + ']'),
        slugNode: dataNode,
        label: labelNode.textContent,
        fieldAttributes: {
          id: dataNode.id,
          name: dataNode.name,
          maxLength: dataNode.maxlength,
          type: dataNode.type,
          className: dataNode.class
        },
        labelAttributes: {
          className: labelNode.class
        }
      }

      render(
        <AutoSlug {...props} />,
        containerNode
      )
    }
}
