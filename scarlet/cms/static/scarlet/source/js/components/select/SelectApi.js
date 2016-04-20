'use strict'

import { View } from 'backbone'
import $ from 'jquery'
import selectize  from 'selectize'
import '../../../stylesheets/components/select.scss'

const SelectApi = View.extend({

  initialize: function () {
    let input = this.$el.find('input')
    this.label = $('label[for="' + input.attr('id') + '"]')
    this.name = input.attr('name')
    this.url = this.$el.data('api')
    this.isLoading = false
    this.isMultiple = input.is('[data-multiple]')
    this.selectize = null
    this.selected = this.gatherSelected()
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
      onItemRemove: this.removeItem.bind(this),
      onInitialize: this.initSelections.bind(this)
    })
  },

  initSelections: function () {
    this.selectize = this.$el[0].selectize
    for( let item of this.selected ) {
      this.selectize.addOption(item)
      this.selectize.addItem(item.value, false)
      // this.selectize.$input.after($('<input />', {name: this.name, value: item.id, type: 'hidden' }))
    }
  },

  renderOption: function (isLoading) {
    return {
      item: (item, escape) => {
        return '<div class="item" data-id="'+item['id']+'" >' + escape(item['text']) + '</div>'
      },
      option: (item, escape) => {
        return '<div data-id='+item['id']+'>' + escape(item['text']) + '</div>'
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
    this.selectize.$input.after($('<input />', { 'name': this.name, 'value': $item.attr('data-id'), 'data-title': $item.attr('data-value'), 'type': 'hidden' }))
  },

  removeItem: function (value) {
    console.log('removed it', value) 
    this.selectize.$input.siblings('[data-title=' + value + ']').remove()
    // console.log(this.selectize.$input.siblings('[data-title=' + value + ']'))
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
  },
  // <input type="hidden" data-multiple="" data-title="onetwothree" name="tags" value="5">

  gatherSelected: function () {
    var data = []

    // add sibling hidden values as initial value
    this.$el.find('input[name=' + this.name + ']').each( function () {
      data.push({
        id: $(this).val(),
        text: $(this).data('title'),
        value: $(this).data('title')
      })
    })

    return data
  }


})


export default SelectApi