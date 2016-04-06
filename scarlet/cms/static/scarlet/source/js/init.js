import React from 'react'
import { render } from 'react-dom'
import injectTapEventPlugin from 'react-tap-event-plugin'
import DateSelector from './components/DateSelector'

import App from './components/App'

injectTapEventPlugin()


// render(
// 	<App />,
// 	document.getElementById('container')
// )

// DATEPICKER INIT
let postDate = document.querySelector('.postDate')
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
