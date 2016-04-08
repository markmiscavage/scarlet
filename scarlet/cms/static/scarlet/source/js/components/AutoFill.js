import React, { Component, PropTypes } from 'react'
import AutoComplete from 'material-ui/lib/auto-complete'
import axios from 'axios'

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

  // BUILD LIST OF FIELDS FROM API RESPONSE
  listField = (fields) => {
    let list = []
    for (let field in fields) {
      list.push(field)
    }
    return list
  }

  // BUILD LIST OF PARAMS FROM API RESPONSE
  listParams = (params) => {
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
  buildText = (item, list) => {
    return list.map( field => {
      if(item[field]){
        return item[field]
      }
    }).join(' - ')
  }

  formatResults = (response) => {
    var listFields = this.listField(response.data.fields)
    return response.data.results.map( (item) => {
      item['text'] = this.buildText(item, listFields)
      item['value'] = item['text']
      return item
    })
  }

  handleUpdateInput = (value) => { 
    let url = this.dataApi + '&page=1&search=' + value
    axios.get(url)
      .then( (response) => {
        this.setState({
          dataSource: this.formatResults(response)
        })
      })
      .catch( (response) => {
        console.log(response)
      })
  }

  render() {
    return (
      <div>
        <AutoComplete
          dataSource={this.state.dataSource}
          onUpdateInput={this.handleUpdateInput}
          filter={AutoComplete.noFilter}
          onFocus={this.handleFocus}
          floatingLabelText={this.name}
          fullWidth={this.fullwidth}
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