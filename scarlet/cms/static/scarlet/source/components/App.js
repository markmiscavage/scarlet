import React, { PropTypes, Component } from 'react'

class App extends Component {
	constructor(props) {
		console.log(props)
		super(props)
	}

	render() {
		return (
			<div>React has taken over.</div>
		)
	}
}

export default App
