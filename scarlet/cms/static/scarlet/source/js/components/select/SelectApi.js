'use strict'

import { View } from 'backbone'
import $ from 'jquery'
import selectize  from 'selectize'
import '../../../stylesheets/components/select.scss'

const SelectApi = View.extend({

  initialize: function () {
    this.input = this.$el.find('input')
    this.label = $('label[for="' + this.input.attr('id') + '"]')
    this.name = this.input.attr('name')
    this.url = this.$el.data('api')
    this.isLoading = false
  },

  render: function() {
    this.$el.selectize({
      valueField: 'text',
      labelField: 'text',
      searchField: 'text',
      plugins: ['restore_on_backspace', 'remove_button'],
      create: this.create.bind(this),
      render: this.renderOption(this.isLoading),
      load: this.load.bind(this),
      onItemAdd: this.addItem.bind(this),
      onItemRemove: this.removeItem.bind(this)
    })
  },

  renderOption: function (isLoading) {
    return {
      option: (item, escape) => {
        return '<div>' + item['text'] + '</div>'
      },
      option_create: (item, escape) => {
        return '<div class="create"><strong>ADD' + escape('+') + '</strong> ' + escape(item.input) + '</div>'
      }
    }
  },

  create: function (input, callback) {
    // add POST call
    // post input and add on success
    callback( { 'value': input, 'text': input} )
  },

  load: function (query, callback) {
    if (!query.length) return callback()
    this.isLoading = true
    $.ajax({
      url: this.url + '&page=1&search=' + encodeURIComponent(query),
      type: 'GET',
      dataType: 'json',
      error: () => {
        callback()
      },
      success: (response) => {
        this.isLoading = false
        let results = this.transformResults(response)
        callback(response.results)
      }
    })
  },

  addItem: function (value, $item) {
    console.log('added it', value, $item)
  },

  removeItem: function (value) {
    console.log('removed it', value)
  },

  transformResults: function (response) {
    this.fields = []
    this.params = []

    for (let param in response.params) {
      this.param = this.param || param
      this.params.push({
        id : param,
        name : response.params[param].label
      })
    }

    for (let field in response.fields) {
      this.fields.push(field)
    }

    return response.results.map( (item) => {
      item.text = this.createText(item, this.fields)
      return item
    })
  },

  createText: function (item, fields) {
    let text = []

    for (let field of fields) {
      text.push(item[field]);
    }

    return text.join(' - ')
  }

})


export default SelectApi