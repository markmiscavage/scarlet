import React, { Component, PropTypes } from 'react'
import { DatePicker } from 'material-ui/lib'
import Moment from 'moment'
import MuiThemeProvider from 'material-ui/lib/MuiThemeProvider'
import muiTheme from '../common/muiTheme'

import '../../stylesheets/components/dateselector.scss'

class DateSelector extends Component {
	constructor(props) {
	  super(props)
	  this.props = props
	  let selectedDate = props.data.value ? new Date(props.data.value) : null
	  this.state = {
	    selectedDate: selectedDate,
	  }
	}


	handleChange = (event, date) => {
	  this.setState({
	    selectedDate: date,
	  })
	}

	formatDate (date) {
		return Moment(date).format('MM/DD/YYYY')
	}

	render() {
		const {date, format, locale, timezone, id, name} = this.props.data
		let dateStyle = {visibility: 'visible'}
		return (
			<MuiThemeProvider muiTheme={muiTheme}>
				<DatePicker 
					className="datePicker__date--active"
					style={dateStyle}
					hintText="Select Date" 
					mode="landscape"
					id={id}
					name={name} 
					value={this.state.selectedDate}
					onChange={this.handleChange}
					formatDate={this.formatDate}
				/>
			</MuiThemeProvider>
		)
	}
}

DateSelector.propTypes = { 
  data: PropTypes.object.isRequired
}


export default DateSelector