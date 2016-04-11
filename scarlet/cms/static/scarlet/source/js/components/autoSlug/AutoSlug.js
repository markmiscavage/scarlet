import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { dasherize } from './autoSlugUtils'

import '../../../stylesheets/components/AutoSlug.scss'

class AutoSlug extends Component {
  constructor(props) {
    super(props)

    this.state = {
      slug: this.props.slugElem.value
    }

    this.setSlugFromSelf = this.setSlugFromSelf.bind(this)

    // enable value matching from sourceElem only if initial values match
    if (this.shouldEnableMatching()) {
      this.props.sourceElem.onkeyup = this.setSlugFromSource.bind(this)
    }
  }

  shouldEnableMatching() {
    return dasherize(this.props.sourceElem.value) === this.props.slugElem.value
  }

  getSourceValue() {
    return dasherize(this.props.sourceElem.value)
  }

  setSlugFromSource() {
    this.setState({
      slug: this.getSourceValue()
    })
  }

  setSlugFromSelf(e) {
    // disable value matching from sourceElem
    if (!this.shouldEnableMatching()) {
      this.props.sourceElem.onkeyup = null
    }

    this.setState({
      slug: dasherize(e.target.value)
    })
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
