import React from 'react'
import { render } from 'react-dom'
import injectTapEventPlugin from 'react-tap-event-plugin'

import DateSelector from './components/DateSelector'
import App from './components/App'
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
			<AutoFill {...data} />,
			sel
		)
	}
}

