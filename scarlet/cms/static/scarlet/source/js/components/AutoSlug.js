import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import muiTheme from '../common/muiTheme'

import '../../stylesheets/components/AutoSlug.scss'

class AutoSlug extends Component {
  constructor(props) {
    super(props)

    this.state = {
      slug: this.props.slugElem.value
    }

    this.setSlugFromSelf = this.setSlugFromSelf.bind(this)

    // enable value matching from sourceElem only if initial values match
    if (this.dasherize(this.props.sourceElem.value) === this.props.slugElem.value) {
      this.props.sourceElem.onkeyup = this.setSlugFromSource.bind(this)
    }
  }

  setSlugFromSource() {
    this.setState({
      slug: this.getSourceValue()
    })
  }

  setSlugFromSelf(e) {
    // disable value matching from sourceElem
    this.props.sourceElem.onkeyup = null
    this.setState({
      slug: this.dasherize(e.target.value)
    })
  }

  getSourceValue() {
    return this.dasherize(this.props.sourceElem.value)
  }

  dasherize(text) {
    return text.replace(/\s+/g, '-').toLowerCase()
  }

  render() {
    const {fieldAttributes, labelAttributes, label} = this.props
    return (
        <div>
          <label {...labelAttributes}>{label}</label>
          <input {...fieldAttributes} value={this.state.slug} onChange={this.setSlugFromSelf} />
        </div>
    )
  }
}

export default AutoSlug
