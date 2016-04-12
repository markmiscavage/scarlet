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
// TODO: store sourceNode input value in app state (new field component)
// TODO: eliminate sourceNode, use state property instead
const autoSlugNodes = document.querySelectorAll('.auto-slug')
if (autoSlugNodes) {
    for (var i = 0, l = autoSlugNodes.length; i < l; i++) {
      let dataNode = autoSlugNodes[i]

      let props = {
        sourceNode: document.querySelector('[name=' + dataNode.dataset.inputDataSourceFields + ']'),
        slugNode: dataNode.querySelector('input'),
        label: dataNode.dataset.labelValue,
        fieldAttributes: {
          id: dataNode.dataset.inputId,
          name: dataNode.dataset.inputName,
          maxLength: dataNode.dataset.inputMaxlength,
          type: dataNode.dataset.inputType,
          className: dataNode.dataset.inputClass
        },
        labelAttributes: {
          className: dataNode.dataset.labelClass
        }
      }

      render(
        <AutoSlug {...props} />,
        dataNode
      )
    }
}
