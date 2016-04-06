import React, { Component } from 'react'
import {RaisedButton, Slider, DatePicker} from 'material-ui/lib'
import Moment from 'moment'

class DateSelector extends Component {
	constructor(props) {
		console.log(props)
	  super(props)
	  this.props = props
	  let selectedDate = props.data.value ? Date(props.data.value) : null
	  this.state = {
	    selectedDate: selectedDate,
	  }
	}

	handleChange = (event, date) => {
	  this.setState({
	    selectedDate: date,
	  })
	}

	formatDate = (date) => {
		return Moment(date).format('MM/DD/YYYY')
	}

	render() {
		const {date, format, locale, timezone, id, name} = this.props.data
		console.log(this.state.selectedDate)
		return (
			<DatePicker 
				className="alive"
				hintText="Select Date" 
				mode="landscape"
				id={id}
				name={name} 
				value={this.state.selectedDate}
				onChange={this.handleChange}
				formatDate={this.formatDate}
			/>
		)
	}
}

export default DateSelector

