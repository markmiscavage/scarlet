import { View } from 'backbone';
import Modal from 'helpers/Modal';

const SelectApi = View.extend({
  /**
   * Backbone Init Setter
   */
  initialize() {
    this.$el.removeClass('api-select');
    const input = this.$el.find('input');
    this.label = $(`label[for="${input.attr('id')}"]`);
    this.placeholder = this.label.text() || 'one';
    this.name = input.attr('name');
    this.url = this.$el.data('api');
    this.addUrl = this.$el.data('add');
    this.isLoading = false;
    this.isMultiple = input.is('[data-multiple]');
    this.selectize = null;
    this.selected = this.gatherSelected();
    if (!this.isMultiple) {
      this.singleInput = $(input[0]).clone();
    }

    if (this.addUrl) {
      this.createAddButton();
    }
  },

  /**
   * Render Views
   */
  render() {
    let opts;
    const baseOpts = {
      placeholder: `Select ${this.placeholder}`,
      valueField: 'text',
      labelField: 'text',
      searchField: 'text',
      create: this.create.bind(this),
      onItemAdd: this.addItem.bind(this),
      load: this.load.bind(this),
      render: this.renderOption(this.isLoading),
      onInitialize: this.initSelections.bind(this),
    };
    if (this.isMultiple) {
      opts = Object.assign(baseOpts, {
        plugins: ['restore_on_backspace', 'remove_button'],
        onItemRemove: this.removeItem.bind(this),
      });
    } else {
      opts = Object.assign(baseOpts, {
        preload: 'focus',
        maxItems: 1,
      });
    }
    this.$el.selectize(opts);
  },

  /**
   * Set selections based on server rendered data
   */
  initSelections() {
    this.selectize = this.$el[0].selectize;
    for (const item of this.selected) {
      this.selectize.addOption(item);
      this.selectize.addItem(item.value);
    }
    if (!this.isMultiple) {
      this.selectize.$input.after(this.singleInput);
    }
  },

  /**
   * Prepare Selectize options
   * @return {object}
   */
  renderOption (isLoading) {
    return {
      item: (item, escape) => {
        return `<div class="item" data-id="${item.id}" >${escape(item.text)}</div>`;
      },
      option: (item, escape) => {
        return `<div data-id=${item.id}>${escape(item.text)}</div>`;
      },
      option_create: (item, escape) => {
        return `<div class="create create--hide"><strong>Add${escape('+')}</strong> ${escape(
          this.name,
        )}</div>`;
      },
    };
  },

  /**
   * On create new select option
   * @param  {string}
   * @param  {function}
   */
  create (input, callback) {
    this.openPopup(input)
  },

  /**
   * Load Data
   * @param  {string}  input query
   * @param  {Function}  callback function
   * @return {function}  return callback
   */
  load (query, callback) {
    if (!query.length && this.isMultiple) return callback();
    this.isLoading = true;
    $.ajax({
      url: `${this.url}&page=1&search=${encodeURIComponent(query)}`,
      type: 'GET',
      dataType: 'json',
      error: () => {
        callback();
      },
      success: response => {
        this.isLoading = false;
        const results = this.transformResults(response);
        if (!results.length) {
          $('.create.create--hide').removeClass('create--hide');
        }
        callback(response.results);
      },
    });
  },

  /**
   * On Add New Item to multi select
   * @param {string}
   * @param {object}
   */
  addItem (value, $item) {
    if (this.isMultiple) {
      if(value){
        this.selectize.$input.after(
          $('<input />', {
            name: this.name,
            value: $item.attr('data-id'),
            'data-title': $item.attr('data-value'),
            type: 'hidden',
          }),
        );
      }
    } else if ($item.attr('data-id') !== this.singleInput.val()) {
      this.singleInput.val($item.attr('data-id'));
    }
  },

  /**
   * Window open trigger
   * @param  {object} event object
   */

  openPopup (tag) {
    let modal = new Modal(this.addUrl, 'modal-add-' + this.name, false, (data) => {
      let item = {
        id: data.id,
        text: data.text,
        value: data.text
      }
      this.selectize.addOption(item)
      this.selectize.addItem(item.value, false)
    },(data) => {
      this.selectize.unlock()
    })

    if (typeof tag == 'string') {
      modal.open(tag)
    } else {
      modal.open()
    }
    return false
  },

  /**
   * On Removing selected item in multi select
   * @param  {string}
   */
  removeItem (value) {
    this.selectize.$input.siblings(`[data-title=${value}]`).remove();
  },

  /**
   * Trasnform Response Data
   * @param  {object}
   * @return {object}
   */
  transformResults (response) {
    this.fields = [];
    this.params = [];

    for (const param in response.params) {
      this.param = this.param || param;
      this.params.push({
        id: param,
        name: response.params[param].label,
      });
    }

    for (const field in response.fields) {
      this.fields.push(field);
    }

    return response.results.map(item => {
      item.text = this.createText(item, this.fields);
      return item;
    });
  },

  /**
   * Built text field from all fields
   * @param  {object}
   * @param  {array}
   * @return {string}
   */
  createText(item, fields) {
    const text = [];

    for (const field of fields) {
      text.push(item[field]);
    }

    return text.join(' - ');
  },

  /**
   * Append 'Add' button to create object in popup
   */
  createAddButton() {
    const url = this.$el.data('add');
    const add = $('<a>')
      .attr('href', url)
      .addClass('button button--primary')
      .html(`<i class="fa fa-plus-circle" aria-hidden="true"></i>Add ${this.placeholder}`);

    this.$el.after(add).parent().addClass('formset__field--has-add-button');
    add.on('click', this.openPopup.bind(this));
  },

  /**
   * Gather preselected from server rendered data
   * @return {Array}
   */
  gatherSelected() {
    const data = [];
    this.$el.find(`input[name=${this.name}]`).each((key, item) => {
      const title = this.isMultiple ? $(item).data('title') : this.$el.data('title');
      if(title){
        data.push({
          id: $(item).val(),
          text: title,
          value: title,
        });
      }
    });
    return data;
  },
});

export default SelectApi;
