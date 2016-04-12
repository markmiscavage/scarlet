import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { dasherize } from './autoSlugUtils'

class AutoSlug extends Component {
  constructor(props) {
    super(props)

    this.state = {
      slug: this.props.slugNode.value
    }

    this.setSlugFromSelf = this.setSlugFromSelf.bind(this)

    // enable value matching from sourceNode only if initial values match
    if (this.shouldEnableMatching()) {
      this.props.sourceNode.onkeyup = this.setSlugFromSource.bind(this)
    }
  }

  shouldEnableMatching() {
    return dasherize(this.props.sourceNode.value) === this.props.slugNode.value
  }

  getSourceValue() {
    return dasherize(this.props.sourceNode.value)
  }

  setSlugFromSource() {
    this.setState({
      slug: this.getSourceValue()
    })
  }

  setSlugFromSelf(e) {
    // disable value matching from sourceNode
    if (!this.shouldEnableMatching()) {
      this.props.sourceNode.onkeyup = null
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
