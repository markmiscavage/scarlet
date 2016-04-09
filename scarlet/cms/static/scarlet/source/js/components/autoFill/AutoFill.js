import React, { Component, PropTypes } from 'react'
import AutoComplete from 'material-ui/lib/auto-complete'
import axios from 'axios'
import { formatResults } from './autoFillUtils'

const testData = [{text:"bbb","id":2},{text:"post","id":1}]
const testData2 = ["bbb","post"]

class AutoFill extends Component {

  constructor(props) {
    super(props)
    this.dataApi = props.data.dataApi
    this.name = props.data.name
    this.fullWidth = props.fullWidth
    this.state = {
      dataSource: []
    }
  }

  handleFocus = () => {
    this.handleUpdateInput('')
  } 

  handleUpdateInput = (value) => { 
    let url = this.dataApi + '&page=1&search=' + value
    axios.get(url)
      .then( (response) => {
        this.setState({
          dataSource: formatResults(response)
        })
      })
      .catch( (response) => {
        console.log(response)
      })
  }

  render() {
    let ref = 'autofill-' + this.name
    return (
      <div>
        <AutoComplete
          dataSource={this.state.dataSource}
          onUpdateInput={this.handleUpdateInput}
          filter={AutoComplete.noFilter}
          onFocus={this.handleFocus}
          floatingLabelText={this.name}
          fullWidth={this.fullwidth}
          ref={ref}
        />
      </div>
    )
  }


}

AutoFill.propTypes = { 
  data: PropTypes.object.isRequired,
  fullWidth: PropTypes.bool 
}

AutoFill.defaultProps = { 
  fullWidth: true
}

export default AutoFill